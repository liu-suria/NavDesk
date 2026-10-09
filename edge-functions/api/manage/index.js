import { json, readJson, requireAuth } from '../../_lib.js';
import { getNavigation, getNavigationStore, saveNavigation } from '../../_storage.js';
import { applyOperation } from '../../_manage.js';

export async function onRequestGet(context) {
  const auth = await requireAuth(context); if (auth.response) return auth.response;
  try { return json(await getNavigation(getNavigationStore())); }
  catch { return json({error:'无法读取导航数据'},503); }
}
export async function onRequestPost(context) {
  const auth = await requireAuth(context); if (auth.response) return auth.response;
  try {
    const input = await readJson(context.request);
    const store = getNavigationStore(), current = await getNavigation(store);
    const next = applyOperation(current,input);
    // Mandatory private backup before a management write; failure aborts the write.
    await store.setJSON(`navigation/backups/${Date.now()}-${crypto.randomUUID()}.json`,current);
    const latest = await getNavigation(store);
    if (latest.updatedAt !== current.updatedAt) return json({error:'数据已更新，请重试'},409);
    await saveNavigation(store,next);
    return json(next);
  } catch (error) { return json({error:error.message || '操作失败'},error.status || 400); }
}
