import { json, readJson, requireAuth,parseCookies } from "../../_lib.js";
import { getNavigation, getNavigationStore, saveNavigation } from "../../_storage.js";

import {revisionCookie,versionFromCookie} from '../../_navigation-read.js';
import { sanitise } from "../../_navigation-model.js";

export async function onRequestGet(context) {
  const auth = await requireAuth(context); if (auth.response) return auth.response;
  try {const query=new URL(context.request.url).searchParams,list=query.get('view')==='list';const data=await getNavigation(getNavigationStore(),{list,fresh:query.get('fresh')==='1',minVersion:versionFromCookie(parseCookies(context.request).navdesk_revision)});if(list){const {trash,...visible}=data;return json(visible)}return json(data); } catch { return json({ error: "无法读取导航数据" }, 503); }
}

export async function onRequestPut(context) {
  const auth = await requireAuth(context); if (auth.response) return auth.response;
  try {
    const input=await readJson(context.request),store=getNavigationStore(),current=await getNavigation(store);
    if(input.updatedAt && current.updatedAt && input.updatedAt!==current.updatedAt)return json({error:'数据已在其他设备更新，请刷新后重试'},409);
    const data = sanitise({...input,trash:input.trash??current.trash??[]});
    await saveNavigation(getNavigationStore(), data);
    return json(data,200,{'Set-Cookie':revisionCookie(data.updatedAt)});
  } catch (error) { return json({ error: error.message || "保存失败" }, 400); }
}
