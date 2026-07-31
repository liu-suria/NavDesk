const $ = (selector, root = document) => root.querySelector(selector);
let data = { version: 1, groups: [] };
let editorState = null;
const groupsRoot = $("#groups"), dialog = $("#editor"), fields = $("#editorFields");

function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function escapeHtml(value) { const node = document.createElement("span"); node.textContent = value || ""; return node.innerHTML; }
function domain(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }
function favicon(url) { try { return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(url).hostname)}&sz=64`; } catch { return ""; } }
async function request(url, options = {}) { const response = await fetch(url, { credentials: "same-origin", ...options }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || `请求失败 (${response.status})`); return body; }
function setTheme(theme) { document.documentElement.dataset.theme = theme; localStorage.setItem("navdesk-theme", theme); }

async function save() {
  const button = $("#saveButton"); if (button) { button.disabled = true; button.textContent = "保存中…"; }
  try { data = await request("/api/navigation", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); render(); }
  catch (error) { alert(error.message); }
  finally { if (button) { button.disabled = false; button.textContent = "保存"; } }
}

function render() {
  groupsRoot.replaceChildren(); const links = data.groups.reduce((total, group) => total + group.links.length, 0);
  $("#summary").textContent = `${data.groups.length} 个分组 · ${links} 个链接`;
  if (!data.groups.length) { groupsRoot.innerHTML = '<section class="empty-admin"><h2>从一个分组开始</h2><p>例如：常用、服务器、开发、AI 或家庭。</p><button class="primary" id="emptyAddGroup">+ 新建分组</button></section>'; $("#emptyAddGroup").onclick = () => openGroup(); return; }
  data.groups.forEach((group, groupIndex) => {
    const node = $("#groupTemplate").content.firstElementChild.cloneNode(true);
    $(".group-icon", node).textContent = group.icon || "◆"; $(".group-icon", node).style.color = group.color; $(".group-icon", node).style.background = `${group.color}22`;
    $(".group-name", node).textContent = group.name; $(".link-count", node).textContent = `${group.links.length} 项`;
    node.querySelectorAll("[data-action]").forEach((button) => button.onclick = () => groupAction(button.dataset.action, groupIndex));
    const rows = $(".link-rows", node);
    group.links.forEach((link, linkIndex) => {
      const row = $("#linkTemplate").content.firstElementChild.cloneNode(true);
      const icon = link.icon || favicon(link.url); $(".site-icon", row).innerHTML = icon ? `<img src="${escapeHtml(icon)}" alt="" onerror="this.remove()">` : "↗";
      $(".link-name strong", row).textContent = link.name; const linkUrl = $(".link-url", row); linkUrl.href = link.url; linkUrl.textContent = domain(link.url); $(".link-description", row).textContent = link.description || "—";
      row.querySelectorAll("[data-action]").forEach((button) => button.onclick = () => linkAction(button.dataset.action, groupIndex, linkIndex)); rows.append(row);
    });
    groupsRoot.append(node);
  });
}

function move(list, from, delta) { const to = from + delta; if (to < 0 || to >= list.length) return false; [list[from], list[to]] = [list[to], list[from]]; return true; }
function groupAction(action, groupIndex) {
  const group = data.groups[groupIndex];
  if (action === "add-link") return openLink(groupIndex);
  if (action === "edit-group") return openGroup(groupIndex);
  if (action === "remove-group") { if (!confirm(`删除“${group.name}”及其中 ${group.links.length} 个链接？`)) return; data.groups.splice(groupIndex, 1); return save(); }
  if (action === "move-up" && move(data.groups, groupIndex, -1)) return save();
  if (action === "move-down" && move(data.groups, groupIndex, 1)) return save();
}
function linkAction(action, groupIndex, linkIndex) {
  const links = data.groups[groupIndex].links;
  if (action === "edit-link") return openLink(groupIndex, linkIndex);
  if (action === "remove-link") { if (!confirm(`删除“${links[linkIndex].name}”？`)) return; links.splice(linkIndex, 1); return save(); }
  if (action === "move-link-up" && move(links, linkIndex, -1)) return save();
  if (action === "move-link-down" && move(links, linkIndex, 1)) return save();
}

function showModal(type, editing) {
  editorState = { type, ...editing }; $("#modalEyebrow").textContent = `${editing.index === undefined ? "NEW" : "EDIT"} ${type === "group" ? "GROUP" : "LINK"}`;
  $("#modalTitle").textContent = `${editing.index === undefined ? "新建" : "编辑"}${type === "group" ? "分组" : "链接"}`;
  dialog.showModal();
}
function input(label, name, value = "", options = {}) { return `<div class="field ${options.className || ""}"><label for="field-${name}">${label}</label>${options.textarea ? `<textarea id="field-${name}" name="${name}" placeholder="${options.placeholder || ""}">${escapeHtml(value)}</textarea>` : `<input id="field-${name}" name="${name}" value="${escapeHtml(value)}" ${options.required ? "required" : ""} ${options.type ? `type="${options.type}"` : ""} placeholder="${options.placeholder || ""}" />`}${options.hint ? `<span class="hint">${options.hint}</span>` : ""}</div>`; }
function openGroup(index) {
  const group = index === undefined ? { name: "", icon: "", color: "#6d7cff" } : data.groups[index];
  fields.innerHTML = `<div class="fields">${input("分组名称", "name", group.name, { required: true, placeholder: "例如：开发工具" })}<div class="two-fields">${input("图标（可选）", "icon", group.icon, { placeholder: "例如：◈" })}<div class="field"><label for="field-color">主题色</label><input id="field-color" name="color" type="color" value="${escapeHtml(group.color || "#6d7cff")}" /></div></div></div>`;
  showModal("group", { index });
}
function openLink(groupIndex, index) {
  const link = index === undefined ? { name: "", url: "", description: "", icon: "", openInNew: true } : data.groups[groupIndex].links[index];
  fields.innerHTML = `<div class="fields link-fields"><div class="form-intro"><strong>链接信息</strong><span>填写名称和网址即可，图标会自动获取。</span></div><div class="two-fields">${input("名称", "name", link.name, { required: true, placeholder: "例如：ChatGPT" })}${input("网址", "url", link.url, { required: true, type: "url", placeholder: "https://…" })}</div>${input("备注（可选）", "description", link.description, { textarea: true, placeholder: "一句话说明这个入口" })}<details class="advanced-fields"><summary>更多设置</summary><div>${input("自定义图标地址（可选）", "icon", link.icon, { type: "url", placeholder: "留空将自动显示站点图标" })}</div></details><label class="checkbox"><input name="openInNew" type="checkbox" ${link.openInNew !== false ? "checked" : ""} /> 在新窗口打开</label></div>`;
  showModal("link", { groupIndex, index });
}

