// Explicit ports shared by the home and admin entrypoints; no page globals or DOM.
function createNavigationPort({get,show,request}) {
 return {get,show,request,read:()=>request('/api/navigation'),save:async value=>{
  const saved=await request('/api/navigation',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
  show(saved);return saved;
 }};
}
function createPinPort({storage,onChange=()=>{}}) {
 const key='navdesk-local-pins-v1';
 const read=()=>{try{const value=JSON.parse(storage.getItem(key)||'[]');return Array.isArray(value)?[...new Set(value.filter(url=>typeof url==='string'))]:[]}catch{return []}};
 const save=urls=>{storage.setItem(key,JSON.stringify([...new Set(urls)]));onChange()};
 const links=data=>{const byURL=new Map();data.groups.forEach(group=>group.links.forEach(link=>{if(!byURL.has(link.url))byURL.set(link.url,{group,link})}));return read().map(url=>byURL.get(url)).filter(Boolean)};
 return {key,read,save,links,has:link=>read().includes(link.url),toggle:link=>{const urls=read();save(urls.includes(link.url)?urls.filter(url=>url!==link.url):[...urls,link.url])}};
}
