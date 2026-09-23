const $ = (selector, root = document) => root.querySelector(selector);
const app = $("#app"), loginScreen = $("#loginScreen"), navigation = $("#navigation"), categoryRail = $("#categoryRail");
const bootScreen = $("#bootScreen");
const { read, write, request } = window.navdeskBoot;
const clockFormat = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char])); }
function hostname(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }
function formatClock() { $("#clock").textContent = clockFormat.format(new Date()).replace("星期", "周"); }
function setTheme(theme) { document.documentElement.dataset.theme = theme; write("navdesk-theme", theme); }

const searchUrls = {
  google: "https://www.google.com/search?q=",
  bing: "https://www.bing.com/search?q=",
  baidu: "https://www.baidu.com/s?wd=",
  duckduckgo: "https://duckduckgo.com/?q=",
};

function setBrand(settings = {}) {
  const name = String(settings.brandName || "NavDesk").trim() || "NavDesk";
  const mark = [...name][0]?.toUpperCase() || "N";
  document.title = `${name} · 个人导航`;
  $("#brandName").textContent = name;
  const loginBrandName = $("#loginBrandName");
  if (loginBrandName) loginBrandName.textContent = name;
  $("#brandMark").textContent = mark;
  $("#loginBrandMark").textContent = mark;
}

let navigationData;
function render(data) {
  navigationData=data;
  const groupFragment = document.createDocumentFragment();
  const railFragment = document.createDocumentFragment();
  let visibleGroups = 0;
  data.groups.forEach((group) => {
    const links = group.links;

    visibleGroups += 1;
    const node = $("#groupTemplate").content.firstElementChild.cloneNode(true);
    const groupId = `group-${group.id || visibleGroups}`;
    node.id = groupId;
    $(".group-icon", node).textContent = group.icon || "◆";
    $(".group-icon", node).style.background = `${group.color}22`;
    $(".group-icon", node).style.color = group.color;
    $("h2", node).textContent = group.name; $(".count", node).textContent = String(links.length).padStart(2, "0");
    $(".group-sort",node).onclick=()=>openSort(group.id);
    $(".group-add",node).onclick=()=>openQuickEditor(group.id);
    $(".group-add",node).setAttribute("aria-label",`添加网址到${group.name}`);
    const cards = $(".cards", node);
    links.forEach((link) => {
      const a = document.createElement("a"); a.className = "nav-card"; a.href = link.url; a.target = link.openInNew ? "_blank" : "_self"; a.rel = "noreferrer";
      const icon = window.navdeskIcons.source(link);
      a.innerHTML = `<span class="site-icon" data-icon="${escapeHtml(icon)}"><span class="icon-fallback">${escapeHtml([...link.name][0]?.toUpperCase() || "↗")}</span></span><span class="card-copy"><strong>${escapeHtml(link.name)}</strong><small>${escapeHtml(link.description || hostname(link.url))}</small></span>`;
      a.addEventListener('contextmenu',event=>{if(isMobileNavigation())return;event.preventDefault();openLinkMenu(group.id,link.id,event.clientX,event.clientY,a)});
      const tile=document.createElement('div');tile.className='nav-tile';tile.append(a);
      const edit=document.createElement('button');edit.className='card-edit';edit.type='button';edit.textContent='⋯';edit.setAttribute('aria-label',`${link.name}的操作菜单`);edit.setAttribute("aria-haspopup","menu");edit.onclick=()=>{const box=edit.getBoundingClientRect();openLinkMenu(group.id,link.id,box.left,box.bottom,edit)};tile.append(edit);
      cards.append(tile);
    });
    groupFragment.append(node);
    const jump = document.createElement("a");
    jump.href = `#${groupId}`;
    jump.title = group.name;
    jump.innerHTML = `<span style="color:${escapeHtml(group.color || "#8692ff")};background:${escapeHtml(group.color || "#8692ff")}22">${escapeHtml(group.icon || "◆")}</span><b>${escapeHtml(group.name)}</b>`;
    railFragment.append(jump);
  });
  navigation.replaceChildren(groupFragment);
  categoryRail.replaceChildren(railFragment);
  window.navdeskIcons.schedule(navigation);
  if (!visibleGroups) navigation.innerHTML = '<div class="empty"><span>◌</span><h2>这里还没有导航链接</h2><p>前往管理页，添加你的第一个链接。</p><a href="/admin/">打开管理页</a></div>';
}

function showLogin(message = "") {
  app.hidden = true;
  loginScreen.hidden = false;
  $("#loginMessage").textContent = message;
  performance.mark("navdesk-login-ready");
}

