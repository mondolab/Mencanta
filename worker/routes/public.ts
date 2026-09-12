import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { getPublicSettings, getSettingJson } from '../lib/db'
import { serializePublicProduct, resolveImageUrl } from '../lib/serialize'
import type { ProductRow } from '../lib/serialize'
import { notFound } from '../lib/errors'

const publicApi = new Hono<AppEnv>()

// ----------------------------------------------------------------
// Configuración pública (no sensible)
// ----------------------------------------------------------------
publicApi.get('/settings/public', async (c) => {
  const settings = await getPublicSettings(c.env)
  return c.json({ success: true, data: settings })
})

// ----------------------------------------------------------------
// Categorías activas
// ----------------------------------------------------------------
publicApi.get('/categories', async (c) => {
  const type = c.req.query('type')
  let sql = 'SELECT * FROM categories WHERE active = 1'
  const params: unknown[] = []
  if (type) {
    sql += ' AND type = ?'
    params.push(type)
  }
  sql += ' ORDER BY sort_order, name'
  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  const data = (results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    type: r.type,
    description: r.description,
    image: { url: resolveImageUrl(r.image_url as string | null) },
  }))
  return c.json({ success: true, data })
})

// ----------------------------------------------------------------
// Listado de productos (filtros, orden, búsqueda)
// ----------------------------------------------------------------
publicApi.get('/products', async (c) => {
  const q = c.req.query('q')?.trim() ?? ''
  const type = c.req.query('type')
  const category = c.req.query('category')
  const sort = c.req.query('sort') ?? 'new'
  const inStock = c.req.query('in_stock') === '1'
  const offers = c.req.query('offers') === '1'
  const featured = c.req.query('featured') === '1'
  const min = Number(c.req.query('min') ?? 0)
  const max = c.req.query('max') ? Number(c.req.query('max')) : null
  const limit = Math.min(Number(c.req.query('limit') ?? 60), 100)
  const offset = Math.max(Number(c.req.query('offset') ?? 0), 0)

  const where: string[] = ['p.active = 1']
  const params: unknown[] = []

  if (type) {
    where.push('c.type = ?')
    params.push(type)
  }
  if (category) {
    where.push('c.slug = ?')
    params.push(category)
  }
  if (q) {
    where.push('(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)')
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (inStock) {
    where.push('p.stock > 0')
  }
  if (offers) {
    where.push('p.compare_price_cents IS NOT NULL AND p.compare_price_cents > p.price_cents')
  }
  if (featured) {
    where.push('p.featured = 1')
  }
  if (min > 0) {
    where.push('p.price_cents >= ?')
    params.push(min)
  }
  if (max != null && max > 0) {
    where.push('p.price_cents <= ?')
    params.push(max)
  }

  const orderBy: Record<string, string> = {
    new: 'p.created_at DESC, p.id DESC',
    featured: 'p.featured DESC, p.created_at DESC',
    price_asc: 'p.price_cents ASC',
    price_desc: 'p.price_cents DESC',
    name: 'p.name ASC',
    stock: 'p.stock ASC',
  }
  const order = orderBy[sort] ?? orderBy.new
  const totalSql = `SELECT COUNT(*) AS c FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${where.join(' AND ')}`
  const totalRow = await c.env.DB.prepare(totalSql).bind(...params).first<{ c: number }>()

  const sql = `SELECT p.*, c.name AS category_name, c.slug AS category_slug, c.type AS category_type,
     (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) AS image_url
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`

  const { results } = await c.env.DB.prepare(sql).bind(...params, limit, offset).all<ProductRow>()
  const data = (results ?? []).map(serializePublicProduct)
  return c.json({ success: true, data, total: totalRow?.c ?? 0 })
})

// ----------------------------------------------------------------
// Detalle de producto
// ----------------------------------------------------------------
publicApi.get('/products/:slug', async (c) => {
  const slug = c.req.param('slug')
  const row = await c.env.DB.prepare(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug, c.type AS category_type
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.slug = ? AND p.active = 1 LIMIT 1`,
  )
    .bind(slug)
    .first<ProductRow>()
  if (!row) throw notFound('El producto no existe.')

  const images = await c.env.DB.prepare(
    'SELECT id, image_url, alt FROM product_images WHERE product_id = ? ORDER BY sort_order, id',
  )
    .bind(row.id)
    .all<{ id: number; image_url: string | null; alt: string }>()

  const variants = row.has_variants === 1
    ? await c.env.DB.prepare(
        'SELECT id, name, size, color, price_cents, compare_price_cents, stock FROM product_variants WHERE product_id = ? AND active = 1 ORDER BY name',
      )
        .bind(row.id)
        .all()
    : { results: [] }

  const data = {
    ...serializePublicProduct(row),
    gallery: (images.results ?? []).map((img) => ({
      id: img.id,
      url: resolveImageUrl(img.image_url),
      alt: img.alt || row.name,
    })),
    variants: (variants.results ?? []).map((v: Record<string, unknown>) => ({
      id: v.id,
      name: v.name,
      size: v.size,
      color: v.color,
      price_cents: (v.price_cents as number | null) ?? row.price_cents,
      compare_price_cents: (v.compare_price_cents as number | null) ?? row.compare_price_cents,
      stock: v.stock,
    })),
  }
  return c.json({ success: true, data })
})

// ----------------------------------------------------------------
// Datos para la página de inicio
// ----------------------------------------------------------------
publicApi.get('/home', async (c) => {
  const settings = await getPublicSettings(c.env)
  const categories = (await c.env.DB.prepare(
    'SELECT * FROM categories WHERE active = 1 ORDER BY sort_order, name',
  ).all()).results ?? []

  const featuredRows = await c.env.DB.prepare(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug, c.type AS category_type,
      (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) AS image_url
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.active = 1 AND p.featured = 1
     ORDER BY p.updated_at DESC LIMIT 8`,
  ).all<ProductRow>()

  const whatsapp = await getSettingJson<{ number: string }>(c.env, 'whatsapp', { number: '5493434056155' })

  return c.json({
    success: true,
    data: {
      settings,
      whatsapp: whatsapp.number,
      categories: categories.map((r: Record<string, unknown>) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        type: r.type,
image: { url: resolveImageUrl(r.image_url as string | null) },
      })),
      featured: (featuredRows.results ?? []).map(serializePublicProduct),
    },
  })
})

export default publicApi