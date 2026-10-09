import { sanitise } from './_navigation-model.js';

// Apply one operation to a fresh snapshot, preserving settings and the recycle bin.
export function applyOperation(current, input) {
  if (!input.updatedAt || input.updatedAt !== current.updatedAt) {
    const error = new Error('请先读取最新数据并提供 updatedAt'); error.status = 409; throw error;
  }
  const data = structuredClone(current);
  const group = data.groups.find(g => g.id === input.groupId);
  const value = input.value || {};
  const id = () => crypto.randomUUID();
  switch (input.action) {
    case 'group.create':
      data.groups.push({ ...value, id: id(), links: [] }); break;
    case 'group.update':
      if (!group) throw new Error('分类不存在');
      for (const key of ['name', 'icon', 'color']) if (key in value) group[key] = value[key];
      break;
    case 'group.delete':
      if (!group) throw new Error('分类不存在');
      data.trash ||= [];
      data.trash.push({id:id(),deletedAt:new Date().toISOString(),group});
      data.groups = data.groups.filter(g => g !== group); break;
    case 'link.create': {
      if (!group) throw new Error('分类不存在');
      const url = new URL(value.url).href;
      if (data.groups.some(g => g.links.some(l => l.url === url))) throw new Error('网址已存在');
      group.links.push({...value,id:id()}); break;
    }
    case 'link.update':
    case 'link.move':
    case 'link.delete': {
      if (!group) throw new Error('分类不存在');
      const link = group.links.find(l => l.id === input.linkId);
      if (!link) throw new Error('网址不存在');
      if (input.action === 'link.update') {
        for (const key of ['name','url','description','icon','openInNew']) if (key in value) link[key]=value[key];
      } else if (input.action === 'link.move') {
        const target = data.groups.find(g => g.id === input.targetGroupId);
        if (!target) throw new Error('目标分类不存在');
        if (target !== group) { group.links = group.links.filter(l => l !== link); target.links.push(link); }
      } else {
        data.trash ||= [];
        data.trash.push({id:id(),deletedAt:new Date().toISOString(),group:{...group,links:[link]}});
        group.links = group.links.filter(l => l !== link);
      }
      break;
    }
    default: throw new Error('不支持的操作');
  }
  return sanitise(data);
}