function showNavigation(data) {
  loginScreen.hidden = true;
  app.hidden = false;
  bootScreen.hidden = true;
  setBrand(data.settings);
  render(data);
  performance.mark("navdesk-content-ready");
}

async function initialise(first = false) {
  bootScreen.hidden = false;
  $("#retryButton").hidden = true;
  $("#bootMessage").textContent = "正在打开导航…";
  try {
    const result = first ? await window.navdeskBoot.navigation : { data: await request("/api/navigation") };
    if (result.error) throw result.error;
    showNavigation(result.data);
  } catch (error) {
    if (error.status === 401) { showLogin(); return; }
    $("#bootMessage").textContent = "暂时无法读取导航，请检查网络后重试。";
    $("#retryButton").hidden = false;
  }
}

formatClock();
setInterval(() => { if (!document.hidden) formatClock(); }, 60_000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) formatClock(); });
$("#themeButton").onclick = () => setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
$("#retryButton").onclick = () => initialise();
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#searchInput").focus(); }
});

$("#loginForm").onsubmit = async (event) => {
  event.preventDefault();
  const button = $("button", event.currentTarget);
  button.disabled = true;
  button.innerHTML = "正在验证…";
  $("#loginMessage").textContent = "";
  try {
    await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: $("#password").value }) });
    const data = await request("/api/navigation", { cache: "no-store" });
    $("#password").value = "";
    showNavigation(data);
  } catch (error) {
    $("#loginMessage").textContent = error.message || "登录失败，请稍后重试。";
  } finally {
    button.disabled = false;
    button.innerHTML = `进入 <span id="loginBrandName">${escapeHtml($("#brandName").textContent)}</span> <span>→</span>`;
  }
};

$("#webSearchForm").onsubmit = (event) => {
  event.preventDefault();
  const query = $("#searchInput").value.trim();
  if (!query) return $("#searchInput").focus();
  const engine = $("#searchEngine").value;
  write("navdesk-search-engine", engine);
  window.open(`${searchUrls[engine] || searchUrls.google}${encodeURIComponent(query)}`, "_blank", "noopener");
};
$("#searchEngine").value = read("navdesk-search-engine") || "google";
performance.mark("navdesk-shell-ready");
initialise(true);

let quickEditing=null, quickBusy=false;
const quickDialog=$('#quickEditor'),quickForm=$('#quickForm');
function openQuickEditor(groupId,linkId){
  if(isMobileNavigation())return;
  const group=navigationData.groups.find(item=>item.id===groupId);
  const link=group?.links.find(item=>item.id===linkId);
  if(!group)return;
  quickEditing={groupId,linkId,original:link?JSON.stringify(link):null};
  quickForm.reset();
  for(const key of ['name','url','description','icon'])quickForm.elements[key].value=link?.[key]||'';
  quickForm.elements.openInNew.checked=link?.openInNew!==false;
  $('#quickCategory').textContent=group.name;
  $('#quickTitle').textContent=link?'编辑网址':'添加网址';
  $('#quickMessage').textContent='';quickDialog.showModal();
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
    const fresh=await request('/api/navigation');
    const group=fresh.groups.find(item=>item.id===quickEditing.groupId);
    if(!group)throw new Error('该分类已被修改或删除，请关闭后刷新页面。');
    if(quickEditing.linkId){
      const index=group.links.findIndex(item=>item.id===quickEditing.linkId);
      if(index<0||JSON.stringify(group.links[index])!==quickEditing.original)throw new Error('该网址已在其他页面修改，请刷新后重新编辑。');
      group.links[index]={...group.links[index],...link};
    }else{link.id=crypto.randomUUID();group.links.push(link)}
    const saved=await request('/api/navigation',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(fresh)});
    showNavigation(saved);quickDialog.close();window.navdeskIcons.warm(link);
  }catch(error){$('#quickMessage').textContent=error.message||'保存失败，请重试。'}
  finally{quickBusy=false;$('#quickSave').disabled=false;$('#quickSave').textContent='保存'}
};

