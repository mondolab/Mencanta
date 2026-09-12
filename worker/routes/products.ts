import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { productInputSchema, idParamSchema } from '../validators'
import { badRequest, notFound } from '../lib/errors'
import { uniqueSlug } from '../lib/slug'
import { resolveImageUrl } from '../lib/serialize'
import { nowIso } from '../lib/dates'

const productsRoutes = new Hono<AppEnv>()

interface VariantRow {
  id: number
  name: string
  size: string
  color: string
  price_cents: number | null
  compare_price_cents: number | null
  cost_cents: number | null
  stock: number
  active: number
}

function decideHasVariants(hasVariants: boolean | undefined, variantCount: number): number {
  if (variantCount > 0) return 1
  return hasVariants ? 1 : 0
}

async function recomputeProductStock(db: D1Database, productId: number): Promise<number> {
  const row = await db.prepare(
    'SELECT COALESCE(SUM(stock), 0) AS total FROM product_variants WHERE product_id = ? AND active = 1',
  )
    .bind(productId)
    .first<{ total: number }>()
  return row?.total ?? 0
}

// ---------------------------------------------------------------
// Listado admin
// ---------------------------------------------------------------
productsRoutes.get('/', async (c) => {
  const q = c.req.query('q')?.trim() ?? ''
  const status = c.req.query('status') ?? 'todos'
  const where: string[] = ['1=1']
  const params: unknown[] = []
  if (q) {
    where.push('(p.name LIKE ? OR p.slug LIKE ?)')
    params.push(`%${q}%`, `%${q}%`)
  }
  if (status === 'activos') {
    where.push('p.active = 1')
  } else if (status === 'inactivos') {
    where.push('p.active = 0')
  }

  const { results } = await c.env.DB.prepare(
    `SELECT p.*, c.name AS category_name,
       (SELECT pi.image_key FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) AS image_key,
       (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) AS image_url
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${where.join(' AND ')}
     ORDER BY p.updated_at DESC`,
  )
    .bind(...params)
    .all()

  const data = (results ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    category_id: r.category_id,
    category_name: r.category_name ?? null,
    price_cents: r.price_cents,
    compare_price_cents: r.compare_price_cents,
    cost_cents: r.cost_cents,
    stock: r.stock,
    min_stock: r.min_stock,
    featured: r.featured === 1,
    active: r.active === 1,
    has_variants: r.has_variants === 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
    image: { url: resolveImageUrl(r.image_key as string | null, r.image_url as string | null) },
  }))
  return c.json({ success: true, data })
})

// ---------------------------------------------------------------
// Detalle admin (variantes e imágenes incluidas)
// ---------------------------------------------------------------
productsRoutes.get('/:id', async (c) => {
  const id = idParamSchema.parse(c.req.param('id'))
  const row = await c.env.DB.prepare(
    `SELECT p.*, c.name AS category_name FROM products p
     LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
  )
    .bind(id)
    .first<Record<string, unknown>>()
  if (!row) throw notFound('El producto no existe.')

  const images = (await c.env.DB.prepare(
    'SELECT id, image_key, image_url, alt, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order, id',
  )
    .bind(id)
    .all()).results ?? []

  const variants = (await c.env.DB.prepare(
    'SELECT * FROM product_variants WHERE product_id = ? ORDER BY name, id',
  )
    .bind(id)
    .all<VariantRow>()).results ?? []

  return c.json({
    success: true,
    data: {
      ...row,
      featured: row.featured === 1,
      active: row.active === 1,
      has_variants: row.has_variants === 1,
      images: images.map((img: Record<string, unknown>) => ({
        id: img.id,
        image_key: img.image_key,
        image_url: img.image_url,
        url: resolveImageUrl(img.image_key as string | null, img.image_url as string | null),
        alt: img.alt,
        sort_order: img.sort_order,
      })),
      variants: variants.map((v) => ({ ...v, active: v.active === 1 })),
    },
  })
})

// ---------------------------------------------------------------
// Crear producto
// ---------------------------------------------------------------
productsRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = productInputSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())

  const input = parsed.data
  const slug = input.slug ? await uniqueSlug(c.env.DB, 'products', input.slug) : await uniqueSlug(c.env.DB, 'products', input.name)
  const hasVariants = decideHasVariants(input.has_variants, input.variants.length)

  const initialStock = hasVariants ? 0 : (input.stock ?? 0)
  const res = await c.env.DB.prepare(
    `INSERT INTO products (name, slug, description, category_id, price_cents, compare_price_cents, cost_cents, stock, min_stock, featured, active, has_variants)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.name.trim(),
      slug,
      input.description,
      input.category_id ?? null,
      input.price_cents,
      input.compare_price_cents ?? null,
      input.cost_cents,
      initialStock,
      input.min_stock,
      input.featured ? 1 : 0,
      input.active ? 1 : 0,
      hasVariants,
    )
    .run()
  const productId = res.meta.last_row_id

  // Imágenes
  for (const img of input.images) {
    await c.env.DB.prepare(
      'INSERT INTO product_images (product_id, image_key, image_url, alt, sort_order) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(productId, img.image_key ?? null, img.image_url ?? null, img.alt, img.sort_order)
      .run()
  }

  // Variantes
  const stmts: D1PreparedStatement[] = []
  for (const v of input.variants) {
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO product_variants (product_id, name, size, color, price_cents, compare_price_cents, cost_cents, stock, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        productId,
        v.name.trim(),
        v.size,
        v.color,
        v.price_cents ?? null,
        v.compare_price_cents ?? null,
        v.cost_cents ?? null,
        v.stock,
        v.active ? 1 : 0,
      ),
    )
  }
  if (stmts.length > 0) await c.env.DB.batch(stmts)

  let stock = initialStock
  if (hasVariants) {
    stock = await recomputeProductStock(c.env.DB, productId)
    await c.env.DB.prepare('UPDATE products SET stock = ? WHERE id = ?').bind(stock, productId).run()
  }
  if (stock > 0) {
    await c.env.DB.prepare(
      `INSERT INTO stock_movements (product_id, type, quantity, stock_after, reference, created_at)
       VALUES (?, 'entrada', ?, ?, 'Alta de producto', ?)`,
    )
      .bind(productId, stock, stock, nowIso())
      .run()
  }

  const created = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first()
  return c.json({ success: true, data: created }, 201)
})