$("#editorForm").onsubmit = async (event) => {
  event.preventDefault(); if (event.submitter?.value === "cancel") return dialog.close(); const form = new FormData(event.currentTarget);
  if (editorState.type === "group") {
    const group = { id: editorState.index === undefined ? uid() : data.groups[editorState.index].id, name: String(form.get("name") || "").trim(), icon: String(form.get("icon") || "").trim(), color: String(form.get("color") || "#6d7cff"), links: editorState.index === undefined ? [] : data.groups[editorState.index].links };
    if (!group.name) return; editorState.index === undefined ? data.groups.push(group) : data.groups.splice(editorState.index, 1, group);
  } else {
    const link = { id: editorState.index === undefined ? uid() : data.groups[editorState.groupIndex].links[editorState.index].id, name: String(form.get("name") || "").trim(), url: String(form.get("url") || "").trim(), description: String(form.get("description") || "").trim(), icon: String(form.get("icon") || "").trim(), openInNew: form.get("openInNew") === "on" };
    try { const url = new URL(link.url); if (!/^https?:$/.test(url.protocol)) throw new Error(); } catch { alert("请输入有效的 http 或 https 网址"); return; }
    if (!link.name) return; const list = data.groups[editorState.groupIndex].links; editorState.index === undefined ? list.push(link) : list.splice(editorState.index, 1, link);
  }
  dialog.close(); await save();
};

$("#addGroupButton").onclick = () => openGroup(); $("#addLinkButton").onclick = () => data.groups.length ? openLink(0) : openGroup();
$("#themeButton").onclick = () => setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
$("#logoutButton").onclick = async () => { await request("/api/auth/logout", { method: "POST" }); location.reload(); };
$("#exportButton").onclick = () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `navdesk-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); };
$("#importButton").onclick = () => $("#fileInput").click(); $("#fileInput").onchange = async (event) => { const file = event.target.files[0]; if (!file) return; try { const imported = JSON.parse(await file.text()); if (!Array.isArray(imported.groups)) throw new Error(); if (!confirm("导入将替换当前所有分组和链接，继续吗？")) return; data = imported; await save(); } catch { alert("这不是可用的 NavDesk JSON 备份文件"); } finally { event.target.value = ""; } };

async function initialise() {
  setTheme(localStorage.getItem("navdesk-theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  try { const session = await request("/api/auth/session"); if (!session.authenticated) { $("#loginScreen").hidden = false; return; } data = await request("/api/navigation"); $("#loginScreen").hidden = true; $("#adminApp").hidden = false; render(); } catch { $("#loginScreen").hidden = false; $("#loginMessage").textContent = "服务暂不可用，请稍后重试。"; }
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
    data = await request("/api/navigation", { cache: "no-store" });
    $("#loginScreen").hidden = true;
    $("#adminApp").hidden = false;
    render();
  } catch (error) {
    $("#loginMessage").textContent = error.message || "登录失败，请稍后重试。";
  } finally {
    button.disabled = false;
    button.innerHTML = "进入管理台 <span>→</span>";
  }
};
initialise();
