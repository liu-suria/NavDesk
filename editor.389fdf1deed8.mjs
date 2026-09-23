import './dialogs.589f4f3e471f.mjs';
// Desktop editing is fetched only after an explicit action.
export function install({navigation:nav,pins,icons,notify:pageMessage,openManager}){
 const $=selector=>document.querySelector(selector);
 const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const isMobileNavigation=()=>matchMedia('(max-width:650px)').matches;
 const isPinned=pins.has,pinnedLinks=pins.links;
 const savePins=urls=>{try{pins.save(urls);return true}catch{pageMessage('浏览器不允许本地存储，置顶未保存');return false}};
 const togglePin=link=>{try{pins.toggle(link);pageMessage('置顶设置已保存在本浏览器')}catch{pageMessage('浏览器不允许本地存储，置顶未保存')}};
 const markup="  <dialog id=\"quickEditor\" class=\"quick-editor\">\n    <form id=\"quickForm\">\n      <header><div><p id=\"quickCategory\"></p><h2 id=\"quickTitle\">添加网址</h2></div><button type=\"button\" data-quick-close aria-label=\"关闭\">×</button></header>\n      <label>名称<input name=\"name\" maxlength=\"80\" required autocomplete=\"off\"></label>\n      <label>网址<input name=\"url\" type=\"url\" required placeholder=\"https://\" autocomplete=\"url\"></label>\n      <label>备注<input name=\"description\" maxlength=\"160\"></label>\n      <details><summary>图标设置</summary><label>自定义图标地址<input name=\"icon\" type=\"url\" placeholder=\"留空自动获取并缓存\"></label></details>\n      <label class=\"quick-check\"><input name=\"openInNew\" type=\"checkbox\" checked>在新窗口打开</label>\n      <p id=\"quickMessage\" role=\"status\"></p><button type=\"button\" id=\"quickCompare\" hidden>查看最新值并合并</button><pre id=\"quickLatest\" hidden></pre><button type=\"button\" id=\"quickAcceptLatest\" hidden>以此版本为基础，保留我的输入</button>\n      <footer><button type=\"button\" data-quick-close>取消</button><button type=\"submit\" class=\"primary\" id=\"quickSave\">保存</button></footer>\n    </form>\n  </dialog>\n  <div id=\"linkMenu\" class=\"link-menu\" role=\"menu\" hidden><button role=\"menuitem\" data-menu=\"open\">打开</button><button role=\"menuitem\" data-menu=\"edit\">编辑</button><button role=\"menuitem\" data-menu=\"pin\">置顶 / 取消置顶</button><button role=\"menuitem\" data-menu=\"move\">移动到分类</button><button role=\"menuitem\" data-menu=\"refresh\">刷新图标</button><button role=\"menuitem\" data-menu=\"delete\" class=\"danger\">删除</button></div>\n  <dialog id=\"sortEditor\" class=\"quick-editor\"><header><div><p>调整显示顺序</p><h2 id=\"sortTitle\">排序</h2></div><button type=\"button\" id=\"sortClose\" aria-label=\"关闭排序\">×</button></header><div id=\"sortList\"></div><p id=\"sortMessage\" role=\"status\"></p><footer><button type=\"button\" id=\"sortCancel\">取消</button><button type=\"button\" class=\"primary\" id=\"sortSave\">保存排序</button></footer></dialog>\n";
 document.body.insertAdjacentHTML('beforeend',markup);
let quickEditing=null, quickBusy=false;
const quickDialog=$('#quickEditor'),quickForm=$('#quickForm');
function openQuickEditor(groupId,linkId){
  if(isMobileNavigation())return;
  const group=nav.get().groups.find(item=>item.id===groupId);
  const link=group?.links.find(item=>item.id===linkId);
  if(!group)return;
  quickEditing={groupId,linkId,original:link?JSON.stringify(link):null};
  quickForm.reset();
  for(const key of ['name','url','description','icon'])quickForm.elements[key].value=link?.[key]||'';
  quickForm.elements.openInNew.checked=link?.openInNew!==false;
  $('#quickCategory').textContent=group.name;
  $('#quickTitle').textContent=link?'编辑网址':'添加网址';
  $('#quickMessage').textContent='';$('#quickCompare').hidden=true;$('#quickLatest').hidden=true;$('#quickAcceptLatest').hidden=true;quickDialog.showModal();
}
quickDialog.addEventListener('cancel',event=>{if(quickBusy)event.preventDefault()});
document.querySelectorAll('[data-quick-close]').forEach(button=>button.onclick=()=>{if(!quickBusy)quickDialog.close()});
quickForm.onsubmit=async event=>{
  event.preventDefault();if(quickBusy)return;
  const fields=new FormData(quickForm),link={};
  for(const key of ['name','url','description','icon'])link[key]=String(fields.get(key)||'').trim();
  try{const url=new URL(link.url);if(!/^https?:$/.test(url.protocol))throw Error();link.url=url.href;if(link.icon&&new URL(link.icon).protocol!=='https:')throw Error();}
  catch{$('#quickMessage').textContent='请输入有效的网址；自定义图标需使用 HTTPS。';return}
  if(!link.name)return;
  link.openInNew=fields.has('openInNew');quickBusy=true;$('#quickSave').disabled=true;$('#quickSave').textContent='保存中…';$('#quickMessage').textContent='';
  try{
    // Merge only this link into a fresh snapshot, preserving unrelated changes from other devices.
    const fresh=await nav.read();
    const group=fresh.groups.find(item=>item.id===quickEditing.groupId);
    if(!group)throw new Error('该分类已被修改或删除，请关闭后刷新页面。');
    const canonical=value=>{const u=new URL(value);for(const k of [...u.searchParams.keys()])if(/^utm_/i.test(k)||/^(fbclid|gclid)$/i.test(k))u.searchParams.delete(k);return u.href};
    if(quickEditing.linkId){
      const index=group.links.findIndex(item=>item.id===quickEditing.linkId);
      const {mergeEditedLink}=await import('/model.093a9d3634d3.mjs');
      group.links[index]=mergeEditedLink(JSON.parse(quickEditing.original),group.links[index],link);
    }else{link.id=crypto.randomUUID();group.links.push(link)}
    const effective=group.links.find(l=>l.id===(quickEditing.linkId||link.id));
    const duplicate=fresh.groups.find(g=>g.links.some(l=>!(g.id===quickEditing.groupId&&l.id===effective.id)&&canonical(l.url)===canonical(effective.url)));
    if(duplicate)throw Error(`该网址已存在于“${duplicate.name}”，请勿重复添加`);
    await nav.save(fresh);
    if(quickEditing.original){const prior=JSON.parse(quickEditing.original);if(prior.url!==effective.url&&isPinned(prior))savePins([...new Set(pins.read().map(url=>url===prior.url?effective.url:url))])}
    quickDialog.close();icons.warm(effective);
  }catch(error){$('#quickMessage').textContent=error.status===409?'数据已更新，输入仍保留。请查看最新值后重新合并。':error.message||'保存失败，请重试。';$('#quickCompare').hidden=!quickEditing.linkId}
  finally{quickBusy=false;$('#quickSave').disabled=false;$('#quickSave').textContent='保存'}
};

const linkMenu=$('#linkMenu');let menuTarget;
function closeLinkMenu(){linkMenu.hidden=true}
function openLinkMenu(groupId,linkId,x,y,trigger){
  if(isMobileNavigation())return;
  menuTarget={groupId,linkId,trigger};linkMenu.querySelector('[data-menu=pin]').textContent=isPinned(nav.get().groups.find(g=>g.id===groupId).links.find(l=>l.id===linkId))?'取消置顶（本浏览器）':'置顶（本浏览器）';linkMenu.hidden=false;
  linkMenu.style.left=`${Math.max(8,Math.min(x,innerWidth-linkMenu.offsetWidth-8))}px`;
  linkMenu.style.top=`${Math.max(8,Math.min(y,innerHeight-linkMenu.offsetHeight-8))}px`;
  linkMenu.querySelector('button').focus();
}

linkMenu.onclick=async event=>{
  const action=event.target.closest('[data-menu]')?.dataset.menu;if(!action)return;
  const target=menuTarget,group=nav.get().groups.find(item=>item.id===target.groupId),link=group?.links.find(item=>item.id===target.linkId);closeLinkMenu();if(!link)return;
  if(action==='open'){window.open(link.url,link.openInNew?'_blank':'_self','noopener');return}
  if(action==='pin'){togglePin(link);return}
  if(action==='edit'){openQuickEditor(target.groupId,target.linkId);return}
  await openManager(action,{groupId:target.groupId,linkId:target.linkId});
};
document.addEventListener('pointerdown',event=>{if(!linkMenu.contains(event.target))closeLinkMenu()});
window.addEventListener('resize',closeLinkMenu);window.addEventListener('scroll',closeLinkMenu,true);
linkMenu.addEventListener('keydown',event=>{
  const buttons=[...linkMenu.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
  if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();buttons[(index+(event.key==='ArrowDown'?1:buttons.length-1))%buttons.length].focus()}
  if(event.key==='Escape'){closeLinkMenu();menuTarget?.trigger.focus()}
  if(event.key==='Tab')closeLinkMenu();
});
const sortDialog=$('#sortEditor');let sorting,sortBusy=false;
function openSort(groupId){
  if(isMobileNavigation())return;
  const items=groupId==='__pinned'?pinnedLinks(nav.get()).map(({group,link})=>({id:link.url,name:link.name})):nav.get().groups.find(group=>group.id===groupId)?.links;if(!items)return;
  sorting={groupId,original:items.map(item=>item.id),items:items.map(item=>({id:item.id,name:item.name}))};
  $('#sortTitle').textContent=groupId==='__pinned'?'置顶排序':'网址排序';$('#sortMessage').textContent='';drawSort();sortDialog.showModal();
}
function drawSort(){
  $('#sortList').innerHTML=sorting.items.length?sorting.items.map((item,index)=>`<div class="sort-row"><span class="sort-number">${index+1}</span><strong>${escapeHtml(item.name)}</strong><button type="button" data-move="-1" data-index="${index}" aria-label="上移${escapeHtml(item.name)}" ${index===0?'disabled':''}>↑</button><button type="button" data-move="1" data-index="${index}" aria-label="下移${escapeHtml(item.name)}" ${index===sorting.items.length-1?'disabled':''}>↓</button></div>`).join(''):'<p>该分类还没有网址。</p>';
}
$('#sortList').onclick=event=>{const button=event.target.closest('[data-move]');if(!button||sortBusy)return;const from=Number(button.dataset.index),to=from+Number(button.dataset.move);if(to<0||to>=sorting.items.length)return;[sorting.items[from],sorting.items[to]]=[sorting.items[to],sorting.items[from]];drawSort();$('#sortList').querySelectorAll('.sort-row')[to]?.querySelector(`button[data-move="${button.dataset.move}"]:not(:disabled)`)?.focus()};

$('#sortClose').onclick=$('#sortCancel').onclick=()=>{if(!sortBusy)sortDialog.close()};
sortDialog.addEventListener('cancel',event=>{if(sortBusy)event.preventDefault()});
$('#sortSave').onclick=async()=>{
  if(sortBusy)return;sortBusy=true;$('#sortSave').disabled=true;$('#sortMessage').textContent='';
  try{
    if(sorting.groupId==='__pinned'){
      if(JSON.stringify(pinnedLinks(nav.get()).map(({link})=>link.url))!==JSON.stringify(sorting.original))throw Error('本地置顶列表已变化，请重新排序');
      const hidden=pins.read().filter(url=>!sorting.original.includes(url));
      if(savePins([...sorting.items.map(item=>item.id),...hidden])){sortDialog.close();pageMessage('置顶顺序已保存在本浏览器')}return;
    }
    const fresh=await nav.read();
    const group=fresh.groups.find(item=>item.id===sorting.groupId),items=group?.links;
    if(!items||JSON.stringify(items.map(item=>item.id))!==JSON.stringify(sorting.original))throw Error('列表已在其他页面变化，请关闭后刷新再排序。');
    const mapped=new Map(items.map(item=>[item.id,item]));const ordered=sorting.items.map((item,index)=>({...mapped.get(item.id),sort:index}));
    group.links=ordered;
    await nav.save(fresh);sortDialog.close();pageMessage('排序已保存');
  }catch(error){$('#sortMessage').textContent=error.message}
  finally{sortBusy=false;$('#sortSave').disabled=false}
};


matchMedia('(max-width: 650px)').addEventListener('change',event=>{if(event.matches){closeLinkMenu();quickDialog.close();sortDialog.close()}});

$('#quickCompare').onclick=async()=>{try{const fresh=await nav.read(),current=fresh.groups.find(g=>g.id===quickEditing.groupId)?.links.find(l=>l.id===quickEditing.linkId);if(!current)throw Error('网址已被删除');$('#quickLatest').textContent=`最新名称：${current.name}\n最新网址：${current.url}\n最新备注：${current.description}\n最新图标：${current.icon||'自动'}\n新窗口打开：${current.openInNew?'是':'否'}`;$('#quickLatest').hidden=false;$('#quickAcceptLatest').hidden=false;$('#quickAcceptLatest').onclick=()=>{quickEditing.original=JSON.stringify(current);$('#quickMessage').textContent='已基于此版本重新编辑，输入未改变。请核对后保存。';$('#quickAcceptLatest').hidden=true}}catch(error){$('#quickMessage').textContent=error.message}};

 return {openQuickEditor,openLinkMenu,openSort};
}
