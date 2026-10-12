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
