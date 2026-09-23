const $ = (selector, root = document) => root.querySelector(selector);
const app = $("#app"), loginScreen = $("#loginScreen"), navigation = $("#navigation"), categoryRail = $("#categoryRail");
const bootScreen = $("#bootScreen");
const { read, write, request } = window.navdeskBoot;
const clockDateFormat = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" });
const clockTimeFormat = new Intl.DateTimeFormat("zh-CN", { weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char])); }
function hostname(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }
let lunarDateKey='',lunarFormatter;
try{const candidate=new Intl.DateTimeFormat('zh-CN-u-ca-chinese',{month:'long',day:'numeric'});if(candidate.resolvedOptions().calendar==='chinese')lunarFormatter=candidate}catch{}
function formatLunar(now){
  if(!lunarFormatter)return '';
  const parts=lunarFormatter.formatToParts(now),month=parts.find(p=>p.type==='month')?.value,day=Number(parts.find(p=>p.type==='day')?.value);
  if(!month||!day)return '';
  const digits='一二三四五六七八九十',dayName=day<=10?'初'+digits[day-1]:day<20?'十'+digits[day-11]:day===20?'二十':day<30?'廿'+digits[day-21]:'三十';
  return '农历:'+month+dayName;
}
function formatClock() {
  const now=new Date(),parts=clockTimeFormat.formatToParts(now);
  const part=type=>parts.find(item=>item.type===type)?.value||'';
  const weekday=part('weekday').replace('星期','周');
  $('#clockDate').textContent=clockDateFormat.format(now);
  $('#clockTime').textContent=part('hour')+':'+part('minute')+':'+part('second');
  $('#clock').dateTime=now.toISOString();
  const key=now.toDateString();if(key!==lunarDateKey){$('#clockLunar').textContent=formatLunar(now)+'['+weekday+']';lunarDateKey=key}
}
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
  const loginBrandName = $("#loginBrandName");
  if (loginBrandName) loginBrandName.textContent = name;
  $("#loginBrandMark").textContent = mark;
}

