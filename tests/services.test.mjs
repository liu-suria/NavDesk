import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const {createNavigationPort,createPinPort}=runInNewContext(readFileSync(new URL('../services.js',import.meta.url),'utf8')+';({createNavigationPort,createPinPort})');
test('navigation port publishes only successful saves and preserves request failure',async()=>{
 let shown=0,fail=false;const old={groups:[]},saved={groups:[{id:'one'}]};
 const port=createNavigationPort({get:()=>old,show:value=>{assert.equal(value,saved);shown++},request:async(url,options)=>{assert.equal(url,'/api/navigation');if(fail)throw Error('conflict');assert.equal(options.method,'PUT');assert.deepEqual(JSON.parse(options.body),old);return saved}});
 assert.equal(port.get(),old);assert.equal(await port.save(old),saved);assert.equal(shown,1);fail=true;await assert.rejects(port.save(old),/conflict/);assert.equal(shown,1);
});
test('pins share one storage contract without network and publish after successful writes',()=>{
 let value='["https://a/","https://a/"]',changed=0;
 const port=createPinPort({storage:{getItem:()=>value,setItem:(key,next)=>{value=next}},onChange:()=>changed++});
 assert.equal(port.read().length,1);port.toggle({url:'https://b/'});assert.equal(port.read().length,2);assert.equal(changed,1);
 const other=createPinPort({storage:{getItem:()=>value}});assert.equal(other.has({url:'https://b/'}),true);
 port.save(['https://b/','https://b/']);assert.equal(port.read().length,1);assert.equal(port.links({groups:[{id:'g',links:[{url:'https://b/'}]}]})[0].group.id,'g');
});
test('unavailable pin storage allows reading but never reports a successful write',()=>{
 let changed=false;const port=createPinPort({storage:{getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('denied')}},onChange:()=>{changed=true}});
 assert.equal(port.read().length,0);assert.throws(()=>port.save(['https://a/']),/denied/);assert.equal(changed,false);
});
