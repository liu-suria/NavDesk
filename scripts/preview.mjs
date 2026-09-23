// LOCAL TEST SERVER ONLY. Mock data/auth; never connects to EdgeOne or Blob.
import http from 'node:http';
import {demoNavigation} from './demo-data.mjs';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
let navigation = structuredClone(demoNavigation);
let mode = 'normal', delay = 0;
const requests = [];
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost');
  const respond=(code,value,headers={})=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store',...headers});res.end(JSON.stringify(value))};
  try {
    if(url.pathname==='/__test/state'){
      if(req.method==='POST'){const chunks=[];for await(const part of req)chunks.push(part);const state=JSON.parse(Buffer.concat(chunks));mode=state.mode??'normal';delay=state.delay??0;requests.length=0;}
      return respond(200,{mode,delay,requests});
    }
    if(url.pathname.startsWith('/api/')){
      requests.push({method:req.method,path:url.pathname});
      const chunks=[];for await(const part of req)chunks.push(part);const raw=Buffer.concat(chunks).toString();
      if(url.pathname==='/api/auth/login')return JSON.parse(raw).password==='demo'?respond(200,{ok:true},{'Set-Cookie':'navdesk_demo=1; Path=/; HttpOnly; SameSite=Strict'}):respond(401,{error:'密码不正确'});
      if(url.pathname==='/api/auth/logout')return respond(200,{ok:true},{'Set-Cookie':'navdesk_demo=; Path=/; Max-Age=0'});
      if(url.pathname==='/api/icons'){
        if(!req.headers.cookie?.includes('navdesk_demo=1'))return respond(401,{});
        await new Promise(resolve=>setTimeout(resolve,400));
        const host=new URL(url.searchParams.get('url')).hostname;
        const initial=host.replace(/^(www|chat|dash|mail|docs|open)\./,'')[0].toUpperCase().replace(/[^A-Z0-9]/g,'N');
        const palette=['#5678c5','#8a6bc1','#4e8c9a','#b57b88','#78966c','#b09162'];
        const color=palette[[...host].reduce((n,c)=>n+c.charCodeAt(0),0)%palette.length];
        res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'no-store'});
        return res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${color}"/><text x="16" y="22" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="20" font-weight="600">${initial}</text></svg>`);
      }
      if(url.pathname!=='/api/navigation')return respond(404,{error:'Unexpected endpoint'});
      if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
      if(mode==='error')return respond(503,{error:'模拟服务故障'});
      if(mode==='unauthorized'||!req.headers.cookie?.includes('navdesk_demo=1'))return respond(401,{error:'Unauthorized'});
      if(req.method==='PUT')navigation=JSON.parse(raw);
      return respond(200,navigation);
    }
    const path=url.pathname==='/'?'index.html':url.pathname==='/admin/'?'admin/index.html':url.pathname.slice(1);
    if(!['index.html','admin/index.html','favicon.svg','site.webmanifest'].includes(path))return respond(404,{});
    const body=await readFile(`${root}/${path}`);
    res.writeHead(200,{'Content-Type':path.endsWith('.html')?'text/html; charset=utf-8':path.endsWith('.svg')?'image/svg+xml':'application/manifest+json'});res.end(body);
  }catch{respond(500,{error:'Local preview error'})}
});
server.listen(8766,'127.0.0.1',()=>console.log('Local mock preview: http://127.0.0.1:8766/ — demo password: demo; no production data'));
