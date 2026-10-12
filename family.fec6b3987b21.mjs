// NavDesk JavaScript module v2
const style=document.createElement('style');style.dataset.familyCss='1';style.textContent=".family-panel{border:1px solid var(--line);border-radius:22px;background:var(--surface-solid);box-shadow:var(--shadow);padding:14px;max-height:calc(100dvh - 40px);font-size:13px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}.family-heading{position:sticky;top:-14px;background:var(--surface-solid);z-index:1;padding:6px 0;display:flex;align-items:center;justify-content:space-between;gap:10px}.family-heading h2{margin:0;font-size:18px;letter-spacing:-.5px}.family-actions{display:flex;gap:6px}.family-panel button{border:1px solid var(--line);border-radius:10px;background:var(--surface-solid);padding:8px 10px;color:var(--text);font:inherit;cursor:pointer}.family-panel button:disabled{opacity:.6;cursor:wait}.family-panel .family-primary{background:var(--accent);border-color:var(--accent);color:#fff}.family-message{margin:10px 0;color:var(--accent);font-size:12px;min-height:16px}.family-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 14px}.family-summary button{text-align:left;padding:12px;border-radius:14px;background:var(--accent-soft)}.family-summary strong{display:block;font-size:22px;font-weight:650;margin-bottom:4px}.family-summary span{font-size:11px;color:var(--muted)}.family-summary .family-urgent{color:#c34863}.family-controls{display:grid;gap:10px}.family-filters{display:flex;gap:4px;flex-wrap:wrap}.family-filters button{border:0;padding:6px 9px;font-size:11px;background:transparent;color:var(--muted)}.family-filters [aria-pressed=true]{background:var(--accent-soft);color:var(--accent)}.family-panel input{width:100%;border:1px solid var(--line);border-radius:10px;background:var(--surface-solid);color:var(--text);padding:10px;font:inherit}.family-list{display:grid;gap:6px;margin-top:4px}.family-event{display:flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:13px;background:var(--surface-solid);padding:3px 5px;border-left:3px solid var(--accent-soft)}.family-event.is-overdue{background:#fff0f2;border-color:#edbcc6;border-left-color:#c4546c}.family-event.is-tomorrow{background:#fff8e3;border-color:#ead596;border-left-color:#c39628}.family-date-group.is-overdue{color:#ae4058}.family-date-group.is-tomorrow{color:#916a12}html[data-theme=dark] .family-event.is-overdue{background:#38242c;border-color:#73404e;border-left-color:#e58da0}html[data-theme=dark] .family-event.is-tomorrow{background:#332e21;border-color:#68572e;border-left-color:#d7b45e}html[data-theme=dark] .family-date-group.is-overdue{color:#efa2b3}html[data-theme=dark] .family-date-group.is-tomorrow{color:#e6c777}.family-event.is-done{opacity:.65}.family-event.is-done strong{text-decoration:line-through}.family-event .family-event-content{flex:1;min-width:0;text-align:left;background:transparent;border:0;padding:7px 5px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 8px}.family-event-content strong{grid-column:1/-1;font-size:13px;font-weight:600;overflow-wrap:anywhere}.family-event-content span,.family-event-content time{font-size:11px;color:var(--muted)}.family-event-content span{overflow-wrap:anywhere}.family-event-content time{white-space:nowrap}.family-event .family-done{border:0;color:var(--accent);background:var(--accent-soft);padding:7px 9px;min-width:36px;min-height:40px;font-size:15px}.family-empty,.family-loading{text-align:center;padding:34px 8px;color:var(--muted)}.family-empty>span{display:block;font-size:32px;color:var(--accent);margin-bottom:12px}.family-empty strong{display:block;color:var(--text);font-size:13px}.family-empty p,.family-login p{font-size:12px;line-height:1.7}.family-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;border-top:1px solid var(--line);padding-top:8px;margin-top:10px}.family-footer a,.family-full{font-size:11px;color:var(--accent);text-decoration:none}.family-footer button{font-size:10px;background:transparent;border:0;color:var(--muted)}.family-login{display:grid;gap:10px;text-align:center;padding:16px 4px}.family-login h3,.family-login p{margin:0}.family-empty-mark{font-size:36px;color:var(--accent);margin:10px}.family-error{color:#c34863;font-size:12px;min-height:16px}.family-full{display:block;text-align:center;margin:12px}.family-muted{font-size:11px;color:var(--muted);text-align:center}@media(max-width:650px){.family-panel{padding:12px;border-radius:18px}}.family-heading .family-actions button{font-size:11px;padding:7px}.family-panel [hidden]{display:none!important}@media(max-width:650px){.family-panel{max-height:none}.family-heading{top:-12px}.family-panel [data-action=disconnect]{display:none}}.family-date-group{margin:6px 0 0;font-size:12px;color:var(--muted)}.family-date-group span{margin-left:6px;color:var(--accent)}.family-attachments{display:flex;gap:6px;flex-wrap:wrap}.family-message:empty{display:none}html[data-theme=dark] .family-primary{color:var(--bg)}";document.head.append(style);const HOME='https://home-ledger.667989.xyz/';
export function eventBuckets(events,today){
 const pending=events.filter(e=>!e.archived&&e.status!=='done');
 return [
  {id:'overdue',name:'逾期',items:pending.filter(e=>e.date<today)},
  {id:'today',name:'今天',items:pending.filter(e=>e.date===today)},
  {id:'upcoming',name:'近期',items:pending.filter(e=>e.date>today)},
 ];
}
export function mountFamily(root,request,initial){
 let ledger=null,filter='all',query='',busy=false,typeFilter='',filtersOpen=false;
 const dateFormat=new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
 const today=()=>{const parts=dateFormat.formatToParts(new Date()),value=t=>parts.find(p=>p.type===t).value;return value('year')+'-'+value('month')+'-'+value('day')};
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const field=(label,name,value,type='text')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${['title','date'].includes(name)?'required':''}></label>`;
 const shell=()=>`<header class="family-heading"><div><h2>Family Hub</h2></div><div class="family-actions"><button type="button" data-action="filters" aria-label="显示分类和搜索">筛选</button><button type="button" data-action="refresh" aria-label="刷新家庭事务">↻</button><button type="button" class="family-primary" data-action="new">＋ 新增</button></div></header><p class="family-message" role="status" aria-live="polite"></p>`;
 function message(text){const node=root.querySelector('.family-message');if(node)node.textContent=text}
 function login(error=''){
  ledger=null;root.innerHTML=shell()+`<form class="family-login"><div class="family-empty-mark">⌂</div><h3>连接家庭事务</h3><p>输入 HomeLedger 密码，连接原有事项。</p><label class="sr-only" for="familyPassword">HomeLedger 密码</label><input id="familyPassword" type="password" autocomplete="current-password" placeholder="HomeLedger 密码" required><button type="submit" class="family-primary">连接</button><p class="family-error" role="alert">${esc(error)}</p></form><a class="family-full" href="${HOME}" target="_blank" rel="noopener">打开完整家庭事务 ↗</a>`;
 }
 function render(){
  const buckets=eventBuckets(ledger.events||[],today());
  root.innerHTML=shell()+`<div class="family-summary" ${filtersOpen?'':'hidden'}>${buckets.map(b=>`<button type="button" data-filter="${b.id}" class="${b.id==='overdue'&&b.items.length?'family-urgent':''}"><strong>${b.items.length}</strong><span>${b.name}</span></button>`).join('')}</div><div class="family-controls" ${filtersOpen?'':'hidden'}><div class="family-filters" role="group" aria-label="事项范围">${[{id:'all',name:'待办'},...buckets,{id:'done',name:'已完成'}].map(b=>`<button type="button" data-filter="${b.id}" aria-pressed="${filter===b.id}">${b.name}</button>`).join('')}</div><div class="family-filters" role="group" aria-label="事项分类"><button data-type="" aria-pressed="${!typeFilter}">全部分类</button>${(ledger.settings?.types||[]).map(t=>`<button data-type="${esc(t.id)}" aria-pressed="${typeFilter===t.id}">${esc(t.name)}</button>`).join('')}</div><label class="sr-only" for="familySearch">搜索家庭事项</label><input id="familySearch" type="search" placeholder="搜索家庭事项…" value="${esc(query)}"></div><div class="family-list" aria-live="polite"></div><footer class="family-footer"><a href="${HOME}" target="_blank" rel="noopener">完整管理 ↗</a><button type="button" data-action="disconnect">断开连接</button></footer>`;
  renderList();
 }
 function renderList(){
  const date=today(),stamp=Date.parse(date);
  let items=filter==='done'?(ledger.events||[]).filter(e=>!e.archived&&e.status==='done'):eventBuckets(ledger.events||[],date).filter(b=>filter==='all'||b.id===filter).flatMap(b=>b.items);
  items=items.filter(e=>(!typeFilter||e.type===typeFilter)&&(e.title+' '+(e.note||'')).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const count=items.length;items=items.slice(0,50);
  let lastGroup='';
  root.querySelector('.family-list').innerHTML=items.map(e=>{
   const days=Math.round((Date.parse(e.date)-stamp)/864e5),group=e.status==='done'?'已完成':days<0?'逾期':days===0?'今天':days===1?'明天':days<=7?'未来 7 天':days<=30?'30 天内':days<=365?'一年内':'更远';
   const state=e.status==='done'?'is-done':days<0?'is-overdue':days===1?'is-tomorrow':'';
   const heading=group!==lastGroup?`<h3 class="family-date-group ${state}">${group}</h3>`:'';lastGroup=group;
   const type=ledger.settings?.types?.find(t=>t.id===e.type)?.name||'事项';
   return heading+`<article class="family-event ${state}"><button type="button" class="family-event-content" data-action="detail" data-id="${esc(e.id)}"><strong>${esc(e.title)}</strong><span>${esc(type)}${Number(e.amount)?' · '+esc(e.currency||'CNY')+' '+esc(e.amount):''}</span><time datetime="${esc(e.date)}">${esc(e.date)}</time></button><button type="button" class="family-done" data-action="${e.status==='done'?'restore':'done'}" data-id="${esc(e.id)}" aria-label="${e.status==='done'?'恢复':'完成'}${esc(e.title)}">${e.status==='done'?'↶':'✓'}</button></article>`;
  }).join('')||'<div class="family-empty"><span>☀</span><strong>这里暂时没有事项</strong><p>放轻松，也可以添加一条新的提醒。</p></div>';
  if(count>50)root.querySelector('.family-list').insertAdjacentHTML('beforeend','<p class="family-muted">显示前 50 条，更多事项请打开完整管理。</p>');
 }
 async function load(){
  if(busy)return;busy=true;
  if(!ledger)root.innerHTML=shell()+'<div class="family-loading" role="status">正在读取家庭事务…</div>';
  try{if(initial){const result=await initial;initial=null;if(result.error)throw result.error;ledger=result.data}else ledger=await request('/api/family/ledger',{},false,false);render();performance.mark('navdesk-family-ready')}
  catch(error){if(error.status===401)login();else{if(!ledger)root.innerHTML=shell()+`<div class="family-empty"><strong>暂时无法连接</strong><p>${esc(error.message)}</p><button type="button" data-action="refresh">重试</button></div>`;else message(error.message)}}
  finally{busy=false}
 }
 let dialogs;
 async function openDialog(action,item){
  try{dialogs??=import('/familydialogs.9dfe382a7cd3.mjs').then(m=>m.installFamilyDialogs({get:()=>ledger,set:value=>{ledger=value},request,render,message,today,esc,field,HOME})).catch(error=>{dialogs=null;throw error});await (await dialogs)[action](item)}catch{message('家庭事务工具加载失败，请重试')}
 }
 root.addEventListener('input',event=>{if(event.target.id==='familySearch'){query=event.target.value;renderList()}});
 root.addEventListener('submit',async event=>{if(!event.target.matches('.family-login'))return;event.preventDefault();const form=event.target,button=form.querySelector('button');button.disabled=true;try{await request('/api/family/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:form.querySelector('input').value})},false,false);form.reset();await load()}catch(error){form.querySelector('.family-error').textContent=error.message}finally{button.disabled=false}});
 root.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.filter){filter=button.dataset.filter;if(ledger)render();return}
  if(button.hasAttribute('data-type')){typeFilter=button.dataset.type;render();return}
  const action=button.dataset.action;if(!action)return;
  if(action==='refresh')return load();if(action==='new'){if(!ledger)return message('请先连接家庭事务');return openDialog('edit')}if(action==='detail')return openDialog('details',button.dataset.id);
  if(action==='filters'){filtersOpen=!filtersOpen;root.querySelectorAll('.family-summary,.family-controls').forEach(node=>node.hidden=!node.hidden);return}
  if(action==='disconnect'){try{await request('/api/family/logout',{method:'POST'},false,false);login()}catch(error){message(error.message)}return}
  if(!['done','restore'].includes(action)||!ledger)return;button.disabled=true;
  try{const result=await request('/api/family/events',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:button.dataset.id,action,revision:ledger.revision})},false,false);ledger=result.data;render();message(action==='done'?'已完成':'已恢复')}
  catch(error){message(error.status===409?'事项已在其他页面更新，请刷新后重试。':error.message);button.disabled=false}
 });
 load();return {refresh:load};
}
