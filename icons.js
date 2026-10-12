// Stage two: allow the list to paint, then request visible icons with bounded concurrency.
window.navdeskIcons = (() => {
  let observer, queue=[], active=0, generation=0;
  const refreshed=new Map(), loads=new Map();
  function source(link) {
    const key=link.url+'|'+(link.icon||'');if(refreshed.has(key))return refreshed.get(key);
    if(link.icon)return link.icon;
    try { const url=new URL(link.url); return '/api/icons?v=7&url='+encodeURIComponent(url.origin); } catch{return ''}
  }
  function attach(node,image){
    if(!node.isConnected||!image)return;
    const copy=image.cloneNode();node.append(copy);node.classList.add('icon-ready');
  }
  function enqueue(node){
    if(node.dataset.iconQueued)return;node.dataset.iconQueued='1';
    const url=node.dataset.icon,existing=loads.get(url);
    if(existing){if(existing.done)attach(node,existing.image);else existing.nodes.push(node);return}
    const job={url,nodes:[node],done:false,image:null};loads.set(url,job);queue.push(job);pump();
  }
  function pump(){
    while(active<4 && queue.length){
      const job=queue.shift();
      if(!job.nodes.some(node=>node.isConnected)){loads.delete(job.url);continue}
      active++;
      const image=new Image(18,18);image.alt='';image.decoding='async';image.referrerPolicy='no-referrer';image.fetchPriority='low';
      const finish=valid=>{if(job.done)return;job.done=true;clearTimeout(timer);active--;
        if(valid){job.image=image;job.nodes.forEach(node=>attach(node,image))}
        job.nodes=[];pump();
      };
      const timer=setTimeout(()=>{finish(false);image.src=''},10000);
      image.onload=()=>finish(image.naturalWidth>=8&&image.naturalHeight>=8);
      image.onerror=()=>finish(false);image.src=job.url;
    }
  }
  function schedule(root){
    generation++;const run=generation;observer?.disconnect();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(run!==generation)return;
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
