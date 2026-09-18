import type { APIRoute } from 'astro';

const SITE = 'https://zhaopeng-portfolio.pages.dev';

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /

# 后台不让搜索引擎抓
Disallow: /admin/

Sitemap: ${SITE}/sitemap.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
