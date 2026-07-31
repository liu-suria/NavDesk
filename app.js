const $ = (selector, root = document) => root.querySelector(selector);
const app = $("#app"), loginScreen = $("#loginScreen"), navigation = $("#navigation");

function escapeHtml(value) { const element = document.createElement("span"); element.textContent = value || ""; return element.innerHTML; }
function hostname(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }
function favicon(url) { try { return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(url).hostname)}&sz=64`; } catch { return ""; } }
function formatClock() { $("#clock").textContent = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date()).replace("星期", "周"); }
function setTheme(theme) { document.documentElement.dataset.theme = theme; localStorage.setItem("navdesk-theme", theme); }

function render(data, query = "") {
  navigation.replaceChildren();
  const text = query.toLowerCase().trim(); let visibleGroups = 0;
  data.groups.forEach((group) => {
    const links = group.links.filter((link) => !text || [link.name, link.description, link.url].join(" ").toLowerCase().includes(text));
    if (!links.length) return;
    visibleGroups += 1;
    const node = $("#groupTemplate").content.firstElementChild.cloneNode(true);
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
  });
  if (!visibleGroups) navigation.innerHTML = `<div class="empty"><span>◌</span><h2>${text ? "没有找到匹配的入口" : "这里还没有导航链接"}</h2><p>${text ? "换个关键词试试。" : "前往管理页，添加你的第一个链接。"}</p>${text ? "" : '<a href="/admin/">打开管理页</a>'}</div>`;
}

async function request(url, options) { const response = await fetch(url, options); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`); return data; }

async function initialise() {
  formatClock(); setInterval(formatClock, 30_000);
  setTheme(localStorage.getItem("navdesk-theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  $("#themeButton").onclick = () => setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
  try {
    const session = await request("/api/auth/session");
    if (!session.authenticated) { loginScreen.hidden = false; return; }
    const data = await request("/api/navigation"); app.hidden = false;
    render(data); $("#searchInput").oninput = (event) => render(data, event.target.value);
    document.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#searchInput").focus(); } });
  } catch { loginScreen.hidden = false; $("#loginMessage").textContent = "服务暂不可用，请稍后重试。"; }
}

$("#loginForm").onsubmit = async (event) => { event.preventDefault(); const button = $("button", event.currentTarget); button.disabled = true; $("#loginMessage").textContent = ""; try { await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: $("#password").value }) }); location.reload(); } catch (error) { $("#loginMessage").textContent = error.message; } finally { button.disabled = false; } };
initialise();
