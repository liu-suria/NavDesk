import test from 'node:test';
import assert from 'node:assert/strict';
import {bootstrap} from '../edge-functions/_bootstrap.js';
import {createSession} from '../edge-functions/_lib.js';
import {start} from '../startup.mjs';
const env={ADMIN_PASSWORD:'demo',SESSION_SECRET:'bootstrap-test-secret'};
const encoder=new TextEncoder();
async function context(family=true,authenticated=true){return {env,request:new Request('https://nav.example/api/bootstrap'+(family?'?family=1':''),{headers:authenticated?{Cookie:'__Host-navdesk_session='+await createSession(env.SESSION_SECRET)}:{}})}}
test('bootstrap rejects unauthorized requests before reading either private data source',async()=>{
 let reads=0;const response=await bootstrap(await context(true,false),{navigation:()=>reads++,family:()=>reads++});assert.equal(response.status,401);assert.equal(reads,0);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual(await response.json(),{error:'Unauthorized'});
});
test('authentication and navigation stream before a slow or failed Hub',async()=>{
 let release;const slow=new Promise(resolve=>release=resolve);
 const response=await bootstrap(await context(),{navigation:async()=>({groups:[]}),family:()=>slow});assert.equal(response.headers.get('Cache-Control'),'no-store');
 const reader=response.body.getReader(),decoder=new TextDecoder();const first=JSON.parse(decoder.decode((await reader.read()).value));assert.deepEqual(first,{type:'session',authenticated:true});
 const next=JSON.parse(decoder.decode((await reader.read()).value));assert.equal(next.type,'navigation');assert.deepEqual(next.data,{groups:[]});
 release(new Response(JSON.stringify({error:'连接已过期'}),{status:401}));const last=JSON.parse(decoder.decode((await reader.read()).value));assert.equal(last.type,'family');assert.equal(last.error.status,401);assert.equal((await reader.read()).done,true);
});
test('mobile bootstrap never reads Family Hub',async()=>{
 let calls=0;const response=await bootstrap(await context(false),{navigation:async()=>({groups:[]}),family:()=>calls++});assert.equal((await response.text()).split('\n').filter(Boolean).length,2);assert.equal(calls,0);
});
test('client decodes split UTF-8 and settles navigation without waiting for Hub',async()=>{
 let controller;const response=new Response(new ReadableStream({start(c){controller=c}}),{headers:{'Content-Type':'application/x-ndjson'}});
 const state=start(Promise.resolve(response),{family:true});const bytes=encoder.encode(JSON.stringify({type:'session',authenticated:true})+'\n'+JSON.stringify({type:'navigation',data:{groups:[{name:'自有项目'}]}})+'\n');
 for(let i=0;i<bytes.length;i++)controller.enqueue(bytes.slice(i,i+1));assert.equal((await state.navigation).data.groups[0].name,'自有项目');
 controller.enqueue(encoder.encode(JSON.stringify({type:'family',error:{status:401,message:'请连接家庭事务'}})+'\n'));controller.close();assert.equal((await state.family).error.status,401);await state.finished;
});
test('malformed, unauthorized and incomplete streams cannot publish navigation',async()=>{
 for(const [body,status,type] of [['{"type":"navigation","data":{"groups":[]}}\n',200,'application/x-ndjson'],['{}',401,'application/json'],['{"type":"session","authenticated":true}\n',200,'application/x-ndjson']]){
  const state=start(Promise.resolve(new Response(body,{status,headers:{'Content-Type':type}})),{family:true});assert.ok((await state.navigation).error);assert.ok((await state.family).error);await state.finished;
 }
});
