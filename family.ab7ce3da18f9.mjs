// NavDesk JavaScript module v2
const HOME='https://home-ledger.667989.xyz/';
export function eventBuckets(events,today){
 const pending=events.filter(e=>!e.archived&&e.status!=='done');
 return [
  {id:'overdue',name:'逾期',items:pending.filter(e=>e.date<today)},
  {id:'today',name:'今天',items:pending.filter(e=>e.date===today)},
  {id:'upcoming',name:'近期',items:pending.filter(e=>e.date>today)},
 ];
}
export function mountFamily(root,request){
 if(!document.querySelector('[data-family-css]')){const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/family.3161cc9fd32e.css';sheet.dataset.familyCss='1';document.head.append(sheet)}
 let ledger=null,filter='all',query='',busy=false;
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const field=(label,name,value,type='text')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${['title','date'].includes(name)?'required':''}></label>`;
 const shell=()=>`<header class="family-heading"><div><span class="family-eyebrow">FAMILY HUB</span><h2>家庭事务</h2></div><div class="family-actions"><button type="button" data-action="refresh" aria-label="刷新家庭事务">↻</button><button type="button" class="family-primary" data-action="new">＋ 新增</button></div></header><p class="family-message" role="status" aria-live="polite"></p>`;
 function message(text){const node=root.querySelector('.family-message');if(node)node.textContent=text}
 function login(error=''){
  ledger=null;root.innerHTML=shell()+`<form class="family-login"><div class="family-empty-mark">⌂</div><h3>连接家庭事务</h3><p>输入 HomeLedger 密码，连接原有事项。</p><label class="sr-only" for="familyPassword">HomeLedger 密码</label><input id="familyPassword" type="password" autocomplete="current-password" placeholder="HomeLedger 密码" required><button type="submit" class="family-primary">连接</button><p class="family-error" role="alert">${esc(error)}</p></form><a class="family-full" href="${HOME}" target="_blank" rel="noopener">打开完整家庭事务 ↗</a>`;
 }
 function render(){
  const buckets=eventBuckets(ledger.events||[],today());
  root.innerHTML=shell()+`<div class="family-summary">${buckets.map(b=>`<button type="button" data-filter="${b.id}" class="${b.id==='overdue'&&b.items.length?'family-urgent':''}"><strong>${b.items.length}</strong><span>${b.name}</span></button>`).join('')}</div><div class="family-controls"><div class="family-filters" role="group" aria-label="事项范围">${[{id:'all',name:'待办'},...buckets,{id:'done',name:'已完成'}].map(b=>`<button type="button" data-filter="${b.id}" aria-pressed="${filter===b.id}">${b.name}</button>`).join('')}</div><label class="sr-only" for="familySearch">搜索家庭事项</label><input id="familySearch" type="search" placeholder="搜索家庭事项…" value="${esc(query)}"></div><div class="family-list" aria-live="polite"></div><footer class="family-footer"><a href="${HOME}" target="_blank" rel="noopener">完整管理 ↗</a><button type="button" data-action="disconnect">断开连接</button></footer>`;
  renderList();
 }
 function renderList(){
  let items=filter==='done'?(ledger.events||[]).filter(e=>!e.archived&&e.status==='done'):eventBuckets(ledger.events||[],today()).filter(b=>filter==='all'||b.id===filter).flatMap(b=>b.items);
  items=items.filter(e=>(e.title+' '+(e.note||'')).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const count=items.length;items=items.slice(0,50);
  root.querySelector('.family-list').innerHTML=items.map(e=>{
   const type=ledger.settings?.types?.find(t=>t.id===e.type)?.name||'事项';
   return `<article class="family-event ${e.status==='done'?'is-done':e.date<today()?'is-overdue':''}"><button type="button" class="family-event-content" data-action="detail" data-id="${esc(e.id)}"><strong>${esc(e.title)}</strong><span>${esc(type)}${Number(e.amount)?' · '+esc(e.currency||'CNY')+' '+esc(e.amount):''}</span><time datetime="${esc(e.date)}">${esc(e.date)}</time></button><button type="button" class="family-done" data-action="${e.status==='done'?'restore':'done'}" data-id="${esc(e.id)}" aria-label="${e.status==='done'?'恢复':'完成'}${esc(e.title)}">${e.status==='done'?'↶':'✓'}</button></article>`;
  }).join('')||'<div class="family-empty"><span>☀</span><strong>这里暂时没有事项</strong><p>放轻松，也可以添加一条新的提醒。</p></div>';
  if(count>50)root.querySelector('.family-list').insertAdjacentHTML('beforeend','<p class="family-muted">显示前 50 条，更多事项请打开完整管理。</p>');
 }
 async function load(){
  if(busy)return;busy=true;
  if(!ledger)root.innerHTML=shell()+'<div class="family-loading" role="status">正在读取家庭事务…</div>';
  try{ledger=await request('/api/family/ledger',{},false,false);render()}
  catch(error){if(error.status===401)login();else{if(!ledger)root.innerHTML=shell()+`<div class="family-empty"><strong>暂时无法连接</strong><p>${esc(error.message)}</p><button type="button" data-action="refresh">重试</button></div>`;else message(error.message)}}
  finally{busy=false}
 }
 function dialog(){let node=document.getElementById('familyDialog');if(!node){node=document.createElement('dialog');node.id='familyDialog';node.className='family-dialog';document.body.append(node)}return node}
 function details(id){const item=ledger.events.find(e=>e.id===id);if(!item)return;const node=dialog();node.innerHTML=`<div class="family-modal"><header><h2>${esc(item.title)}</h2><button type="button" data-close aria-label="关闭">×</button></header><dl><dt>日期</dt><dd>${esc(item.date)}</dd><dt>状态</dt><dd>${item.status==='done'?'已完成':'待办'}</dd>${Number(item.amount)?`<dt>金额</dt><dd>${esc(item.currency||'CNY')} ${esc(item.amount)}</dd>`:''}</dl><p class="family-note">${esc(item.note||'暂无备注')}</p><footer><a href="${HOME}" target="_blank" rel="noopener">附件与完整详情 ↗</a><button type="button" class="family-primary" data-edit>编辑</button></footer></div>`;node.querySelector('[data-close]').onclick=()=>node.close();node.querySelector('[data-edit]').onclick=()=>{node.close();edit(item)};node.showModal()}
 function edit(item=null){
  if(!ledger){message('请先连接家庭事务');return}
  const node=dialog();node.innerHTML=`<form class="family-modal"><header><h2>${item?'编辑事项':'新增事项'}</h2><button type="button" data-close aria-label="关闭">×</button></header><div class="family-form-grid">${field('标题','title',item?.title||'')}${field('日期','date',item?.date||today(),'date')}<label>分类<select name="type">${(ledger.settings?.types||[]).map(t=>`<option value="${esc(t.id)}" ${t.id===item?.type?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label>${field('金额（可选）','amount',item?.amount||0,'number')}<label>币种<select name="currency">${['CNY','USD','HKD','EUR','JPY','INR','GBP'].map(c=>`<option ${c===(item?.currency||'CNY')?'selected':''}>${c}</option>`).join('')}</select></label>${item?'':'<label>重复<select name="repeat"><option value="none">单次</option><option value="monthly">每月</option><option value="yearly">每年</option></select></label>'}<label class="family-form-note">备注<textarea name="note">${esc(item?.note||'')}</textarea></label></div><p class="family-error" role="alert"></p><footer><button type="button" data-cancel>取消</button><button class="family-primary" type="submit">保存</button></footer></form>`;
  node.querySelector('[data-close]').onclick=node.querySelector('[data-cancel]').onclick=()=>node.close();
  node.querySelector('form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,submit=form.querySelector('[type=submit]');submit.disabled=true;const values=Object.fromEntries(new FormData(form));values.amount=Number(values.amount)||0;
   try{const result=await request('/api/family/events',{method:item?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:ledger.revision,...(item?{id:item.id,event:values}:values)})},false,false);ledger=result.data;node.close();render();message('已保存')}
   catch(error){form.querySelector('.family-error').textContent=error.status===409?'数据已更新，请取消并刷新后再编辑。':error.message}
   finally{submit.disabled=false}
  };node.showModal();
 }
 root.addEventListener('input',event=>{if(event.target.id==='familySearch'){query=event.target.value;renderList()}});
 root.addEventListener('submit',async event=>{if(!event.target.matches('.family-login'))return;event.preventDefault();const form=event.target,button=form.querySelector('button');button.disabled=true;try{await request('/api/family/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:form.querySelector('input').value})},false,false);form.reset();await load()}catch(error){form.querySelector('.family-error').textContent=error.message}finally{button.disabled=false}});
 root.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.filter){filter=button.dataset.filter;if(ledger)render();return}
  const action=button.dataset.action;if(!action)return;
  if(action==='refresh')return load();if(action==='new')return edit();if(action==='detail')return details(button.dataset.id);
  if(action==='disconnect'){try{await request('/api/family/logout',{method:'POST'},false,false);login()}catch(error){message(error.message)}return}
  if(!['done','restore'].includes(action)||!ledger)return;button.disabled=true;
  try{const result=await request('/api/family/events',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:button.dataset.id,action,revision:ledger.revision})},false,false);ledger=result.data;render();message(action==='done'?'已完成':'已恢复')}
  catch(error){message(error.status===409?'事项已在其他页面更新，请刷新后重试。':error.message);button.disabled=false}
 });
 load();return {refresh:load};
}
