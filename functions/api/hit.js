/**
 * 全站访问计数：每打开一次页面 +1，数字存在 Cloudflare KV 里。
 *
 * 需要在 Cloudflare 项目里绑定一个 KV 命名空间，变量名必须是 COUNTER。
 * 没绑定的话这里会走 catch 分支返回 ok:false，网页底部就不显示数字，
 * 网站其他部分照常工作，不会报错。
 */
const KEY = 'site_pv';
const START_FROM = 0; // 想从别的数字开始就改这里

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export async function onRequestGet({ env }) {
  try {
    if (!env.COUNTER) {
      return json({ ok: false, error: 'KV 未绑定：变量名应为 COUNTER' }, 503);
    }
    const raw = await env.COUNTER.get(KEY);
    const current = Number.parseInt(raw ?? '', 10);
    const base = Number.isFinite(current) ? current : START_FROM;
    const total = base + 1;
    await env.COUNTER.put(KEY, String(total));
    return json({ ok: true, total });
  } catch (e) {
    return json({ ok: false, error: String(e?.message ?? e) }, 500);
  }
}

/** 只看数字不加 1，方便自己核对 */
export async function onRequestPost({ env }) {
  try {
    if (!env.COUNTER) {
      return json({ ok: false, error: 'KV 未绑定：变量名应为 COUNTER' }, 503);
    }
    const raw = await env.COUNTER.get(KEY);
    const total = Number.parseInt(raw ?? '', 10);
    return json({ ok: true, total: Number.isFinite(total) ? total : START_FROM });
  } catch (e) {
    return json({ ok: false, error: String(e?.message ?? e) }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
