const $ = (selector, root = document) => root.querySelector(selector);
let data = { version: 1, groups: [] };
let editorState = null, savedData=null;
const groupsRoot = $("#groups"), dialog = $("#editor"), fields = $("#editorFields");

function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char])); }
function domain(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }
const { read, write, request } = window.navdeskBoot;
function setTheme(theme) { document.documentElement.dataset.theme = theme; write("navdesk-theme", theme); }
function setBrand(settings = {}) {
  const name = String(settings.brandName || "NavDesk").trim() || "NavDesk";
  $("#brandName").textContent = name;
  $("#brandMark").textContent = [...name][0]?.toUpperCase() || "N";
  document.title = `${name} · 管理`;
}

async function save() {
  const button = $("#saveButton"); if (button) { button.disabled = true; button.textContent = "保存中…"; }
  try { data = await request("/api/navigation", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); render(); }
  catch (error) { if(savedData){data=structuredClone(savedData);render()} alert(error.message); }
  finally { if (button) { button.disabled = false; button.textContent = "保存"; } }
}

const navigationPort=createNavigationPort({get:()=>data,show:value=>{data=value;render()},request});
const pinPort=createPinPort({storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)}});
const openNavManager=createManagerLoader({navigation:navigationPort,pins:pinPort,icons:window.navdeskIcons,notify:message=>alert(message)});
$("#manageNav").onclick=()=>openNavManager("batch");
function render() {
  savedData=structuredClone(data);
  setBrand(data.settings);
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
      const icon=window.navdeskIcons.source(link);$(".site-icon",row).dataset.icon=icon;$(".site-icon",row).innerHTML=`<span class="icon-fallback">${escapeHtml([...link.name][0]?.toUpperCase() || "↗")}</span>`;
      $(".link-name strong", row).textContent = link.name; const linkUrl = $(".link-url", row); linkUrl.href = link.url; linkUrl.textContent = domain(link.url); $(".link-description", row).textContent = link.description || "—";
      row.querySelectorAll("[data-action]").forEach((button) => button.onclick = () => linkAction(button.dataset.action, groupIndex, linkIndex)); rows.append(row);
    });
    groupsRoot.append(node);
  });
  window.navdeskIcons.schedule(groupsRoot);
}

function move(list, from, delta) { const to = from + delta; if (to < 0 || to >= list.length) return false; [list[from], list[to]] = [list[to], list[from]]; return true; }
function groupAction(action, groupIndex) {
  const group = data.groups[groupIndex];
  if (action === "add-link") return openLink(groupIndex);
  if (action === "edit-group") return openGroup(groupIndex);
  if (action === "remove-group") return openNavManager("deleteGroup",{groupId:group.id});
  if (action === "move-up" && move(data.groups, groupIndex, -1)) return save();
  if (action === "move-down" && move(data.groups, groupIndex, 1)) return save();
}
function linkAction(action, groupIndex, linkIndex) {
  const links = data.groups[groupIndex].links;
  if (action === "edit-link") return openLink(groupIndex, linkIndex);
  if (action === "remove-link") return openNavManager("delete",{groupId:data.groups[groupIndex].id,linkId:links[linkIndex].id});
  if (action === "move-link-up" && move(links, linkIndex, -1)) return save();
  if (action === "move-link-down" && move(links, linkIndex, 1)) return save();
}

function showModal(type, editing) {
  editorState = { type, ...editing };
  if (type === "settings") {
    $("#modalEyebrow").textContent = "SITE SETTINGS";
    $("#modalTitle").textContent = "站点设置";
  } else {
    $("#modalEyebrow").textContent = `${editing.index === undefined ? "NEW" : "EDIT"} ${type === "group" ? "GROUP" : "LINK"}`;
    $("#modalTitle").textContent = `${editing.index === undefined ? "新建" : "编辑"}${type === "group" ? "分组" : "链接"}`;
  }
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
  fields.innerHTML = `<div class="fields link-fields"><div class="form-intro"><strong>链接信息</strong><span>填写名称和网址即可，图标会自动获取并缓存。</span></div><div class="two-fields">${input("名称", "name", link.name, { required: true, placeholder: "例如：ChatGPT" })}${input("网址", "url", link.url, { required: true, type: "url", placeholder: "https://…" })}</div>${input("备注（可选）", "description", link.description, { textarea: true, placeholder: "一句话说明这个入口" })}<details class="advanced-fields"><summary>更多设置</summary><div>${input("自定义图标地址（可选）", "icon", link.icon, { type: "url", placeholder: "留空自动获取并缓存网站图标" })}</div></details><label class="checkbox"><input name="openInNew" type="checkbox" ${link.openInNew !== false ? "checked" : ""} /> 在新窗口打开</label></div>`;
  showModal("link", { groupIndex, index });
}

function openSettings() {
  const settings = data.settings || {};
  fields.innerHTML = `<div class="fields"><div class="form-intro"><strong>站点显示</strong><span>用于左上角品牌名称、浏览器标题和登录按钮。</span></div>${input("左上角名称", "brandName", settings.brandName || "NavDesk", { required: true, placeholder: "例如：Suria 的导航" })}</div>`;
  showModal("settings", {});
}

