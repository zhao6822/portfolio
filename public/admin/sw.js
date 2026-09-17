// 把 Sveltia CMS 依赖的外部服务全部改走本地/自有服务，国内网络不再卡死：
// - unpkg.com（语言包 / 版本检查 / chunks）→ 本地文件
// - cdn.jsdelivr.net（字体）→ 本地字体
// - api.github.com（读写仓库，国内不稳定）→ 本站 Cloudflare Functions 反向代理
const VERSION = '0.213.5';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isUnpkg = url.hostname === 'unpkg.com' && url.pathname.startsWith('/@sveltia/cms');
  const isFont =
    url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/fontsource/fonts/');
  const isGhApi = url.hostname === 'api.github.com';
  if (!isUnpkg && !isFont && !isGhApi) return;

  const tag = (res) => {
    const headers = new Headers(res.headers);
    headers.set('x-served-by', 'local-sw');
    return new Response(res.body, { status: res.status, headers });
  };
  const path = url.pathname;

  // GitHub API → 本站反向代理（保存认证头与请求体）
  if (isGhApi) {
    const proxied = new Request(`/api/gh${path}${url.search}`, event.request);
    event.respondWith(fetch(proxied).then(tag));
    return;
  }

  // 语言包 → /admin/locales/
  if (path.includes('/locales/')) {
    const locale = path.split('/locales/')[1];
    event.respondWith(
      fetch(`/admin/locales/${locale}`)
        .then(tag)
        .catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })),
    );
    return;
  }

  // 版本检查 package.json → 本地副本
  if (path.endsWith('/package.json')) {
    event.respondWith(fetch('/admin/package.json').then(tag));
    return;
  }

  // 动态 chunks（如 react-dom.js）→ 本地 chunks/
  const chunkMatch = path.match(/\/chunks\/([\w.-]+\.js)$/);
  if (chunkMatch) {
    event.respondWith(
      fetch(`/admin/chunks/${chunkMatch[1]}`)
        .then(tag)
        .catch(() => new Response('', { status: 404 })),
    );
    return;
  }

  // 字体 → 本地 fonts/（仅 jsdelivr fontsource 路径，其余放行走原网络）
  if (isFont) {
    const name = path.replace('/fontsource/fonts/', '').replace(/[:@]/g, '_').replace(/\//g, '_');
    event.respondWith(
      fetch(`/admin/fonts/${name}`)
        .then(tag)
        .catch(() => new Response('', { status: 404 })),
    );
  }

  void VERSION;
});
