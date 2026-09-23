const DAY = 86400000;
export function iconHost(value) {
  const host = new URL(value).hostname.toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,63}$/.test(host) || /\.(local|localhost|internal|lan|test|invalid)$/.test(host)) throw new Error('Unsupported host');
  return host;
}
export async function loadIcon(store, host, fetcher = fetch, now = Date.now(), force = false) {
  const key = `icons/v1/${host}.json`;
  let cached;
  try { cached = await store.get(key, {type:'json'}); } catch {}
  if (!force && cached?.expires > now) return cached;
  try {
    // Fixed upstream only: never fetch arbitrary user URLs or internal network addresses.
    const response = await fetcher(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`, {redirect:'follow', signal:AbortSignal.timeout(5000)});
    const type = (response.headers.get('content-type') || '').split(';')[0];
    if (!response.ok || !['image/png','image/jpeg','image/webp','image/x-icon','image/vnd.microsoft.icon'].includes(type)) throw new Error('Not an image');
    const reader = response.body.getReader();
    const chunks = []; let size = 0;
    for (;;) { const {done,value} = await reader.read(); if (done) break; size += value.length; if(size > 65536){await reader.cancel();throw new Error('Image too large')} chunks.push(value); }
    if (!size) throw new Error('Empty icon');
    const bytes = new Uint8Array(size); let offset = 0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    let binary = ''; for(const byte of bytes) binary += String.fromCharCode(byte);
    cached = {type,body:btoa(binary),expires:now+30*DAY};
  } catch {
    if (cached?.body) return force?{...cached,refreshFailed:true}:cached;
    cached = {body:null,expires:now+3600000};
  }
  try { await store.setJSON(key,cached); } catch { /* A cache write must not hide a valid icon. */ }
  return cached;
}
