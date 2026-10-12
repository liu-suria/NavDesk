// Start the authenticated data request while the static page is still parsing.
window.navdeskBoot = (() => {
  const read = (key, fallback = null) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  document.documentElement.dataset.theme = read('navdesk-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  async function request(url, options = {}, renewed = false, allowRecovery = true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options, signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if(response.status===401&&allowRecovery&&!renewed&&!url.startsWith('/api/auth/')){const {recover}=await import('/__RECOVERY_URL__');if(await recover(request))return request(url,options,true,allowRecovery)}
      if (!response.ok) {
        const error = new Error(response.status === 401 ? '登录已失效，请重新输入密码。' : data.error || `请求失败 (${response.status})`);
        error.status = response.status;
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('请求超时，请稍后重试。');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  if(location.pathname.startsWith('/admin'))return {read,write,request,navigation:request('/api/navigation',{},false,false).then(data=>({data}),error=>({error}))};
  const family=matchMedia('(min-width:1100px)').matches,controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  const response=fetch('/api/bootstrap'+(family?'?family=1':''),{credentials:'same-origin',cache:'no-store',signal:controller.signal});response.catch(()=>{});
  const started=import('/__WARM_URL__').then(m=>m.start(response,{cached:!!read('navdesk-cache-ready'),family}));
  const navigation=started.then(state=>state.navigation).catch(error=>({error}));
  started.then(state=>state.finished).finally(()=>clearTimeout(timer)).catch(()=>controller.abort());
  return {read,write,request,navigation,family:family?started.then(state=>state.family).catch(error=>({error})):null};
})();
