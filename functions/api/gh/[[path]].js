// GitHub API 反向代理 —— 国内浏览器直连 api.github.com 不稳定时，
// Service Worker 会把请求改道到这里，由 Cloudflare 服务器转发给 GitHub。
// 只代理 api.github.com，不解析其他主机，无 SSRF 风险。

const HOP = new Set([
  'set-cookie',
  'content-security-policy',
  'x-frame-options',
  'strict-transport-security',
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers':
      'authorization, content-type, accept, accept-encoding, if-none-match, if-modified-since, user-agent',
    'access-control-allow-methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-max-age': '86400',
  };
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  // 匿名只允许读，写操作必须带令牌（防止接口被滥用）
  if (request.method !== 'GET' && request.method !== 'HEAD' && !request.headers.get('authorization')) {
    return new Response(JSON.stringify({ error: 'missing authorization' }), {
      status: 403,
      headers: { 'content-type': 'application/json', ...cors() },
    });
  }

  const sub = url.pathname.replace(/^\/api\/gh/, '') || '/';
  const target = `https://api.github.com${sub}${url.search}`;

  const headers = new Headers();
  for (const name of ['accept', 'authorization', 'content-type', 'if-none-match', 'if-modified-since']) {
    const v = request.headers.get(name);
    if (v) headers.set(name, v);
  }
  headers.set('user-agent', 'sveltia-cms-via-cloudflare-pages');

  let res;
  try {
    res = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'upstream failed', detail: String(err) }), {
      status: 502,
      headers: { 'content-type': 'application/json', ...cors() },
    });
  }

  const out = new Headers();
  for (const [k, v] of res.headers) {
    if (!HOP.has(k.toLowerCase())) out.set(k, v);
  }
  for (const [k, v] of Object.entries(cors())) out.set(k, v);

  return new Response(res.body, { status: res.status, headers: out });
}