const linkMenu=$('#linkMenu');let menuTarget;
function closeLinkMenu(){linkMenu.hidden=true}
function openLinkMenu(groupId,linkId,x,y,trigger){
  if(isMobileNavigation())return;
  menuTarget={groupId,linkId,trigger};linkMenu.hidden=false;
  linkMenu.style.left=`${Math.max(8,Math.min(x,innerWidth-linkMenu.offsetWidth-8))}px`;
  linkMenu.style.top=`${Math.max(8,Math.min(y,innerHeight-linkMenu.offsetHeight-8))}px`;
  linkMenu.querySelector('button').focus();
}
function pageMessage(message){$('#pageMessage').textContent=message;$('#pageMessage').hidden=false;clearTimeout(pageMessage.timer);pageMessage.timer=setTimeout(()=>$('#pageMessage').hidden=true,5000)}
async function persistNavigation(value){return request('/api/navigation',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)})}
linkMenu.onclick=async event=>{
  const action=event.target.closest('[data-menu]')?.dataset.menu;if(!action)return;
  const target=menuTarget,group=navigationData.groups.find(item=>item.id===target.groupId),link=group?.links.find(item=>item.id===target.linkId);closeLinkMenu();if(!link)return;
  if(action==='open'){window.open(link.url,link.openInNew?'_blank':'_self','noopener');return}
  if(action==='edit'){openQuickEditor(target.groupId,target.linkId);return}
  if(!confirm(`删除“${link.name}”？此操作会同步到其他设备。`))return;
  try{
    const fresh=await request('/api/navigation'),current=fresh.groups.find(item=>item.id===target.groupId),index=current?.links.findIndex(item=>item.id===target.linkId);
    if(index===undefined||index<0||JSON.stringify(current.links[index])!==JSON.stringify(link))throw Error('该网址已变化，请刷新后再操作。');
    current.links.splice(index,1);showNavigation(await persistNavigation(fresh));pageMessage('网址已删除');
  }catch(error){pageMessage(error.message)}
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
  const items=groupId?navigationData.groups.find(group=>group.id===groupId)?.links:navigationData.groups;if(!items)return;
  sorting={groupId,original:items.map(item=>item.id),items:items.map(item=>({id:item.id,name:item.name}))};
  $('#sortTitle').textContent=groupId?'网址排序':'分类排序';$('#sortMessage').textContent='';drawSort();sortDialog.showModal();
}
function drawSort(){
  $('#sortList').innerHTML=sorting.items.length?sorting.items.map((item,index)=>`<div class="sort-row"><span class="sort-number">${index+1}</span><strong>${escapeHtml(item.name)}</strong><button type="button" data-move="-1" data-index="${index}" aria-label="上移${escapeHtml(item.name)}" ${index===0?'disabled':''}>↑</button><button type="button" data-move="1" data-index="${index}" aria-label="下移${escapeHtml(item.name)}" ${index===sorting.items.length-1?'disabled':''}>↓</button></div>`).join(''):'<p>该分类还没有网址。</p>';
}
$('#sortList').onclick=event=>{const button=event.target.closest('[data-move]');if(!button||sortBusy)return;const from=Number(button.dataset.index),to=from+Number(button.dataset.move);if(to<0||to>=sorting.items.length)return;[sorting.items[from],sorting.items[to]]=[sorting.items[to],sorting.items[from]];drawSort();$('#sortList').querySelectorAll('.sort-row')[to]?.querySelector(`button[data-move="${button.dataset.move}"]:not(:disabled)`)?.focus()};
$('#sortGroups').onclick=()=>openSort();
$('#sortClose').onclick=$('#sortCancel').onclick=()=>{if(!sortBusy)sortDialog.close()};
sortDialog.addEventListener('cancel',event=>{if(sortBusy)event.preventDefault()});
$('#sortSave').onclick=async()=>{
  if(sortBusy)return;sortBusy=true;$('#sortSave').disabled=true;$('#sortMessage').textContent='';
  try{
    const fresh=await request('/api/navigation'),group=sorting.groupId?fresh.groups.find(item=>item.id===sorting.groupId):null,items=sorting.groupId?group?.links:fresh.groups;
    if(!items||JSON.stringify(items.map(item=>item.id))!==JSON.stringify(sorting.original))throw Error('列表已在其他页面变化，请关闭后刷新再排序。');
    const mapped=new Map(items.map(item=>[item.id,item]));const ordered=sorting.items.map((item,index)=>({...mapped.get(item.id),sort:index}));
    if(group)group.links=ordered;else fresh.groups=ordered;
    showNavigation(await persistNavigation(fresh));sortDialog.close();pageMessage('排序已保存');
  }catch(error){$('#sortMessage').textContent=error.message}
  finally{sortBusy=false;$('#sortSave').disabled=false}
};

function isMobileNavigation(){return matchMedia('(max-width: 650px)').matches}
matchMedia('(max-width: 650px)').addEventListener('change',event=>{if(event.matches){closeLinkMenu();quickDialog.close();sortDialog.close()}});
