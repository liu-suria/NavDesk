import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOperation } from '../edge-functions/_manage.js';
import { createSession, requireAuth } from '../edge-functions/_lib.js';
const snapshot = () => ({version:1,updatedAt:'v1',settings:{brandName:'Private'},groups:[{id:'g',name:'Media',links:[{id:'l',name:'Emby',url:'https://example.com/',description:'keep',icon:'',openInNew:true}]}],trash:[]});
test('management preserves unrelated links and refuses stale writes',()=>{
  const current=snapshot();
  const next=applyOperation(current,{updatedAt:'v1',action:'group.update',groupId:'g',value:{name:'Storage',links:[]}});
  assert.equal(next.groups[0].links[0].description,'keep');assert.equal(next.settings.brandName,'Private');assert.equal(current.groups[0].name,'Media');
  assert.throws(()=>applyOperation(current,{action:'group.delete',groupId:'g',updatedAt:'old'}),e=>e.status===409);
  assert.throws(()=>applyOperation(current,{action:'group.delete',groupId:'g'}),e=>e.status===409);
});
test('deletion retains restorable data and create refuses duplicates',()=>{
  const next=applyOperation(snapshot(),{updatedAt:'v1',action:'link.delete',groupId:'g',linkId:'l'});
  assert.equal(next.groups[0].links.length,0);assert.equal(next.trash[0].group.links[0].name,'Emby');
  assert.throws(()=>applyOperation(snapshot(),{updatedAt:'v1',action:'link.create',groupId:'g',value:{name:'copy',url:'https://example.com'}}));
  assert.throws(()=>applyOperation(snapshot(),{updatedAt:'v1',action:'link.create',groupId:'g',value:{name:'bad',url:'javascript:alert(1)'}}));
});
test('API bearer validates signature; cross-origin writes and missing auth fail closed',async()=>{
  const env={ADMIN_PASSWORD:'test',SESSION_SECRET:'unit-test-secret'};
  const token=await createSession(env.SESSION_SECRET);
  const context=(headers={},method='GET')=>({env,request:new Request('https://nav.example/api/manage',{method,headers})});
  assert.equal((await requireAuth(context({Authorization:'Bearer '+token}))).response,undefined);
  assert.equal((await requireAuth(context({Authorization:'Bearer '+token+'bad'}))).response.status,401);
  assert.equal((await requireAuth(context())).response.status,401);
  assert.equal((await requireAuth(context({Authorization:'Bearer '+token,Origin:'https://evil.example'},'POST'))).response.status,403);
});
