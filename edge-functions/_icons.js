const DAY = 86400000;
export function iconHost(value) {
  const host = new URL(value).hostname.toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,63}$/.test(host) || /\.(local|localhost|internal|lan|test|invalid)$/.test(host)) throw new Error('Unsupported host');
  return host;
}
// ICO bundles often contain multiple resolutions. Keep only the closest 32px
// frame, reusing its compressed bytes rather than decoding large source images.
export function compactIcon(bytes, type) {
  if (!['image/x-icon','image/vnd.microsoft.icon'].includes(type) || bytes.length < 22) return {bytes,type};
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint16(0,true)!==0 || view.getUint16(2,true)!==1) return {bytes,type};
  const count=view.getUint16(4,true),frames=[];
  if(count>64 || bytes.length<6+count*16)return {bytes,type};
  for(let i=0;i<count;i++){
    const at=6+i*16,width=bytes[at]||256,height=bytes[at+1]||256;
    const size=view.getUint32(at+8,true),offset=view.getUint32(at+12,true);
    if(size && offset>=6+count*16 && offset+size<=bytes.length)frames.push({at,size,offset,score:Math.abs(width-32)+Math.abs(height-32)});
  }
  frames.sort((a,b)=>a.score-b.score||a.size-b.size);
  if(!frames.length)return {bytes,type};
  const frame=frames[0],body=bytes.slice(frame.offset,frame.offset+frame.size);
  if(body[0]===137 && body[1]===80 && body[2]===78 && body[3]===71)return {bytes:body,type:'image/png'};
  const compact=new Uint8Array(22+body.length);compact.set([0,0,1,0,1,0]);compact.set(bytes.slice(frame.at,frame.at+16),6);
  new DataView(compact.buffer).setUint32(18,22,true);compact.set(body,22);
  return {bytes:compact,type:'image/x-icon'};
}
export function placeholder(bytes,type) {
  if(type!=='image/png'||bytes.length<24||bytes[0]!==137||bytes[1]!==80)return false;
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  return view.getUint32(16)<8||view.getUint32(20)<8;
}
export async function loadIcon(store, host, fetcher = fetch, now = Date.now(), force = false) {
  const key = `icons/v4/${host}.json`;
  let cached;
  try { cached = await store.get(key, {type:'json'}); } catch {}
  if(cached?.body && placeholder(Uint8Array.from(atob(cached.body),c=>c.charCodeAt(0)),cached.type))cached={body:null,expires:now+3600000};
  if (!force && cached?.expires > now) return cached;
  try {
    // Fixed upstream only: never fetch arbitrary user URLs or internal network addresses.
    let response, failures=[];
    // Request small provider-rendered rasters; no arbitrary destination or redirects.
    for (const url of [
      `https://favicon.yandex.net/favicon/${encodeURIComponent(host)}`,
      `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${encodeURIComponent(host)}&size=32`,
      `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
    ]) {
      try {
        const candidate = await fetcher(url, {redirect:'error', eo:{timeoutSetting:{connectTimeout:2500,readTimeout:2500,writeTimeout:2500}}});
        if (candidate.ok && /^image\//.test(candidate.headers.get('content-type') || '')) { response=candidate; break; }
        failures.push(new URL(url).hostname+': HTTP '+candidate.status+' '+candidate.headers.get('content-type')); 
      } catch (error) {failures.push(error.name+': '+error.message)}
    }
    if (!response) throw new Error('Providers unavailable: '+failures.join('; '));
    const type = (response.headers.get('content-type') || '').split(';')[0];
    if (!response.ok || !['image/png','image/jpeg','image/webp','image/x-icon','image/vnd.microsoft.icon'].includes(type)) throw new Error('Not an image');
    const reader = response.body.getReader();
    const chunks = []; let size = 0;
    for (;;) { const {done,value} = await reader.read(); if (done) break; const chunk=value instanceof Uint8Array?value:new Uint8Array(value); size += chunk.byteLength; if(size > 65536){await reader.cancel();throw new Error('Image too large')} chunks.push(chunk); }
    if (!size) throw new Error('Empty icon');
    const bytes = new Uint8Array(size); let offset = 0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    let binary = '';
    const compact=compactIcon(bytes,type);
    if(placeholder(compact.bytes,compact.type))throw new Error('Provider has no icon');
    binary='';for(const byte of compact.bytes)binary+=String.fromCharCode(byte);
    cached = {type:compact.type,body:btoa(binary),expires:now+30*DAY};
  } catch (error) {
    if (cached?.body) {
      const stale={...cached,expires:now+3600000};
      try {await store.setJSON(key,stale)} catch {}
      return force?{...stale,refreshFailed:true}:stale;
    }
    cached = {body:null,expires:now+3600000,error:String(error.message).slice(0,300)};
  }
  try { await store.setJSON(key,cached); } catch { /* A cache write must not hide a valid icon. */ }
  return cached;
}