function createTile(group,link){
      const a = document.createElement("a"); a.className = "nav-card"; a.href = link.url; a.target = link.openInNew ? "_blank" : "_self"; a.rel = "noreferrer";
      const icon = window.navdeskIcons.source(link);
      a.innerHTML = `<span class="site-icon" data-icon="${escapeHtml(icon)}"><span class="icon-fallback">${escapeHtml([...link.name][0]?.toUpperCase() || "↗")}</span></span><span class="card-copy"><strong>${escapeHtml(link.name)}</strong><small>${escapeHtml(link.description || hostname(link.url))}</small></span>`;
      a.addEventListener('contextmenu',event=>{if(isMobileNavigation())return;event.preventDefault();runEditor('openLinkMenu',group.id,link.id,event.clientX,event.clientY,a)});
      const tile=document.createElement('div');tile.className='nav-tile';tile.dataset.name=link.name;tile.dataset.search=[link.name,link.url,link.description||'',group.name].join(' ').toLowerCase();tile.append(a);
      const edit=document.createElement('button');edit.className='card-edit';edit.type='button';edit.textContent='⋯';edit.setAttribute('aria-label',`${link.name}的操作菜单`);edit.setAttribute("aria-haspopup","menu");edit.onclick=()=>{const box=edit.getBoundingClientRect();runEditor('openLinkMenu',group.id,link.id,box.left,box.bottom,edit)};tile.append(edit);
return tile;
}
let navigationData;
const pinPort=createPinPort({storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},onChange:()=>{if(navigationData)render(navigationData)}});
window.addEventListener('storage',event=>{if(event.key===pinPort.key||event.key===null){if(navigationData)render(navigationData)}});
function render(data) {
  const existing=new Map([...navigation.querySelectorAll('.nav-group')].map(n=>[n.id,n]));
  navigationData=data;
  const groupFragment = document.createDocumentFragment();
  const railFragment = document.createDocumentFragment();
  let visibleGroups = 0;
  data.groups.forEach((group) => {
    const links = group.links;

    visibleGroups += 1;
    const groupId = `group-${group.id || visibleGroups}`;
    const fingerprint=JSON.stringify([group.id,group.name,group.icon,group.color,links.map(link=>({...link,sort:undefined,iconSource:window.navdeskIcons.source(link)}))]);
    const previous=existing.get(groupId),reuse=previous?.__fingerprint===fingerprint;
    const node = reuse?previous:$("#groupTemplate").content.firstElementChild.cloneNode(true);
    if(!reuse){node.__fingerprint=fingerprint;
    node.id = groupId;
    $(".group-icon", node).textContent = group.icon || "◆";
    $(".group-icon", node).style.background = `${group.color}22`;
    $(".group-icon", node).style.color = group.color;
    $("h2", node).textContent = group.name; $(".count", node).textContent = String(links.length).padStart(2, "0");
    $(".group-sort",node).onclick=()=>runEditor('openSort',group.id);
    $(".group-add",node).onclick=()=>runEditor('openQuickEditor',group.id);
    $(".group-add",node).setAttribute("aria-label",`添加网址到${group.name}`);
    const cards = $(".cards", node);
    links.forEach(link=>cards.append(createTile(group,link)));
    const heading=$('h2',node);heading.tabIndex=0;heading.setAttribute('role','button');heading.setAttribute('aria-label',`展开或折叠${group.name}`);heading.onclick=()=>toggleCollapsed(group.id);heading.onkeydown=event=>{if(isMobileNavigation()&&['Enter',' '].includes(event.key)){event.preventDefault();toggleCollapsed(group.id)}};
    }
    node.dataset.groupId=group.id;groupFragment.append(node);
    const jump = document.createElement("a");
    jump.href = `#${groupId}`;
    jump.title = group.name;
    jump.innerHTML = `<span style="color:${escapeHtml(group.color || "#8692ff")};background:${escapeHtml(group.color || "#8692ff")}22">${escapeHtml(group.icon || "◆")}</span><b>${escapeHtml(group.name)}</b>`;
    railFragment.append(jump);
  });
  navigation.replaceChildren(groupFragment);
  categoryRail.replaceChildren(railFragment);
  const pins=pinnedLinks(data);
  const pinFingerprint=JSON.stringify(pins.map(({group,link})=>[group.id,link,window.navdeskIcons.source(link)]));if($('#pinnedCards').__fingerprint!==pinFingerprint){$('#pinnedCards').replaceChildren(...pins.map(({group,link})=>createTile(group,link)));$('#pinnedCards').__fingerprint=pinFingerprint}
  $('#pinnedSection').hidden=!pins.length;
  $('#pinnedCount').textContent=String(pins.length).padStart(2,'0');
  if(pins.length){const jump=document.createElement('a');jump.href='#pinnedSection';jump.title='常用置顶 · 保存在本浏览器';jump.innerHTML='<span>★</span><b>常用置顶</b>';categoryRail.prepend(jump)}
  filterLocal();
  window.navdeskIcons.schedule(app);
  if(!visibleGroups){navigation.innerHTML='<div class="empty"><h2>还没有分类</h2><p>电脑端创建分类后即可添加网址。</p><button class="primary desktop-only" id="createFirstCategory">创建分类</button></div>';$('#createFirstCategory').onclick=()=>openNavManager('categories')}
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
    const result = first ? await window.navdeskBoot.navigation : { data: await request("/api/navigation?view=list") };
    if (result.error) throw result.error;
    showNavigation(result.data);
  } catch (error) {
    if (error.status === 401) { showLogin(); return; }
    $("#bootMessage").textContent = "暂时无法读取导航，请检查网络后重试。";
    $("#retryButton").hidden = false;
  }
}

formatClock();
setInterval(() => { if (!document.hidden) formatClock(); }, 1000);
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
    const data = await request("/api/navigation?view=list", { cache: "no-store" });
    $("#password").value = "";
    showNavigation(data);
  } catch (error) {
    $("#loginMessage").textContent = error.message || "登录失败，请稍后重试。";
  } finally {
    button.disabled = false;
    button.innerHTML = `进入 <span id="loginBrandName">${escapeHtml(navigationData?.settings?.brandName||"NavDesk")}</span> <span>→</span>`;
  }
};

