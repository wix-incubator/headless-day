import type { APIRoute } from 'astro';

const ROUTES = ['/', '/program', '/schedule', '/island', '/projects', '/apply', '/faq'];

export const GET: APIRoute = ({ site, url }) => {
  const origin = (site ?? new URL(url.origin)).toString().replace(/\/$/, '');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map((r) => `  <url><loc>${origin}${r}</loc><changefreq>weekly</changefreq><priority>${r === '/' ? '1.0' : '0.7'}</priority></url>`).join('\n')}
</urlset>`;
  return new Response(body, { headers: { 'content-type': 'application/xml' } });
};
