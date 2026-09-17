// GitHub OAuth 代理 —— 后台登录用。
// 部署到 Cloudflare Pages 后，需要在控制台设置两个环境变量：
//   GITHUB_CLIENT_ID
//   GITHUB_CLIENT_SECRET
// 以及 REDIRECT_URL（例如 https://xxx.pages.dev/api/auth/callback）

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

function donePage(payload) {
  const html = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>登录完成</title></head>
<body style="font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#3f3f46">
<p>登录完成，正在返回后台…</p>
<script>
(function () {
  var msg = 'authorization:github:success:' + ${payload};
  function receiveMessage(e) {
    if (e.origin === window.location.origin || e.origin === 'null') return;
  }
  try {
    window.opener.postMessage(msg, '*');
  } catch (err) {
    document.body.innerHTML = '<p>无法回到后台，请关闭本窗口重新登录。</p>';
  }
})();
</script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function failPage(reason) {
  return new Response(
    `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>登录失败</title></head>
<body style="font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif;padding:40px;color:#b91c1c">
<h2>登录失败</h2><p>${reason}</p><p>请关闭本窗口，回到后台重新点一次登录。</p>
</body></html>`,
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');

  if (path.endsWith('/api/auth')) {
    const state = crypto.randomUUID();
    const redirectUri = env.REDIRECT_URL;
    if (!env.GITHUB_CLIENT_ID || !redirectUri) {
      return failPage('后台还未配置 GITHUB_CLIENT_ID 或 REDIRECT_URL 环境变量。');
    }
    const gh = new URL('https://github.com/login/oauth/authorize');
    gh.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    gh.searchParams.set('scope', 'repo,user');
    gh.searchParams.set('state', state);
    gh.searchParams.set('redirect_uri', redirectUri);
    return Response.redirect(gh.toString(), 302);
  }

  if (path.endsWith('/api/auth/callback')) {
    const code = url.searchParams.get('code');
    if (!code) {
      return failPage('GitHub 没有返回授权码，可能是授权被取消了。');
    }
    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: env.REDIRECT_URL,
        }),
      }
    );
    const data = await tokenRes.json();
    if (!data.access_token) {
      return failPage(data.error_description || '换取令牌失败。');
    }
    const payload = JSON.stringify({
      token: data.access_token,
      provider: 'github',
    });
    return donePage(JSON.stringify(payload));
  }

  return json({ error: 'not found' }, 404);
}