$("#editorForm").onsubmit = async (event) => {
  event.preventDefault(); if (event.submitter?.value === "cancel") return dialog.close(); const form = new FormData(event.currentTarget);
  if (editorState.type === "group") {
    const group = { id: editorState.index === undefined ? uid() : data.groups[editorState.index].id, name: String(form.get("name") || "").trim(), icon: String(form.get("icon") || "").trim(), color: String(form.get("color") || "#6d7cff"), links: editorState.index === undefined ? [] : data.groups[editorState.index].links };
    if (!group.name) return; editorState.index === undefined ? data.groups.push(group) : data.groups.splice(editorState.index, 1, group);
  } else if (editorState.type === "settings") {
    const brandName = String(form.get("brandName") || "").trim().slice(0, 24);
    if (!brandName) return;
    data.settings = { ...(data.settings || {}), brandName };
  } else {
    const link = { ...(editorState.index===undefined?{}:data.groups[editorState.groupIndex].links[editorState.index]), id: editorState.index === undefined ? uid() : data.groups[editorState.groupIndex].links[editorState.index].id, name: String(form.get("name") || "").trim(), url: String(form.get("url") || "").trim(), description: String(form.get("description") || "").trim(), icon: String(form.get("icon") || "").trim(), openInNew: form.get("openInNew") === "on" };
    try { const url = new URL(link.url); if (!/^https?:$/.test(url.protocol)) throw new Error(); } catch { alert("请输入有效的 http 或 https 网址"); return; }
    const key=value=>{const u=new URL(value);for(const k of [...u.searchParams.keys()])if(/^utm_/i.test(k)||/^(fbclid|gclid)$/i.test(k))u.searchParams.delete(k);return u.href};
    if(data.groups.some((g,gi)=>g.links.some((l,li)=>!(gi===editorState.groupIndex&&li===editorState.index)&&key(l.url)===key(link.url)))){alert('相同网址已存在');return}
    if (!link.name) return; const list = data.groups[editorState.groupIndex].links; editorState.index === undefined ? list.push(link) : list.splice(editorState.index, 1, link);
  }
  dialog.close(); await save();
  if (editorState.type === "link") { const link=data.groups[editorState.groupIndex]?.links[editorState.index ?? data.groups[editorState.groupIndex].links.length-1]; if(link)window.navdeskIcons.warm(link); }
};

document.querySelectorAll("[data-close-editor]").forEach((button) => {
  button.addEventListener("click", () => dialog.close());
});

$("#addGroupButton").onclick = () => openGroup(); $("#addLinkButton").onclick = () => data.groups.length ? openLink(0) : openGroup(); $("#settingsButton").onclick = () => openSettings();
$("#themeButton").onclick = () => setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
$("#logoutButton").onclick = async () => { await request("/api/auth/logout", { method: "POST" }); location.reload(); };
$("#exportButton").onclick = () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `navdesk-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); };
$("#importButton").onclick = () => $("#fileInput").click(); $("#fileInput").onchange = async (event) => { const file = event.target.files[0]; if (!file) return; try { const imported = JSON.parse(await file.text()); if (!Array.isArray(imported.groups)) throw new Error(); if (!confirm("导入将替换当前所有分组和链接，继续吗？")) return; data = {...imported,updatedAt:data.updatedAt,trash:imported.trash??data.trash??[]}; await save(); } catch { alert("这不是可用的 NavDesk JSON 备份文件"); } finally { event.target.value = ""; } };

async function initialise(first = false) {
  $("#bootScreen").hidden = false;
  $("#retryButton").hidden = true;
  $("#bootMessage").textContent = "正在打开管理台…";
  try {
    const result = first ? await window.navdeskBoot.navigation : { data: await request("/api/navigation") };
    if (result.error) throw result.error;
    data = result.data;
    $("#loginScreen").hidden = true;
    $("#adminApp").hidden = false;
    $("#bootScreen").hidden = true;
    render();
    performance.mark("navdesk-content-ready");
  } catch (error) {
    if (error.status === 401) { $("#bootScreen").hidden = true; $("#loginScreen").hidden = false; return; }
    $("#bootMessage").textContent = "暂时无法读取导航，请检查网络后重试。";
    $("#retryButton").hidden = false;
  }
}
$("#retryButton").onclick = () => initialise();
$("#loginForm").onsubmit = async (event) => {
  event.preventDefault();
  const button = $("button", event.currentTarget);
  button.disabled = true;
  button.innerHTML = "正在验证…";
  $("#loginMessage").textContent = "";
  try {
    await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: $("#password").value }) });
    data = await request("/api/navigation", { cache: "no-store" });
    $("#loginScreen").hidden = true;
    $("#adminApp").hidden = false;
    $("#bootScreen").hidden = true;
    $("#password").value = "";
    render();
    performance.mark("navdesk-content-ready");
  } catch (error) {
    $("#loginMessage").textContent = error.message || "登录失败，请稍后重试。";
  } finally {
    button.disabled = false;
    button.innerHTML = "进入管理台 <span>→</span>";
  }
};
performance.mark("navdesk-shell-ready");
initialise(true);
