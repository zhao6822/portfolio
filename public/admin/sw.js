// 把 Sveltia CMS 的 unpkg.com 运行时请求全部改走本地文件，国内网络不再卡死
const VERSION = '0.213.5';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname !== 'unpkg.com' || !url.pathname.startsWith('/@sveltia/cms')) return;

  const tag = (res) => {
    const headers = new Headers(res.headers);
    headers.set('x-served-by', 'local-sw');
    return new Response(res.body, { status: res.status, headers });
  };
  const path = url.pathname;

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

  void VERSION;
});
