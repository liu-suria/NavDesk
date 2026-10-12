export function versionFromCookie(value){try{const decoded=decodeURIComponent(value||'');return /^\d{4}-\d{2}-\d{2}T/.test(decoded)?decoded:''}catch{return ''}}
const DATA_KEY='navigation/data.json';
export const revisionCookie=value=>`navdesk_revision=${encodeURIComponent(value||'')}; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Strict`;
export async function readNavigation(store,{list=false,minVersion='',fresh=false}={}){
 let data=await store.get(DATA_KEY,{type:'json',consistency:list&&!fresh?'eventual':'strong'});
 // A writer's next load must not regress to an older edge snapshot.
 if(list&&!fresh&&minVersion&&(!data?.updatedAt||data.updatedAt<minVersion))data=await store.get(DATA_KEY,{type:'json',consistency:'strong'});
 return data&&typeof data==='object'?{...data,settings:{brandName:data.settings?.brandName||'NavDesk'}}:{version:1,updatedAt:null,settings:{brandName:'NavDesk'},groups:[]};
}
