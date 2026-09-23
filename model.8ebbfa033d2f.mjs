// NavDesk JavaScript module v2
import {sanitise} from './navschema.b901af2bea08.mjs';
// Shared data operations. No network, DOM, or production writes.
export function canonical(value){
 const u=new URL(value);if(!/^https?:$/.test(u.protocol)||u.username||u.password)throw Error('只支持不含账号密码的 HTTP/HTTPS 网址');
 for(const key of [...u.searchParams.keys()])if(/^utm_/i.test(key)||/^(fbclid|gclid)$/i.test(key))u.searchParams.delete(key);
 return u.href;
}
export function findLink(data,groupId,linkId){const group=data.groups.find(g=>g.id===groupId),link=group?.links.find(l=>l.id===linkId);if(!link)throw Error('网址不存在，请刷新');return {group,link}}
export function recycleLink(data,groupId,linkId){
 const {group,link}=findLink(data,groupId,linkId);data.trash??=[];
 if(data.trash.length>=500)throw Error('回收站已达500项，请先导出备份并整理');
 data.trash.push({id:crypto.randomUUID(),deletedAt:new Date().toISOString(),group:{...group,links:[structuredClone(link)]}});
 group.links=group.links.filter(l=>l.id!==linkId);
}
export function recycleGroup(data,groupId){const group=data.groups.find(g=>g.id===groupId);if(!group)throw Error('分类不存在');data.trash??=[];if(data.trash.length>=500)throw Error('回收站已满');data.trash.push({id:crypto.randomUUID(),deletedAt:new Date().toISOString(),group:structuredClone(group)});data.groups=data.groups.filter(g=>g.id!==groupId)}
export function restore(data,id,targetId){
 const item=data.trash?.find(t=>t.id===id);if(!item)throw Error('回收项不存在');
 let group=data.groups.find(g=>g.id===(targetId||item.group.id));
 const incoming=item.group.links;
 const existing=new Set(data.groups.flatMap(g=>g.links.map(l=>canonical(l.url))));
 if(incoming.some(l=>existing.has(canonical(l.url))))throw Error('存在相同网址，请先处理重复后再恢复');
 if(!group){if(data.groups.length>=30)throw Error('最多30个分类');group={...item.group,links:[]};data.groups.push(group)}
 if(group.links.length+incoming.length>150)throw Error('该分类超过150个网址上限');
 for(const link of incoming)group.links.push({...link,id:group.links.some(l=>l.id===link.id)?crypto.randomUUID():link.id});
 data.trash=data.trash.filter(t=>t.id!==id);return group;
}
export function moveLink(data,from,id,to){const {group,link}=findLink(data,from,id),target=data.groups.find(g=>g.id===to);if(!target)throw Error('目标分类不存在');if(group===target)return;if(target.links.length>=150)throw Error('目标分类已满');group.links=group.links.filter(l=>l.id!==id);target.links.push({...link,id:target.links.some(l=>l.id===id)?crypto.randomUUID():id})}
export function planImport(data,candidates,targetId){
 const known=new Map(data.groups.flatMap(g=>g.links.map(l=>[canonical(l.url),g.name])));
 return candidates.map(item=>{try{const url=canonical(item.url);const existing=known.get(url);if(existing)return {...item,url,status:'duplicate',reason:`已存在于 ${existing}`};known.set(url,'本次导入');return {...item,url,targetId,status:'ready'}}catch{return {...item,status:'invalid',reason:'网址格式不正确'}}});
}
export function applyImport(data,rows,fallbackId,preserveGroups=false){
 const planned=planImport(data,rows.filter(r=>r.selected!==false),fallbackId);let count=0;
 for(const row of planned){if(row.status!=='ready')continue;row.groupName=String(row.groupName||'').trim().slice(0,40);let group=preserveGroups&&row.groupName?data.groups.find(g=>g.name===row.groupName):data.groups.find(g=>g.id===fallbackId);
 if(!group&&preserveGroups&&row.groupName){if(data.groups.length>=30)throw Error('最多30个分类，请减少导入分类');group={id:crypto.randomUUID(),name:row.groupName.slice(0,40),icon:'◈',color:'#5678c5',links:[]};data.groups.push(group)}
 if(!group)throw Error('请选择目标分类');if(group.links.length>=150)throw Error(`${group.name} 超过150个网址，请分批导入`);
 group.links.push({id:crypto.randomUUID(),name:(row.name||new URL(row.url).hostname).slice(0,80),url:row.url,description:(row.description||'').slice(0,160),icon:'',openInNew:true});count++;
 }return count;
}
export function parseLines(text){return text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(line=>{const parts=line.split(/[|｜\t]/).map(s=>s.trim());const url=parts.find(s=>/^https?:\/\//i.test(s))||parts[0];return {url,name:parts.find(s=>s&&s!==url)||'',groupName:parts.length>2?parts[2]:''}})}
export async function checkLink(url,fetcher=fetch,signal){
 let u;try{u=new URL(canonical(url))}catch{return {state:'unknown',text:'网址格式不正确'}}
 if(!/^[a-z0-9.-]+\.[a-z]{2,63}$/i.test(u.hostname)||/\.(local|internal|lan|test|localhost)$/i.test(u.hostname))return {state:'unknown',text:'本地或内网地址，跳过'};
 const timer=new AbortController(),timeout=setTimeout(()=>timer.abort(),6000);const abort=()=>timer.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)timer.abort();
 try{const r=await fetcher(u.href,{method:'HEAD',mode:'cors',credentials:'omit',redirect:'manual',referrerPolicy:'no-referrer',signal:timer.signal});
 if(!r.status)return {state:'unknown',text:'重定向或跨域限制，需手动确认'};
 if([404,410].includes(r.status))return {state:'suspect',text:`疑似失效 · HTTP ${r.status}`};
 if(r.ok)return {state:'ok',text:`可访问 · HTTP ${r.status}`};
 return {state:'unknown',text:`HTTP ${r.status} · 可能需登录或暂时异常`};
 }catch{return {state:'unknown',text:'超时、跨域限制或网络异常，需手动确认'}}finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort)}
}

export function validatePinBackup(value){
 if(value?.type!=='navdesk-pins'||value.version!==1||!Array.isArray(value.urls)||value.urls.length>5000)throw Error('请选择有效的 NavDesk 置顶备份');
 return [...new Set(value.urls.map(url=>{if(typeof url!=='string'||url.length>4096)throw Error('置顶网址格式不正确');const u=new URL(url);if(!/^https?:$/.test(u.protocol)||u.username||u.password)throw Error('置顶网址格式不正确');return u.href}))];
}

export function mergeEditedLink(base,current,draft){
 if(!current)throw Error('网址已被删除，输入仍保留，可复制后重新添加');
 const result={...current},conflicts=[];
 for(const key of ['name','url','description','icon','openInNew']){
  if(draft[key]===base[key])continue;
  if(current[key]!==base[key]&&current[key]!==draft[key])conflicts.push(key);
  else result[key]=draft[key];
 }
 if(conflicts.length){const labels={name:'名称',url:'网址',description:'备注',icon:'图标',openInNew:'打开方式'};throw Error('这些字段已在其他设备修改：'+conflicts.map(k=>labels[k]).join('、')+'。输入已保留，请先查看最新值后合并。')}
 return result;
}

export function renameGroup(data,id,name,originalName){
 const group=data.groups.find(g=>g.id===id);if(!group)throw Error('分类已被删除');name=String(name).trim();if(!name||name.length>40)throw Error('分类名称需为1至40字');if(group.name!==originalName)throw Error('分类名称已变化，请重新打开后再修改');if(data.groups.some(g=>g.id!==id&&g.name===name))throw Error('已有同名分类');group.name=name;
}

export function validateNavigationBackup(value){if(value?.version!==1||!Array.isArray(value.groups))throw Error('不是有效的 NavDesk 完整备份');return sanitise(value)}
