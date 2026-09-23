// Stage two: allow the list to paint, then request visible icons with bounded concurrency.
window.navdeskIcons = (() => {
  let observer, queue=[], active=0, generation=0;
  const refreshed=new Map();
  function source(link) {
    const key=link.url+'|'+(link.icon||'');if(refreshed.has(key))return refreshed.get(key);
    if(link.icon)return link.icon;
    try { const url=new URL(link.url); return '/api/icons?url='+encodeURIComponent(url.origin); } catch{return ''}
  }
  function pump(){
    while(active<4 && queue.length){
      const {node,url}=queue.shift();
      if(!node.isConnected)continue;
      active++;
      const image=new Image(18,18); image.alt='';image.decoding='async';image.referrerPolicy='no-referrer';
      let done=false;
      const finish=()=>{if(done)return;done=true;clearTimeout(timer);active--;pump()};
      const timer=setTimeout(()=>{image.remove();image.src='';finish()},10000);
      image.onload=()=>{if(node.isConnected)node.classList.add('icon-ready');finish()};
      image.onerror=()=>{image.remove();finish()};
      node.append(image);image.src=url;
    }
  }
  function schedule(root){
    generation++;const run=generation;observer?.disconnect();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(run!==generation)return;
      const enqueue=node=>{if(node.dataset.iconQueued)return;node.dataset.iconQueued='1';queue.push({node,url:node.dataset.icon});pump()};
      if('IntersectionObserver' in window){
        observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){observer.unobserve(entry.target);enqueue(entry.target)}}),{rootMargin:'100px'});
        root.querySelectorAll('[data-icon]').forEach(node=>{if(!node.dataset.iconQueued)observer.observe(node)});
      }else root.querySelectorAll('[data-icon]').forEach(enqueue);
    }));
  }
  // Saving a link starts warming the shared server cache even when its card is below the fold.
  function warm(link){const url=source(link);if(url.startsWith('/api/icons?'))fetch(url,{credentials:'same-origin'}).catch(()=>{});}
  return {source,schedule,warm,invalidate:link=>{const url=new URL(link.icon||source(link),location.href);url.searchParams.set('_refresh',Date.now());refreshed.set(link.url+'|'+(link.icon||''),url.href)}};
})();