function searchWeb(){
 const query=$('#searchInput').value.trim();if(!query)return $('#searchInput').focus();
 const engine=$('#searchEngine').value;write('navdesk-search-engine',engine);window.open(`${searchUrls[engine]||searchUrls.google}${encodeURIComponent(query)}`,'_blank','noopener');
}
function highlightName(tile,terms){
 const node=$('strong',tile),name=tile.dataset.name;if(node.__query===terms.join(' '))return;node.__query=terms.join(' ');if(!terms.length&&node.textContent===name)return;node.replaceChildren();
 const lower=name.toLowerCase(),positions=new Set();for(const term of terms){let at=lower.indexOf(term);while(at>=0){for(let i=at;i<at+term.length;i++)positions.add(i);at=lower.indexOf(term,at+term.length)}}
 let start=0;while(start<name.length){const marked=positions.has(start);let end=start+1;while(end<name.length&&positions.has(end)===marked)end++;const text=name.slice(start,end);if(marked){const mark=document.createElement('mark');mark.textContent=text;node.append(mark)}else node.append(document.createTextNode(text));start=end}
}
function filterLocal(){
 const terms=[...new Set($('#searchInput').value.trim().toLowerCase().split(/\s+/).filter(Boolean))];
 document.querySelectorAll('.nav-tile').forEach(tile=>{tile.hidden=!terms.every(term=>tile.dataset.search.includes(term));highlightName(tile,terms)});
 let count=0;navigation.querySelectorAll('.nav-group').forEach(group=>{const visible=group.querySelectorAll('.nav-tile:not([hidden])').length;count+=visible;group.hidden=!!terms.length&&!visible;const collapsed=isMobileNavigation()&&!terms.length&&collapsedGroups.has(group.dataset.groupId);$('.cards',group).hidden=collapsed;$('h2',group).setAttribute('aria-expanded',String(!collapsed));group.classList.toggle('is-collapsed',collapsed)});
 $('#pinnedSection').hidden=!$('#pinnedCards .nav-tile:not([hidden])');
 $('#localSearchStatus').hidden=!terms.length;$('#localSearchCount').textContent=`找到 ${count} 个网址`;
}
const collapsedGroups=new Set((()=>{try{const value=JSON.parse(read('navdesk-collapsed-groups','[]'));return Array.isArray(value)?value:[]}catch{return []}})());
function toggleCollapsed(id){if(!isMobileNavigation())return;if(collapsedGroups.has(id))collapsedGroups.delete(id);else collapsedGroups.add(id);write('navdesk-collapsed-groups',JSON.stringify([...collapsedGroups]));filterLocal()}
matchMedia('(max-width:650px)').addEventListener('change',()=>{if(navigationData)filterLocal()});
$('#searchInput').addEventListener('input',filterLocal);
$('#clearLocalSearch').onclick=()=>{$('#searchInput').value='';filterLocal();$('#searchInput').focus()};
$('#searchWeb').onclick=searchWeb;
$('#webSearchForm').onsubmit=event=>{event.preventDefault();filterLocal()};
const pinnedLinks=pinPort.links;
const navigationPort=createNavigationPort({get:()=>navigationData,show:showNavigation,request});
const services={navigation:navigationPort,pins:pinPort,icons:window.navdeskIcons,notify:pageMessage};
const openNavManager=createManagerLoader(services);
$('#manageNav').onclick=()=>openNavManager('batch');
$("#searchEngine").value = read("navdesk-search-engine") || "google";
performance.mark("navdesk-shell-ready");
initialise(true);

function pageMessage(message){$('#pageMessage').textContent=message;$('#pageMessage').hidden=false;clearTimeout(pageMessage.timer);pageMessage.timer=setTimeout(()=>$('#pageMessage').hidden=true,5000)}
function isMobileNavigation(){return matchMedia('(max-width:650px)').matches}
let editorPromise;
async function runEditor(action,...args){
 if(isMobileNavigation())return;
 try{
  editorPromise ||= import('/__EDITOR_URL__').then(module=>module.install({...services,openManager:openNavManager})).catch(error=>{editorPromise=null;throw error});
  const editor=await editorPromise;if(!isMobileNavigation())editor[action](...args);
 }catch{pageMessage('编辑工具加载失败，请重试')}
}
$('#sortGroups').onclick=()=>openNavManager('categories');
$('#sortPinned').onclick=()=>runEditor('openSort','__pinned');
$('#calendarButton').onclick=async()=>{const button=$('#calendarButton');button.disabled=true;try{const calendar=await import('/__CALENDAR_URL__');calendar.open()}catch{pageMessage('日历加载失败，请稍后重试')}finally{button.disabled=false}};

const backTop=$('#backToTop');window.addEventListener('scroll',()=>{backTop.hidden=scrollY<500},{passive:true});backTop.onclick=()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
