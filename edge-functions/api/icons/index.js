import { requireAuth } from '../../_lib.js';
import { getNavigationStore } from '../../_storage.js';
import { iconHost, loadIcon } from '../../_icons.js';
export async function onRequestGet(context) {
  const auth = await requireAuth(context); if(auth.response)return auth.response;
  let host;
  try { host=iconHost(new URL(context.request.url).searchParams.get('url')); }
  catch { return new Response(null,{status:400,headers:{'Cache-Control':'no-store'}}); }
  const icon=await loadIcon(getNavigationStore(),host);
  const headers={'Cache-Control':'private, max-age=86400','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
  if(!icon.body)return new Response(null,{status:404,headers:{...headers,'Cache-Control':'private, max-age=3600'}});
  const bytes=Uint8Array.from(atob(icon.body),c=>c.charCodeAt(0));
  return new Response(bytes,{headers:{...headers,'Content-Type':icon.type}});
}
