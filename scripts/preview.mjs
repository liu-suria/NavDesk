// LOCAL TEST SERVER ONLY. Mock data/auth; never connects to EdgeOne or Blob.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
let navigation = {version:1,settings:{brandName:'NavDesk 本地演示'},groups:[
  {id:'common',name:'常用',icon:'◈',color:'#aa6d82',links:[{id:'one',name:'示例网站',url:'https://example.com/',description:'仅用于本地测试',openInNew:true,icon:''}]},
  {id:'dev',name:'开发',icon:'{}',color:'#6d7cff',links:[{id:'two',name:'文档',url:'https://example.org/',description:'演示链接',openInNew:false,icon:''}]}
]};
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
