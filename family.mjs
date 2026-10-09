export function mountFamily(panel){let frame;
if(!document.querySelector('[data-family-css]')){const style=document.createElement('link');style.rel='stylesheet';style.href='/__FAMILY_CSS_URL__';style.dataset.familyCss='1';document.head.append(style)}
const origin='https://home-ledger.667989.xyz';
const theme=()=>frame?.contentWindow?.postMessage({type:'navdesk:theme',theme:document.documentElement.dataset.theme==='dark'?'dark':'light',mobile:matchMedia('(max-width:650px)').matches},origin);
const load=()=>{if(frame)return;frame=document.createElement('iframe');frame.title='家庭事务中心';frame.className='family-frame';frame.src=origin+'/?embed=nav';frame.referrerPolicy='strict-origin-when-cross-origin';frame.addEventListener('load',theme);panel.replaceChildren(frame)};
matchMedia('(max-width:650px)').addEventListener('change',theme);
new MutationObserver(theme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
window.addEventListener('message',event=>{if(event.origin===origin&&event.source===frame?.contentWindow&&event.data?.type==='homeledger:ready')theme()});
load();}
