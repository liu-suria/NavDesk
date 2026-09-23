import test from 'node:test';
import assert from 'node:assert/strict';
import {iconHost,loadIcon} from '../edge-functions/_icons.js';
function store(){const data=new Map();return {data,get:async key=>data.get(key),setJSON:async(key,value)=>data.set(key,value)}}
test('cache miss fetches once; subsequent reads use persistent cache',async()=>{const s=store();let calls=0;const f=async()=>{calls++;return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png'}})};const first=await loadIcon(s,'example.com',f,100);assert.equal(first.body,'AQID');assert.deepEqual(await loadIcon(s,'example.com',f,200),first);assert.equal(calls,1)});
test('failed icons have a negative cache and never block navigation',async()=>{const s=store();let calls=0;const f=async()=>{calls++;throw Error('timeout')};assert.equal((await loadIcon(s,'example.com',f,100)).body,null);await loadIcon(s,'example.com',f,200);assert.equal(calls,1)});
test('rejects HTML and oversize responses',async()=>{for(const [type,body] of [['text/html','oops'],['image/png',new Uint8Array(65537)]]){const icon=await loadIcon(store(),'example.com',async()=>new Response(body,{headers:{'Content-Type':type}}));assert.equal(icon.body,null)}});
test('expired icon survives upstream outage',async()=>{const s=store();s.data.set('icons/v1/example.com.json',{body:'AQID',type:'image/png',expires:1});assert.equal((await loadIcon(s,'example.com',async()=>{throw Error()},100)).body,'AQID')});
test('host normalization and rejection',()=>{assert.equal(iconHost('https://example.com/private?q=secret'),'example.com');for(const value of ['http://127.0.0.1','http://[::1]','http://router.local','http://localhost','not-url'])assert.throws(()=>iconHost(value))});
