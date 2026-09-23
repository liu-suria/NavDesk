import { json, readJson, requireAuth } from "../../_lib.js";
import { getNavigation, getNavigationStore, saveNavigation } from "../../_storage.js";

import { sanitise } from "../../_navigation-model.js";

export async function onRequestGet(context) {
  const auth = await requireAuth(context); if (auth.response) return auth.response;
  try { const data=await getNavigation(getNavigationStore());if(new URL(context.request.url).searchParams.get('view')==='list'){const {trash,...visible}=data;return json(visible)}return json(data); } catch { return json({ error: "无法读取导航数据" }, 503); }
}

export async function onRequestPut(context) {
  const auth = await requireAuth(context); if (auth.response) return auth.response;
  try {
    const input=await readJson(context.request),store=getNavigationStore(),current=await getNavigation(store);
    if(input.updatedAt && current.updatedAt && input.updatedAt!==current.updatedAt)return json({error:'数据已在其他设备更新，请刷新后重试'},409);
    const data = sanitise({...input,trash:input.trash??current.trash??[]});
    await saveNavigation(getNavigationStore(), data);
    return json(data);
  } catch (error) { return json({ error: error.message || "保存失败" }, 400); }
}