// ---------------------------------------------------------------
// Actualizar producto
// ---------------------------------------------------------------
productsRoutes.put('/:id', async (c) => {
  const id = idParamSchema.parse(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<{
    id: number
    name: string
    slug: string
    stock: number
    has_variants: number
  }>()
  if (!existing) throw notFound('El producto no existe.')

  const body = await c.req.json().catch(() => null)
  const parsed = productInputSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())

  const input = parsed.data
  const slug = input.slug && input.slug !== existing.slug
    ? await uniqueSlug(c.env.DB, 'products', input.slug, id)
    : existing.slug

  const hasVariants = decideHasVariants(input.has_variants, input.variants.length)

  const stmts: D1PreparedStatement[] = []
  const B = (sql: string, ...params: unknown[]) => c.env.DB.prepare(sql).bind(...params)

  // Campos base (stock se ajusta al final según variantes)
  stmts.push(
    B(
      `UPDATE products SET name = ?, slug = ?, description = ?, category_id = ?, price_cents = ?,
         compare_price_cents = ?, cost_cents = ?, min_stock = ?, featured = ?, active = ?, has_variants = ?, updated_at = ?
       WHERE id = ?`,
      input.name.trim(),
      slug,
      input.description,
      input.category_id ?? null,
      input.price_cents,
      input.compare_price_cents ?? null,
      input.cost_cents,
      input.min_stock,
      input.featured ? 1 : 0,
      input.active ? 1 : 0,
      hasVariants,
      nowIso(),
      id,
    ),
  )

  // Imágenes: eliminar marcadas y agregar nuevas
  if (input.delete_image_ids.length > 0) {
    for (const delId of input.delete_image_ids) {
      stmts.push(B('DELETE FROM product_images WHERE id = ? AND product_id = ?', delId, id))
    }
  }
  for (const img of input.images) {
    stmts.push(
      B(
        'INSERT INTO product_images (product_id, image_key, image_url, alt, sort_order) VALUES (?, ?, ?, ?, ?)',
        id,
        img.image_key ?? null,
        img.image_url ?? null,
        img.alt,
        img.sort_order,
      ),
    )
  }

  // Variantes: atualizar/crear/desactivar y calcular delta de stock
  const oldVariants = (await c.env.DB.prepare(
    'SELECT * FROM product_variants WHERE product_id = ?',
  ).bind(id).all<VariantRow>()).results ?? []
  const oldMap = new Map(oldVariants.map((v) => [v.id, v]))
  const seen = new Set<number>()
  let newAggregate = 0

  for (const v of input.variants) {
    const name = v.name.trim()
    if (v.id && oldMap.has(v.id)) {
      seen.add(v.id)
      if (v.active) newAggregate += v.stock
      stmts.push(
        B(
          `UPDATE product_variants SET name = ?, size = ?, color = ?, price_cents = ?, compare_price_cents = ?, cost_cents = ?, stock = ?, active = ?, updated_at = ?
           WHERE id = ? AND product_id = ?`,
          name,
          v.size,
          v.color,
          v.price_cents ?? null,
          v.compare_price_cents ?? null,
          v.cost_cents ?? null,
          v.stock,
          v.active ? 1 : 0,
          nowIso(),
          v.id,
          id,
        ),
      )
    } else {
      if (v.active) newAggregate += v.stock
      stmts.push(
        B(
          `INSERT INTO product_variants (product_id, name, size, color, price_cents, compare_price_cents, cost_cents, stock, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          name,
          v.size,
          v.color,
          v.price_cents ?? null,
          v.compare_price_cents ?? null,
          v.cost_cents ?? null,
          v.stock,
          v.active ? 1 : 0,
        ),
      )
    }
  }
  // Variantes no enviadas se desactivan (no se pierde auditoría)
  for (const old of oldVariants) {
    if (!seen.has(old.id)) {
      stmts.push(B('UPDATE product_variants SET active = 0, updated_at = ? WHERE id = ?', nowIso(), old.id))
    }
  }

  // Stock contable
  let stockAfter: number
  if (hasVariants) {
    stockAfter = newAggregate
  } else {
    stockAfter = input.stock ?? existing.stock
  }
  stmts.push(B('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', stockAfter, nowIso(), id))

  // Auditoría si cambió el stock
  if (stockAfter !== existing.stock) {
    stmts.push(
      B(
        `INSERT INTO stock_movements (product_id, type, quantity, stock_after, reference, created_at)
         VALUES (?, 'ajuste', ?, ?, 'Edición de producto', ?)`,
        id,
        stockAfter - existing.stock,
        stockAfter,
        nowIso(),
      ),
    )
  }

  await c.env.DB.batch(stmts)

  const updated = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: updated })
})

// ---------------------------------------------------------------
// Eliminar producto
// ---------------------------------------------------------------
productsRoutes.delete('/:id', async (c) => {
  const id = idParamSchema.parse(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first()
  if (!existing) throw notFound('El producto no existe.')
  await c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run()
  return c.json({ success: true, data: { id } })
})

export default productsRoutes