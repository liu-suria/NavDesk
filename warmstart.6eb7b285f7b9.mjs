// NavDesk JavaScript module v2
// Private navigation only. Never cache ledger data, secrets or login credentials.
const flag='navdesk-cache-ready',dbName='navdesk-private-navigation-v1',maxAge=7*864e5;
function database(){return new Promise((resolve,reject)=>{const request=indexedDB.open(dbName,1);request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function transaction(mode,operation){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots',mode),request=operation(tx.objectStore('snapshots'));let value;request.onsuccess=()=>{value=request.result};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
export async function clear(){try{localStorage.removeItem(flag);await transaction('readwrite',store=>store.delete('navigation'))}catch{}}
export async function save(data){if(!data?.groups)return;try{const {trash,...visible}=data;const existing=await transaction('readonly',store=>store.get('navigation'));if(existing?.data?.updatedAt&&existing.data.updatedAt>visible.updatedAt)return;await transaction('readwrite',store=>store.put({at:Date.now(),data:visible},'navigation'));localStorage.setItem(flag,'1')}catch{}}
export function usable(snapshot,session,now=Date.now()){return session?.authenticated===true&&snapshot?.at>now-maxAge&&Array.isArray(snapshot.data?.groups)}
export async function fastStart(network,sessionPromise){
 let settled=false,used=false;
 network.then(result=>{settled=true;if(result.error?.status===401)clear();if(used)document.dispatchEvent(new CustomEvent('navdesk:fresh',{detail:result}))});
 try{const [snapshot,session]=await Promise.all([transaction('readonly',store=>store.get('navigation')),sessionPromise]);
  if(session?.authenticated!==true){await clear();return network}
  if(!settled&&usable(snapshot,session)){used=true;return {data:snapshot.data,cached:true}}
 }catch{}
 return network;
}

// The same authenticated stream feeds the private snapshot gate and both panels.
export function start(response,{cached=false,family=false}={}){
 const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve}};
 const slots={session:deferred(),navigation:deferred(),family:deferred()};
 const errorResult=(message,status)=>({error:Object.assign(new Error(message),{status})});
 const consume=async()=>{
  let reader,authenticated=false;
  const accept=line=>{if(!line.trim())return;const value=JSON.parse(line);
   if(value.type==='session'){if(value.authenticated!==true)throw Error('启动鉴权失败');if(!authenticated)performance.mark('navdesk-auth-ready');authenticated=true;slots.session.resolve({authenticated:true});return}
   if(!authenticated)throw Error('启动鉴权失败');
   if(!['navigation','family'].includes(value.type))return;
   const result=value.error?errorResult(value.error.message,value.error.status):{data:value.data};slots[value.type].resolve(result);
  };
  try{const result=await response;if(!result.ok)throw Object.assign(new Error(result.status===401?'登录已失效，请重新输入密码。':'启动服务暂不可用'),{status:result.status});
   if(!(result.headers.get('content-type')||'').includes('application/x-ndjson'))throw Error('启动响应无效');
   if(result.headers.get('x-navdesk-authenticated')==='1'){authenticated=true;slots.session.resolve({authenticated:true});performance.mark('navdesk-auth-ready')}
   reader=result.body.getReader();const decoder=new TextDecoder();let pending='';
   while(true){const {done,value}=await reader.read();if(done){pending+=decoder.decode();if(pending)accept(pending);break}
    pending+=decoder.decode(value,{stream:true});let index;while((index=pending.indexOf('\n'))>=0){accept(pending.slice(0,index));pending=pending.slice(index+1)}
   }
  }catch(error){if(reader)await reader.cancel().catch(()=>{});const result=errorResult(error.name==='AbortError'?'请求超时，请稍后重试。':error.message,error.status);slots.navigation.resolve(result);slots.family.resolve(result)}
  finally{reader?.releaseLock();slots.session.resolve({authenticated:false});const incomplete=errorResult('启动数据不完整，请重试',503);slots.navigation.resolve(incomplete);slots.family.resolve(incomplete)}
 };
 const finished=consume();
 const network=slots.navigation.promise;
 return {finished,authenticated:slots.session.promise,navigation:cached?Promise.race([network,fastStart(network,slots.session.promise)]):network,family:family?slots.family.promise:null};
}
