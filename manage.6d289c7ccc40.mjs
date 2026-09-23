// NavDesk JavaScript module v2
import './dialogs.83efedf8180f.mjs';
import * as model from './model.8ebbfa033d2f.mjs';
export function parseBookmarks(text){
 const doc=new DOMParser().parseFromString(text,'text/html');
 const items=[...doc.querySelectorAll('a[href]')].map(a=>{let dl=a.closest('dl'),groupName='';while(dl){const sibling=dl.previousElementSibling;const heading=sibling?.matches('h3')?sibling:sibling?.querySelector('h3');if(heading){groupName=heading.textContent.trim();break}dl=dl.parentElement?.closest('dl')}return {name:a.textContent.trim(),url:a.getAttribute('href'),groupName}});
 if(!items.length)throw Error('没有找到书签，请选择浏览器导出的书签HTML');return items;
}

export function createManager({navigation:nav,pins,icons}){
let dialog,body,message,busy=false,mode,controller,rows=[];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const query=s=>dialog.querySelector(s);
async function mutate(fn){for(let attempt=0;attempt<2;attempt++){const fresh=await nav.read();const result=await fn(fresh);try{await nav.save(fresh);return result}catch(error){if(error.status!==409||attempt)throw error}}}

function ensure(){if(dialog)return;dialog=document.createElement('dialog');dialog.className='quick-editor manager-dialog';dialog.innerHTML=`<header><div><p>网站整理</p><h2 id="managerTitle">整理网址</h2></div><button type="button" data-close aria-label="关闭整理面板">×</button></header><nav class="manager-tabs"><button data-tab="categories">分类管理</button><button data-tab="batch">批量添加</button><button data-tab="import">书签导入</button><button data-tab="trash">回收站</button><button data-tab="check">失效检查</button><button data-tab="pins">置顶备份</button><button data-tab="backup">备份与退出</button></nav><div id="managerBody"></div><p id="managerMessage" role="status"></p>`;document.body.append(dialog);body=query('#managerBody');message=query('#managerMessage');query('[data-close]').onclick=()=>{if(!busy){controller?.abort();dialog.close()}};dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();else controller?.abort()});dialog.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{if(!busy)screen(button.dataset.tab)});matchMedia('(max-width:650px)').addEventListener('change',e=>{if(e.matches&&!busy){controller?.abort();dialog.close()}})}
function status(text){message.textContent=text}
function buttonBusy(value){busy=value;dialog.querySelectorAll('button,input,select,textarea').forEach(el=>el.disabled=value)}
function options(){return nav.get().groups.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}
function screen(action){controller?.abort();mode=action;rows=[];status('');dialog.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===action));query('#managerTitle').textContent=action==='categories'?'分类管理':'整理网址';
 if(action==='batch'||action==='import'){
  body.innerHTML=`<p class="manager-hint">预览后选择要添加的项目。相同网址会自动跳过，不覆盖现有内容。</p><label>默认目标分类<select id="importTarget">${options()}</select></label>${action==='batch'?'<label>每行一个网址，或 名称｜网址<textarea id="batchText" rows="6" placeholder="GitHub｜https://github.com/\nhttps://example.com/"></textarea></label><button id="prepareImport" type="button">生成预览</button>':'<label>选择浏览器书签 HTML<input id="bookmarkFile" type="file" accept=".html,.htm,text/html"></label><label class="quick-check"><input id="preserveFolders" type="checkbox" checked>按书签文件夹合并分类</label>'}<div id="importPreview"></div><button class="primary" id="commitImport" hidden>添加选中网址</button>`;
  if(action==='batch')query('#prepareImport').onclick=()=>preview(model.parseLines(query('#batchText').value));
  else query('#bookmarkFile').onchange=async event=>{const file=event.target.files[0];if(!file)return;if(file.size>5000000){status('书签文件不能超过5 MB');return}try{const text=await file.text();preview(parseBookmarks(text))}catch(error){status(error.message)}};
  query('#importTarget').onchange=()=>{if(rows.length)preview(rows)};
  query('#commitImport').onclick=commitImport;
 }else if(action==='categories')renderCategories();else if(action==='trash')renderTrash();else if(action==='pins')renderPinBackup();else if(action==='backup')renderBackup();else renderChecks();
}
function preview(candidates){
 if(candidates.length>1000){status('每批最多1000条，请拆分文件或文本');return}
 rows=model.planImport(nav.get(),candidates,query('#importTarget').value);
 query('#importPreview').innerHTML=`<div class="import-list">${rows.map((row,i)=>`<label class="import-row"><input type="checkbox" data-row="${i}" ${row.status==='ready'?'checked':'disabled'}><span><b>${esc(row.name||row.url)}</b><small>${esc(row.url)}</small><small>${esc(row.groupName||'')} ${row.status==='ready'?'可添加':esc(row.reason)}</small></span></label>`).join('')}</div>`;
 query('#commitImport').hidden=!rows.some(r=>r.status==='ready');status(`${rows.filter(r=>r.status==='ready').length} 条可添加，${rows.filter(r=>r.status==='duplicate').length} 条重复，${rows.filter(r=>r.status==='invalid').length} 条无效`);
}
async function commitImport(){
 const selected=[...dialog.querySelectorAll('[data-row]:checked')].map(el=>rows[Number(el.dataset.row)]);if(!selected.length){status('请至少选择一个网址');return}
 const target=query('#importTarget').value,preserve=query('#preserveFolders')?.checked;buttonBusy(true);
 try{const count=await mutate(data=>model.applyImport(data,selected,target,preserve));screen(mode);status(`已添加 ${count} 条；保存前再次检查过重复网址`)}catch(error){status(error.message)}finally{buttonBusy(false);dialog.querySelectorAll('[data-row]').forEach(el=>el.disabled=rows[Number(el.dataset.row)]?.status!=='ready')}
}
async function renderTrash(){
 body.innerHTML='<p>正在读取回收站…</p>';
 try{const fresh=await nav.read();if(mode!=='trash'||!dialog.open)return;nav.show(fresh);
  const trash=fresh.trash||[];body.innerHTML=trash.length?`<button id="clearTrash">清空回收站</button><p class="manager-hint">恢复到原分类；原分类已删除时会重新创建。已有相同网址时保留回收项并提示。</p>${trash.slice().reverse().map(item=>`<div class="restore-row"><span><b>${esc(item.group.links.length===1?item.group.links[0].name:item.group.name)}</b><small>${esc(item.group.name)} · ${item.group.links.length} 个网址 · ${esc(item.deletedAt.slice(0,10))}</small></span><button data-restore="${esc(item.id)}">恢复</button><button data-purge="${esc(item.id)}">彻底删除</button></div>`).join('')}`:'<p>回收站为空。</p>';
  const purge=async ids=>{if(!confirm(`彻底删除 ${ids.length} 个回收项？此操作无法恢复。`))return;buttonBusy(true);try{await mutate(data=>{const expected=trash.filter(t=>ids.includes(t.id));if(expected.some(item=>JSON.stringify(data.trash?.find(t=>t.id===item.id))!==JSON.stringify(item)))throw Error('回收站已变化，请重新打开');data.trash=(data.trash||[]).filter(t=>!ids.includes(t.id))});await renderTrash();status('已彻底删除选定回收项')}catch(error){status(error.message)}finally{buttonBusy(false)}};
  if(query('#clearTrash'))query('#clearTrash').onclick=()=>purge(trash.map(t=>t.id));body.querySelectorAll('[data-purge]').forEach(button=>button.onclick=()=>purge([button.dataset.purge]));
  body.querySelectorAll('[data-restore]').forEach(button=>button.onclick=async()=>{buttonBusy(true);try{await mutate(data=>model.restore(data,button.dataset.restore));await renderTrash();status('已恢复')}catch(error){status(error.message)}finally{buttonBusy(false)}});
 }catch(error){status(error.message)}
}
function renderChecks(){
 const links=nav.get().groups.flatMap(g=>g.links.map(l=>({...l,group:g.name})));
 body.innerHTML=`<p class="manager-hint">仅在点击开始后检查。浏览器跨域、登录限制或超时会标为“无法确认”；不会自动删除网址。每次最多100个，最多3个并发。</p><div class="check-actions"><button id="startCheck">检查选中网址</button><button id="stopCheck" hidden>停止</button></div><div class="import-list">${links.map((link,i)=>`<label class="import-row"><input type="checkbox" data-check="${i}" ${i<30?'checked':''}><span><b>${esc(link.name)}</b><small>${esc(link.group)} · ${esc(link.url)}</small><small id="check-${i}">未检查</small></span></label>`).join('')}</div>`;
 query('#startCheck').onclick=async()=>{
  const selected=[...body.querySelectorAll('[data-check]:checked')].map(el=>Number(el.dataset.check));if(!selected.length||selected.length>100){status('请选择1至100个网址');return}
  controller=new AbortController();const signal=controller.signal;query('#startCheck').disabled=true;query('#stopCheck').hidden=false;
  let cursor=0,completed=0;const run=async()=>{while(cursor<selected.length&&!signal.aborted){const i=selected[cursor++];const node=query(`#check-${i}`);node.textContent='正在检查…';const result=await model.checkLink(links[i].url,fetch,signal);if(signal.aborted){node.textContent='已停止';break}node.textContent=result.text;node.dataset.state=result.state;status(`已检查 ${++completed}/${selected.length}`)}};
  await Promise.all([run(),run(),run()]);if(mode==='check'&&controller.signal===signal){query('#startCheck').disabled=false;query('#stopCheck').hidden=true;if(signal.aborted)status('检查已停止')}
 };
 query('#stopCheck').onclick=()=>controller?.abort();
}
async function open(action,payload={}){
 if(matchMedia('(max-width:650px)').matches)return;
 ensure();
 if(['batch','import','trash','check','pins','categories','backup'].includes(action)){dialog.showModal();screen(action);return}
 const current=nav.get(),origin=current.groups.find(g=>g.id===payload.groupId),oldLink=origin?.links.find(l=>l.id===payload.linkId);
 if(action==='move'){
  dialog.showModal();mode='move';query('#managerTitle').textContent='移动到其他分类';status('');
  body.innerHTML=`<p>${esc(oldLink?.name)}</p><label>目标分类<select id="moveTarget">${options()}</select></label><button id="confirmMove" class="primary">移动</button>`;query('#moveTarget').value=payload.groupId;
  query('#confirmMove').onclick=async()=>{const target=query('#moveTarget').value;buttonBusy(true);try{await mutate(data=>{verify(data);model.moveLink(data,payload.groupId,payload.linkId,target)});dialog.close()}catch(error){status(error.message)}finally{buttonBusy(false)}};return;
 }
 function verify(data){const found=model.findLink(data,payload.groupId,payload.linkId);if(JSON.stringify(found.link)!==JSON.stringify(oldLink))throw Error('网址已在其他页面修改，请刷新后重试');return found}
 if(action==='delete'&&!confirm(`将“${oldLink?.name}”移入回收站？可在“整理网址”中恢复。`))return;
 if(action==='deleteGroup'&&!confirm(`将分类“${origin?.name}”及网址移入回收站？`))return;
 if(action==='refresh'){
  if(!oldLink)return;if(oldLink.icon){icons.invalidate(oldLink);nav.show(current);alert('自定义图标已重新请求；上游缓存由图标网站控制。');return}
  const result=await nav.request('/api/icons',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:oldLink.url})});
  icons.invalidate(oldLink);nav.show(current);alert(result.ok?'图标已刷新':'暂时无法获取图标，已保留首字或旧图标');return;
 }
 await mutate(data=>{if(action==='deleteGroup'){const fresh=data.groups.find(g=>g.id===payload.groupId);if(JSON.stringify(fresh)!==JSON.stringify(origin))throw Error('分类已变化，请刷新后重试');model.recycleGroup(data,payload.groupId);return}
  const {link}=verify(data);if(action==='delete')model.recycleLink(data,payload.groupId,payload.linkId);
 });
}
function renderPinBackup(){
 body.innerHTML='<p class="manager-hint">仅备份本浏览器的置顶网址与顺序。导入会合并到现有置顶后，不改云端分类和网址。</p><button id="exportPins">导出置顶备份</button><label>导入置顶备份<input type="file" accept=".json,application/json" id="pinBackupFile"></label><p id="pinPreview" class="manager-hint"></p><button id="importPins" hidden>合并置顶</button>';
 const read=pins.read;
 query('#exportPins').onclick=()=>{try{const urls=model.validatePinBackup({type:'navdesk-pins',version:1,urls:read()});const blob=new Blob([JSON.stringify({type:'navdesk-pins',version:1,urls},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='navdesk-pins.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status(`已导出 ${urls.length} 个置顶网址`)}catch(error){status(error.message)}};
 let incoming=[];
 query('#pinBackupFile').onchange=async event=>{query('#importPins').hidden=true;const file=event.target.files[0];if(!file)return;try{if(file.size>1000000)throw Error('备份文件不能超过1 MB');incoming=model.validatePinBackup(JSON.parse(await file.text()));const existing=new Set(read()),known=new Set(nav.get().groups.flatMap(g=>g.links.map(l=>l.url)));query('#pinPreview').textContent=`备份共 ${incoming.length} 项，新增 ${incoming.filter(u=>!existing.has(u)).length} 项；${incoming.filter(u=>!known.has(u)).length} 项未在导航中，添加对应网址后会显示。`;query('#importPins').hidden=false}catch(error){status(error.message)}};
 query('#importPins').onclick=()=>{try{const urls=model.validatePinBackup({type:'navdesk-pins',version:1,urls:[...new Set([...read(),...incoming])]});pins.save(urls);status(`已合并，本浏览器共 ${urls.length} 个置顶网址`);query('#importPins').hidden=true}catch(error){status(error.message||'无法保存本地置顶')}};
}
async function renderCategories(){
 const snapshot=nav.get().groups;
 body.innerHTML=`<div class="category-create"><input id="newCategoryName" maxlength="40" placeholder="新分类名称" aria-label="新分类名称"><button id="addCategory">＋ 新增分类</button></div><p class="manager-hint">上下调整顺序，操作后立即保存。删除的分类及网址可在回收站恢复。</p><div class="category-list">${snapshot.map((g,i)=>`<div class="restore-row"><span><b>${esc(g.name)}</b><small>${g.links.length} 个网址</small></span><button data-category-up="${i}" aria-label="上移${esc(g.name)}" ${i===0?'disabled':''}>↑</button><button data-category-down="${i}" aria-label="下移${esc(g.name)}" ${i===snapshot.length-1?'disabled':''}>↓</button><button data-category-rename="${i}" aria-label="重命名${esc(g.name)}">重命名</button><button data-category-delete="${i}" aria-label="删除${esc(g.name)}">删除</button></div>`).join('')}</div>`;
 const run=async fn=>{if(busy)return;buttonBusy(true);try{await mutate(fn);await renderCategories();status('分类已保存')}catch(error){status(error.message)}finally{buttonBusy(false);body.querySelector('[data-category-up="0"]')?.setAttribute('disabled','');body.querySelector(`[data-category-down="${nav.get().groups.length-1}"]`)?.setAttribute('disabled','')}};
 query('#addCategory').onclick=()=>{const name=query('#newCategoryName').value.trim();if(!name){status('请输入分类名称');return}run(data=>{if(data.groups.length>=30)throw Error('最多30个分类');if(data.groups.some(g=>g.name===name))throw Error('已有同名分类');data.groups.push({id:crypto.randomUUID(),name,icon:'◈',color:'#5678c5',links:[]})})};
 body.querySelectorAll('[data-category-up],[data-category-down]').forEach(button=>button.onclick=()=>{const from=Number(button.dataset.categoryUp??button.dataset.categoryDown),to=from+(button.hasAttribute('data-category-up')?-1:1);run(data=>{if(JSON.stringify(data.groups.map(g=>g.id))!==JSON.stringify(snapshot.map(g=>g.id)))throw Error('分类列表已变化，请重新打开');[data.groups[from],data.groups[to]]=[data.groups[to],data.groups[from]]})});
 body.querySelectorAll('[data-category-rename]').forEach(button=>button.onclick=()=>{const group=snapshot[Number(button.dataset.categoryRename)],name=prompt('新的分类名称',group.name);if(name!==null)run(data=>model.renameGroup(data,group.id,name,group.name))});
 body.querySelectorAll('[data-category-delete]').forEach(button=>button.onclick=()=>{const group=snapshot[Number(button.dataset.categoryDelete)];if(!confirm(`将“${group.name}”及 ${group.links.length} 个网址移入回收站？`))return;run(data=>{const fresh=data.groups.find(g=>g.id===group.id);if(JSON.stringify(fresh)!==JSON.stringify(group))throw Error('分类内容已变化，请重新打开');model.recycleGroup(data,group.id)})});
}
function downloadJSON(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function renderBackup(){
 body.innerHTML='<p class="manager-hint">完整备份包括分类、网址、站点设置和回收站。本浏览器置顶请在“置顶备份”单独导出。</p><button id="exportNavigation">导出完整导航</button><label>恢复 JSON 备份<input id="navigationBackupFile" type="file" accept=".json,application/json"></label><p id="navigationBackupPreview" class="manager-hint"></p><button id="restoreNavigation" hidden>恢复并替换当前导航</button><hr><button id="logoutNavigation">退出登录</button>';
 query('#exportNavigation').onclick=async()=>{buttonBusy(true);try{const data=await nav.read();downloadJSON(data,'navdesk-full-'+new Date().toISOString().slice(0,10)+'.json');status('完整备份已导出')}catch(error){status(error.message)}finally{buttonBusy(false)}};
 let imported,baseline;
 query('#navigationBackupFile').onchange=async event=>{query('#restoreNavigation').hidden=true;const file=event.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('备份不能超过2 MB');imported=model.validateNavigationBackup(JSON.parse(await file.text()));baseline=await nav.read();query('#navigationBackupPreview').textContent=`备份含 ${imported.groups.length} 个分类、${imported.groups.reduce((n,g)=>n+g.links.length,0)} 个网址、${imported.trash.length} 个回收项。恢复会替换当前全部导航，请先导出当前数据。`;query('#restoreNavigation').hidden=false}catch(error){status(error.message)}};
 query('#restoreNavigation').onclick=async()=>{if(!imported||!confirm('确认用选中的备份替换当前分类、网址、设置及回收站？建议先导出当前完整备份。'))return;buttonBusy(true);try{await mutate(data=>{if(data.updatedAt!==baseline.updatedAt)throw Error('当前导航已变化，请重新选择备份查看预览');const revision=data.updatedAt;Object.assign(data,structuredClone(imported),{updatedAt:revision})});renderBackup();status('导航已从备份恢复')}catch(error){status(error.message)}finally{buttonBusy(false)}};
 query('#logoutNavigation').onclick=async()=>{try{await nav.request('/api/auth/logout',{method:'POST'});location.reload()}catch(error){status(error.message)}};
}

return {open};
}
