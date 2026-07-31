import { json, readJson, requireAuth } from "../../_lib.js";
import { getNavigation, getNavigationStore, saveNavigation } from "../../_storage.js";

const DEFAULT_COLOR = "#6d7cff";
const cleanText = (value, length) => String(value || "").trim().slice(0, length);
const cleanUrl = (value) => {
  try { const url = new URL(String(value || "").trim()); return /^https?:$/.test(url.protocol) ? url.href : null; } catch { return null; }
};
const cleanIcon = (value) => { const icon = cleanText(value, 2048); return !icon || /^https:\/\//i.test(icon) ? icon : ""; };

function sanitise(data) {
  if (!Array.isArray(data?.groups) || data.groups.length > 30) throw new Error("分组数据不正确");
  const ids = new Set();
  const groups = data.groups.map((group, groupIndex) => {
    const id = cleanText(group?.id, 60);
    const name = cleanText(group?.name, 40);
    if (!id || !name || ids.has(id)) throw new Error("分组名称或标识不正确");
    ids.add(id);
    const linkIds = new Set();
    const links = Array.isArray(group.links) ? group.links.map((link, linkIndex) => {
      const linkId = cleanText(link?.id, 60);
      const linkName = cleanText(link?.name, 80);
      const url = cleanUrl(link?.url);
      if (!linkId || linkIds.has(linkId) || !linkName || !url) throw new Error("链接信息不正确");
      linkIds.add(linkId);
      return { id: linkId, name: linkName, url, description: cleanText(link.description, 160), icon: cleanIcon(link.icon), openInNew: link.openInNew !== false, sort: linkIndex };
    }) : [];
    if (links.length > 150) throw new Error("单个分组最多 150 个链接");
    return { id, name, icon: cleanText(group.icon, 8), color: /^#[0-9a-fA-F]{6}$/.test(group.color || "") ? group.color : DEFAULT_COLOR, sort: groupIndex, links };
  });
  return { version: 1, updatedAt: new Date().toISOString(), groups };
}

export async function onRequestGet(context) {
  const auth = await requireAuth(context); if (auth.response) return auth.response;
  try { return json(await getNavigation(getNavigationStore())); } catch { return json({ error: "无法读取导航数据" }, 503); }
}

export async function onRequestPut(context) {
  const auth = await requireAuth(context); if (auth.response) return auth.response;
  try {
    const data = sanitise(await readJson(context.request));
    await saveNavigation(getNavigationStore(), data);
    return json(data);
  } catch (error) { return json({ error: error.message || "保存失败" }, 400); }
}
