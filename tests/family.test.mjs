import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession} from '../edge-functions/_lib.js';
import {sealSession,openSession,proxyFamily,loginFamily} from '../edge-functions/_family.js';
import {eventBuckets} from '../family.mjs';
const env={ADMIN_PASSWORD:'demo',SESSION_SECRET:'test-nav-secret'};
async function context(path='/ledger',method='GET',extra={},body){const token=await createSession(env.SESSION_SECRET);return {env,request:new Request('https://nav.example/api/family'+path,{method,headers:{Cookie:'__Host-navdesk_session='+token,...extra},...(body?{body:JSON.stringify(body)}:{})})}}
test('family sessions are encrypted, scoped to secret, expire, and reject tampering',async()=>{
 const token='1791500000.abcdefghijklmnop.abcdefghijklmnop';const sealed=await sealSession(token,'secret',100);
 assert.ok(!sealed.includes(token));assert.equal(await openSession(sealed,'secret',101),token);
 assert.equal(await openSession(sealed,'wrong',101),null);assert.equal(await openSession(sealed+'x','secret',101),null);
 assert.equal(await openSession(sealed,'secret',100+30*86400000+1),null);
});
test('proxy fails closed before upstream calls for missing nav/family auth and cross-origin writes',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error()};
 assert.equal((await proxyFamily({env,request:new Request('https://nav.example/api/family/ledger')},'ledger',fetcher)).status,401);
 assert.equal((await proxyFamily(await context(),'ledger',fetcher)).status,401);
 assert.equal((await proxyFamily(await context('/events','POST',{Origin:'https://evil.example'},{title:'x'}),'events',fetcher)).status,403);
 assert.equal((await proxyFamily(await context('/ledger','PUT',{},{}),'ledger',fetcher)).status,405);assert.equal(calls,0);
});
test('proxy only reaches fixed upstream, forwards auth server-side, and preserves revision conflict',async()=>{
 const c=await context('/events?target=http://127.0.0.1','PATCH',{}, {id:'event',revision:5,action:'done'});c.env={...env,HOMELEDGER_API_KEY:'test-api-key'};
 const response=await proxyFamily(c,'events',async(url,options)=>{
  assert.equal(url,'https://home-ledger.667989.xyz/api/events');assert.equal(options.redirect,'error');assert.equal(options.headers['X-API-Key'],'test-api-key');
  assert.deepEqual(JSON.parse(options.body),{id:'event',revision:5,action:'done'});return new Response(JSON.stringify({error:'conflict'}),{status:409,headers:{'Content-Type':'application/json'}});
 });assert.equal(response.status,409);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.ok(!(await response.text()).includes('test-api-key'));
});
test('login wraps upstream HttpOnly cookie and never returns password or plain upstream token',async()=>{
 const plain='1791500000.abcdefghijklmnop.abcdefghijklmnop';
 const response=await loginFamily(await context('/login','POST',{}, {password:'existing-password'}),async(url,options)=>{
  assert.equal(url,'https://home-ledger.667989.xyz/api/auth/login');assert.equal(JSON.parse(options.body).password,'existing-password');return new Response('{}',{headers:{'Set-Cookie':'__Host-homeledger_session='+plain+'; Path=/; HttpOnly; Secure'}});
 });assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);assert.ok(!cookie.includes(plain));assert.equal(await openSession(cookie.split('=')[1].split(';')[0],env.SESSION_SECRET),plain);
 assert.deepEqual(await response.json(),{ok:true});
});
test('family buckets separate overdue/today/future while excluding completed and archived',()=>{
 const events=[{id:'old',date:'2026-10-08'},{id:'today',date:'2026-10-09'},{id:'future',date:'2026-10-20'},{id:'done',date:'2026-10-08',status:'done'},{id:'archive',date:'2026-10-09',archived:true}];
 assert.deepEqual(eventBuckets(events,'2026-10-09').map(b=>b.items.map(e=>e.id)),[['old'],['today'],['future']]);
});
