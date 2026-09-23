const DEFAULT_COLOR = "#6d7cff";
const cleanText = (value, length) => String(value || "").trim().slice(0, length);
const cleanUrl = (value) => {
  try { const url = new URL(String(value || "").trim()); return /^https?:$/.test(url.protocol) ? url.href : null; } catch { return null; }
};
const cleanIcon = (value) => { const icon = cleanText(value, 2048); return !icon || /^https:\/\//i.test(icon) ? icon : ""; };

export function sanitise(data) {
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
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    settings: { brandName: cleanText(data?.settings?.brandName || "NavDesk", 24) || "NavDesk" },
    groups,
    trash: sanitiseTrash(data.trash),
  };
}


function sanitiseTrash(value){
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>500)throw Error('回收站数据不正确或超过500项');
 const ids=new Set();
 return value.map(item=>{const id=cleanText(item.id,60);if(!id||ids.has(id))throw Error('回收项标识不正确');ids.add(id);const group=sanitise({groups:[item.group]}).groups[0];return {id,deletedAt:cleanText(item.deletedAt,40),group}});
}
