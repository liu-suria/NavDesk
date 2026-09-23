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

function render(data) {
  const groupFragment = document.createDocumentFragment();
  const railFragment = document.createDocumentFragment();
  let visibleGroups = 0;
  data.groups.forEach((group) => {
    const links = group.links;
    if (!links.length) return;
    visibleGroups += 1;
    const node = $("#groupTemplate").content.firstElementChild.cloneNode(true);
    const groupId = `group-${group.id || visibleGroups}`;
    node.id = groupId;
    $(".group-icon", node).textContent = group.icon || "◆";
    $(".group-icon", node).style.background = `${group.color}22`;
    $(".group-icon", node).style.color = group.color;
    $("h2", node).textContent = group.name; $(".count", node).textContent = String(links.length).padStart(2, "0");
    const cards = $(".cards", node);
    links.forEach((link) => {
      const a = document.createElement("a"); a.className = "nav-card"; a.href = link.url; a.target = link.openInNew ? "_blank" : "_self"; a.rel = "noreferrer";
      const icon = link.icon;
      a.innerHTML = `<span class="site-icon">${escapeHtml([...link.name][0]?.toUpperCase() || "↗")}${icon ? `<img src="${escapeHtml(icon)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}</span><span class="card-copy"><strong>${escapeHtml(link.name)}</strong><small>${escapeHtml(link.description || hostname(link.url))}</small></span><span class="arrow">↗</span>`;
      cards.append(a);
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
