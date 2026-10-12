import {fastStart} from './warmstart.mjs';
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
