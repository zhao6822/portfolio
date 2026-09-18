import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// 站点地址：换域名时记得同步 astro.config.mjs 里的 site
const SITE = 'https://zhaopeng-portfolio.pages.dev';

export const GET: APIRoute = async () => {
  const projects = (await getCollection('projects')).filter((p) => !p.data.draft);
  const tags = [...new Set(projects.flatMap((p) => p.data.tags))];
  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    { loc: '/', lastmod: today },
    { loc: '/about/', lastmod: today },
    { loc: '/search/', lastmod: today },
    { loc: '/tags/', lastmod: today },
    ...tags.map((t) => ({ loc: `/tags/${encodeURIComponent(t)}/`, lastmod: today })),
    ...projects.map((p) => ({
      loc: `/projects/${p.id}/`,
      lastmod: new Date(p.data.date).toISOString().slice(0, 10),
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url>\n    <loc>${SITE}${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`)
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
