const $ = (selector, root = document) => root.querySelector(selector);
const app = $("#app"), loginScreen = $("#loginScreen"), navigation = $("#navigation"), categoryRail = $("#categoryRail");

function escapeHtml(value) { const element = document.createElement("span"); element.textContent = value || ""; return element.innerHTML; }
function hostname(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }
function favicon(url) { try { return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(url).hostname)}&sz=64`; } catch { return ""; } }
function formatClock() { $("#clock").textContent = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date()).replace("星期", "周"); }
function setTheme(theme) { document.documentElement.dataset.theme = theme; localStorage.setItem("navdesk-theme", theme); }

const searchUrls = {
  google: "https://www.google.com/search?q=",
  bing: "https://www.bing.com/search?q=",
  baidu: "https://www.baidu.com/s?wd=",
  duckduckgo: "https://duckduckgo.com/?q=",
};

function render(data) {
  navigation.replaceChildren();
  categoryRail.replaceChildren();
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
      const icon = link.icon || favicon(link.url);
      a.innerHTML = `<span class="site-icon">${icon ? `<img src="${escapeHtml(icon)}" alt="" onerror="this.remove()">` : "↗"}</span><span class="card-copy"><strong>${escapeHtml(link.name)}</strong><small>${escapeHtml(link.description || hostname(link.url))}</small></span><span class="arrow">↗</span>`;
      cards.append(a);
    });
    navigation.append(node);
    const jump = document.createElement("a");
    jump.href = `#${groupId}`;
    jump.title = group.name;
    jump.innerHTML = `<span style="color:${escapeHtml(group.color || "#8692ff")};background:${escapeHtml(group.color || "#8692ff")}22">${escapeHtml(group.icon || "◆")}</span><b>${escapeHtml(group.name)}</b>`;
    categoryRail.append(jump);
  });
  if (!visibleGroups) navigation.innerHTML = '<div class="empty"><span>◌</span><h2>这里还没有导航链接</h2><p>前往管理页，添加你的第一个链接。</p><a href="/admin/">打开管理页</a></div>';
}

async function request(url, options = {}) { const response = await fetch(url, { credentials: "same-origin", ...options }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`); return data; }

function showLogin(message = "") {
  app.hidden = true;
  loginScreen.hidden = false;
  $("#loginMessage").textContent = message;
}

function showNavigation(data) {
  loginScreen.hidden = true;
  app.hidden = false;
  render(data);
}

async function initialise() {
  formatClock(); setInterval(formatClock, 30_000);
  setTheme(localStorage.getItem("navdesk-theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  $("#themeButton").onclick = () => setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
  try {
    const session = await request("/api/auth/session");
    if (!session.authenticated) { showLogin(); return; }
    const data = await request("/api/navigation");
    showNavigation(data);
    document.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#searchInput").focus(); } });
  } catch { showLogin("服务暂不可用，请稍后重试。"); }
}

$("#loginForm").onsubmit = async (event) => {
  event.preventDefault();
  const button = $("button", event.currentTarget);
  button.disabled = true;
  button.innerHTML = "正在验证…";
  $("#loginMessage").textContent = "";
  try {
    await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: $("#password").value }) });
    const session = await request("/api/auth/session", { cache: "no-store" });
    if (!session.authenticated) throw new Error("登录状态没有保存成功。请确认浏览器允许此网站使用 Cookie 后重试。");
    const data = await request("/api/navigation", { cache: "no-store" });
    showNavigation(data);
  } catch (error) {
    $("#loginMessage").textContent = error.message || "登录失败，请稍后重试。";
  } finally {
    button.disabled = false;
    button.innerHTML = "进入 NavDesk <span>→</span>";
  }
};

$("#webSearchForm").onsubmit = (event) => {
  event.preventDefault();
  const query = $("#searchInput").value.trim();
  if (!query) return $("#searchInput").focus();
  const engine = $("#searchEngine").value;
  localStorage.setItem("navdesk-search-engine", engine);
  window.open(`${searchUrls[engine] || searchUrls.google}${encodeURIComponent(query)}`, "_blank", "noopener");
};
$("#searchEngine").value = localStorage.getItem("navdesk-search-engine") || "google";
initialise();
