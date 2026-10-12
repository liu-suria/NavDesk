import {requireAuth} from './_lib.js';
export async function bootstrap(context,{navigation,family}){
 const auth=await requireAuth(context);if(auth.response)return auth.response;
 const wantsFamily=new URL(context.request.url).searchParams.get('family')==='1';
 const encoder=new TextEncoder();let closed=false;
 const body=new ReadableStream({start(controller){
  const send=value=>{if(!closed)controller.enqueue(encoder.encode(JSON.stringify(value)+'\n'))};
  send({type:'session',authenticated:true});
  const read=async(type,fn)=>{try{send({type,...await fn()})}catch{send({type,error:{status:503,message:type==='navigation'?'无法读取导航数据':'家庭事务暂不可用'}})}};
  const tasks=[read('navigation',async()=>({data:await navigation()}))];
  if(wantsFamily)tasks.push(read('family',async()=>{const response=await family();const data=await response.json();return response.ok?{data}:{error:{status:response.status,message:data.error||'家庭事务暂不可用'}}}));
  Promise.all(tasks).finally(()=>{if(!closed){closed=true;controller.close()}});
 },cancel(){closed=true}});
 return new Response(body,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
