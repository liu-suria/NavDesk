import {json,requireAuth,readJson,parseCookies,getSecrets,SESSION_MAX_AGE} from './_lib.js';
const ORIGIN='https://home-ledger.667989.xyz';
const COOKIE='__Host-navdesk_family';
const upstreamCookie='__Host-homeledger_session';
const encode=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function key(secret){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode('navdesk-family:'+secret)),{name:'AES-GCM'},false,['encrypt','decrypt'])}
export async function sealSession(token,secret,now=Date.now()){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const body=new TextEncoder().encode(JSON.stringify({token,expires:now+SESSION_MAX_AGE*1000}));
 return encode(iv)+'.'+encode(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(secret),body));
}
export async function openSession(value,secret,now=Date.now()){
 try{if(!value||value.length>1500)return null;const [iv,body,...rest]=value.split('.');if(rest.length)return null;
 const data=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv)},await key(secret),decode(body))));
 return data.expires>now&&/^\d{10}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data.token)?data.token:null;
 }catch{return null}
}
function familyCookie(value,maxAge=SESSION_MAX_AGE){return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`}
const options={redirect:'error',eo:{timeoutSetting:{connectTimeout:5000,readTimeout:10000,writeTimeout:5000}}};
export async function loginFamily(context,fetcher=fetch){
 const auth=await requireAuth(context);if(auth.response)return auth.response;
 try{const input=await readJson(context.request);if(typeof input.password!=='string'||!input.password||input.password.length>1024)return json({error:'请输入家庭事务密码'},400);
 const response=await fetcher(ORIGIN+'/api/auth/login',{...options,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:input.password})});
 if(response.status!==200)return json({error:response.status===401?'家庭事务密码不正确':'家庭事务登录暂不可用'},response.status===401?401:502);
 const cookie=response.headers.get('set-cookie')||'';const token=cookie.match(/__Host-homeledger_session=([^;\s,]+)/)?.[1];
 if(!token)return json({error:'家庭事务未返回有效会话'},502);
 return json({ok:true},200,{'Set-Cookie':familyCookie(await sealSession(token,getSecrets(context).sessionSecret))});
 }catch{return json({error:'家庭事务连接失败，请重试'},502)}
}
export async function logoutFamily(context){const auth=await requireAuth(context);return auth.response||json({ok:true},200,{'Set-Cookie':familyCookie('',0)})}
export async function proxyFamily(context,resource,fetcher=fetch){
 const auth=await requireAuth(context);if(auth.response)return auth.response;
 const methods={ledger:['GET'],events:['GET','POST','PATCH']};
 if(!methods[resource]?.includes(context.request.method))return json({error:'Method not allowed'},405);
 const apiKey=context.env?.HOMELEDGER_API_KEY||globalThis.HOMELEDGER_API_KEY;
 const token=apiKey?null:await openSession(parseCookies(context.request)[COOKIE],getSecrets(context).sessionSecret);
 if(!apiKey&&!token)return json({error:'请连接家庭事务',code:'FAMILY_LOGIN_REQUIRED'},401);
 try{
 const headers={'Accept':'application/json'};
 if(apiKey)headers['X-API-Key']=String(apiKey);else headers.Cookie=`${upstreamCookie}=${token}`;
 const requestURL=new URL(context.request.url),target=new URL('/api/'+resource,ORIGIN);
 // Forward query values only to this fixed, authenticated application.
 for(const name of ['id','days','type','status','keyword'])if(requestURL.searchParams.has(name))target.searchParams.set(name,requestURL.searchParams.get(name));
 const init={...options,method:context.request.method,headers};
 if(!['GET','HEAD'].includes(init.method)){init.body=JSON.stringify(await readJson(context.request));headers['Content-Type']='application/json'}
 const response=await fetcher(target.href,init);
 if(response.status===401)return json({error:'家庭事务连接已过期，请重新连接',code:'FAMILY_LOGIN_REQUIRED'},401);
 if(!(response.headers.get('content-type')||'').includes('application/json'))return json({error:'家庭事务暂不可用'},502);
 return new Response(await response.arrayBuffer(),{status:response.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return json({error:'家庭事务连接超时或不可用，请重试'},502)}
}
