import { Hono } from 'hono'
import type { AppEnv } from '../types'

const seoRoutes = new Hono<AppEnv>()

const DOMAIN = 'https://opa.com.ar'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

seoRoutes.get('/robots.txt', async (c) => {
  const text = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${DOMAIN}/sitemap.xml
`
  return c.text(text)
})

seoRoutes.get('/sitemap.xml', async (c) => {
  const categories = (await c.env.DB.prepare(
    'SELECT slug FROM categories WHERE active = 1 ORDER BY sort_order',
  ).all()).results ?? []
  const products = (await c.env.DB.prepare(
    "SELECT slug, updated_at FROM products WHERE active = 1 AND slug != '' ORDER BY updated_at DESC",
  ).all()).results ?? []

  const staticUrls = ['/', '/productos', '/ofertas', '/nosotros', '/contacto']
  const urls: string[] = []
  const today = new Date().toISOString().slice(0, 10)
  for (const path of staticUrls) {
    urls.push(`  <url>\n    <loc>${DOMAIN}${path}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${path === '/' ? '1.0' : '0.7'}</priority>\n  </url>`)
  }
  for (const cat of categories) {
    urls.push(`  <url>\n    <loc>${DOMAIN}/productos?categoria=${escapeXml(String(cat.slug))}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>0.6</priority>\n  </url>`)
  }
  for (const p of products) {
    const updated = String(p.updated_at ?? today).slice(0, 10)
    urls.push(`  <url>\n    <loc>${DOMAIN}/producto/${escapeXml(String(p.slug))}</loc>\n    <lastmod>${updated}</lastmod>\n    <priority>0.8</priority>\n  </url>`)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`
  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})

export default seoRoutes