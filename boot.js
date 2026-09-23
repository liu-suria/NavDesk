// Start the authenticated data request while the static page is still parsing.
window.navdeskBoot = (() => {
  const read = (key, fallback = null) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  document.documentElement.dataset.theme = read('navdesk-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  async function request(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options, signal: controller.signal });
      const data = await response.json().catch(() => ({}));
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
  // Handle rejection immediately, including failures before the page script runs.
  const navigation = request('/api/navigation').then(data => ({ data }), error => ({ error }));
  return { read, write, request, navigation };
})();
