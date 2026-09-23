import test from 'node:test';
import assert from 'node:assert/strict';
import * as m from '../model.mjs';
import {sanitise} from '../edge-functions/_navigation-model.js';
const fixture=()=>sanitise({groups:[{id:'a',name:'常用',links:[{id:'x',name:'Example',url:'https://example.com/',description:'test',icon:'https://example.com/icon.png'}]},{id:'b',name:'开发',links:[]}]});
test('dedup ignores tracking but retains semantic query and fragment',()=>{
 assert.equal(m.canonical('https://EXAMPLE.com:443/?utm_source=a&gclid=b'),'https://example.com/');
 assert.notEqual(m.canonical('https://example.com/?id=2'),m.canonical('https://example.com/?id=1'));
 assert.notEqual(m.canonical('https://example.com/#a'),m.canonical('https://example.com/#b'));
 for(const url of ['javascript:alert(1)','https://user:secret@example.com'])assert.throws(()=>m.canonical(url));
});
test('batch preview catches existing, within-batch and invalid entries',()=>{
 const rows=m.planImport(fixture(),m.parseLines('Existing｜https://example.com/?utm_source=a\nNew｜https://new.example.com/\nhttps://new.example.com/\njavascript:alert(1)'), 'a');
 assert.deepEqual(rows.map(r=>r.status),['duplicate','ready','duplicate','invalid']);
 const data=fixture();assert.equal(m.applyImport(data,rows,'a'),1);assert.equal(data.groups[0].links.length,2);
});
test('bookmark import merges named folders and rechecks newest data',()=>{
 const data=fixture();const rows=[{url:'https://new.example.com',groupName:'开发'},{url:'https://other.example.com',groupName:'阅读'}];
 assert.equal(m.applyImport(data,rows,'a',true),2);assert.equal(data.groups[1].links.length,1);assert.equal(data.groups[2].name,'阅读');
 assert.equal(m.applyImport(data,rows,'a',true),0);
});
test('recycle and restore link persists metadata and does not duplicate',()=>{
 const data=fixture();m.recycleLink(data,'a','x');assert.equal(data.groups[0].links.length,0);assert.equal(data.trash.length,1);
 const roundtrip=sanitise(data);m.restore(roundtrip,roundtrip.trash[0].id);assert.equal(roundtrip.groups[0].links[0].description,'test');assert.equal(roundtrip.trash.length,0);
});
test('whole group restore recreates category; duplicate restore retains trash',()=>{
 const data=fixture();m.recycleGroup(data,'a');assert.equal(data.groups.length,1);m.restore(data,data.trash[0].id);assert.equal(data.groups[1].links[0].id,'x');
 m.recycleLink(data,'a','x');data.groups[0].links.push({id:'other',name:'Duplicate',url:'https://example.com/'});assert.throws(()=>m.restore(data,data.trash[0].id),/相同网址/);assert.equal(data.trash.length,1);
});
test('moving preserves metadata and regenerates colliding IDs',()=>{
 const data=fixture();data.groups[1].links.push({id:'x',name:'Other',url:'https://other.example.com'});m.moveLink(data,'a','x','b');
 assert.equal(data.groups[0].links.length,0);assert.equal(data.groups[1].links[1].description,'test');assert.notEqual(data.groups[1].links[1].id,'x');
});
test('sanitizer rejects malformed trash and capacity overflows',()=>{
 assert.throws(()=>sanitise({...fixture(),trash:[{id:'bad',group:{}}]}));
 const data=fixture();data.groups[0].links=Array.from({length:151},(_,i)=>({id:String(i),name:'n',url:'https://example.com'}));assert.throws(()=>sanitise(data),/150/);
 assert.throws(()=>sanitise({...fixture(),trash:Array(501).fill({})}),/500/);
});
test('health check classifies HTTP and CORS without deleting anything',async()=>{
 for(const [status,state] of [[200,'ok'],[404,'suspect'],[410,'suspect'],[401,'unknown'],[500,'unknown'],[0,'unknown']]){
  const result=await m.checkLink('https://example.com',async(url,opts)=>{assert.equal(opts.method,'HEAD');assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'manual');return {status,ok:status===200}});assert.equal(result.state,state);
 }
 assert.equal((await m.checkLink('https://example.com',async()=>{throw Error('CORS')})).state,'unknown');
 for(const url of ['http://127.0.0.1','http://router.local','http://[::1]'])assert.equal((await m.checkLink(url,()=>assert.fail('must not fetch'))).state,'unknown');
});
test('pin backups validate, deduplicate and preserve ordering without navigation writes',()=>{
 assert.deepEqual(m.validatePinBackup({type:'navdesk-pins',version:1,urls:['https://b.example/','https://a.example/','https://b.example/']}),['https://b.example/','https://a.example/']);
 for(const value of [{urls:[]},{type:'navdesk-pins',version:1,urls:['javascript:alert(1)']},{type:'navdesk-pins',version:1,urls:['https://user:pass@example.com']}])assert.throws(()=>m.validatePinBackup(value));
});
test('field merge retains remote edits and rejects overlapping conflicts',()=>{
 const base={name:'A',url:'https://a.example/',description:'old',icon:'',openInNew:true};
 const merged=m.mergeEditedLink(base,{...base,description:'remote'},{...base,name:'local'});assert.equal(merged.name,'local');assert.equal(merged.description,'remote');
 assert.throws(()=>m.mergeEditedLink(base,{...base,name:'remote'},{...base,name:'local'}),/名称/);assert.throws(()=>m.mergeEditedLink(base,null,base),/删除/);
});
test('category renaming protects links, duplicates and stale names',()=>{
 const data=fixture(),link=data.groups[0].links[0];m.renameGroup(data,'a','新的常用','常用');assert.equal(data.groups[0].links[0],link);assert.throws(()=>m.renameGroup(data,'a','开发','新的常用'),/同名/);assert.throws(()=>m.renameGroup(data,'a','再改','常用'),/变化/);
});
test('full backup validates structure and preserves trash',()=>{
 const data=fixture();m.recycleLink(data,'a','x');const result=m.validateNavigationBackup(data);assert.equal(result.trash.length,1);assert.throws(()=>m.validateNavigationBackup({version:1,groups:[{id:'x',name:'a',links:[{id:'bad',name:'bad',url:'javascript:alert(1)'}]}]}));
});
