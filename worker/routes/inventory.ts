import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { stockAdjustSchema } from '../validators'
import { badRequest } from '../lib/errors'
import { planStockChanges } from '../lib/stock'
import { nowIso } from '../lib/dates'
import type { StockMovementType } from '../lib/stock'

const inventoryRoutes = new Hono<AppEnv>()

function stockStatus(stock: number, minStock: number): 'normal' | 'bajo' | 'sin_stock' {
  if (stock <= 0) return 'sin_stock'
  if (minStock > 0 && stock < minStock) return 'bajo'
  return 'normal'
}

// ---------------------------------------------------------------
// Inventario completo
// ---------------------------------------------------------------
inventoryRoutes.get('/', async (c) => {
  const q = c.req.query('q')?.trim() ?? ''
  const status = c.req.query('status') ?? 'todos'
  const where: string[] = ['1=1']
  const params: unknown[] = []
  if (q) {
    where.push('p.name LIKE ?')
    params.push(`%${q}%`)
  }

  const { results } = await c.env.DB.prepare(
    `SELECT p.id, p.name, p.slug, p.stock, p.min_stock, p.has_variants, p.active, p.category_id,
            c.name AS category_name,
            (SELECT MAX(m.created_at) FROM stock_movements m WHERE m.product_id = p.id) AS last_movement,
            (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id AND v.active = 1) AS variants_count,
            (SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id = p.id AND v.active = 1) AS variants_stock
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${where.join(' AND ')}
     ORDER BY p.name`,
  )
    .bind(...params)
    .all()

  let data = (results ?? []).map((r: Record<string, unknown>) => {
    const stock = Number(r.stock ?? 0)
    const minStock = Number(r.min_stock ?? 0)
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      stock,
      min_stock: minStock,
      status: stockStatus(stock, minStock),
      active: r.active === 1,
      category_name: r.category_name ?? null,
      variants_count: Number(r.variants_count ?? 0),
      variants_stock: Number(r.variants_stock ?? 0),
      last_movement: r.last_movement ?? null,
    }
  })

  if (status === 'bajo') data = data.filter((d) => d.status === 'bajo')
  if (status === 'sin_stock') data = data.filter((d) => d.status === 'sin_stock')
  if (status === 'normal') data = data.filter((d) => d.status === 'normal')

  return c.json({ success: true, data })
})

// ---------------------------------------------------------------
// Variantes de un producto (para ajustes puntuales)
// ---------------------------------------------------------------
inventoryRoutes.get('/variants/:productId', async (c) => {
  const productId = Number(c.req.param('productId'))
  const variants = (await c.env.DB.prepare(
    'SELECT id, name, size, color, stock, active FROM product_variants WHERE product_id = ? ORDER BY name',
  ).bind(productId).all()).results ?? []
  return c.json({ success: true, data: variants })
})

// ---------------------------------------------------------------
// Movimientos (historial)
// ---------------------------------------------------------------
inventoryRoutes.get('/movements', async (c) => {
  const productId = c.req.query('product_id') ? Number(c.req.query('product_id')) : null
  const type = c.req.query('type')
  const limit = Math.min(Number(c.req.query('limit') ?? 200), 500)
  const where: string[] = ['1=1']
  const params: unknown[] = []
  if (productId) {
    where.push('m.product_id = ?')
    params.push(productId)
  }
  if (type && type !== 'todos') {
    where.push('m.type = ?')
    params.push(type)
  }

  const { results } = await c.env.DB.prepare(
    `SELECT m.*, p.name AS product_name FROM stock_movements m
     JOIN products p ON p.id = m.product_id
     WHERE ${where.join(' AND ')}
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT ?`,
  )
    .bind(...params, limit)
    .all()
  return c.json({ success: true, data: results ?? [] })
})

// ---------------------------------------------------------------
// Registrar movimiento de stock (entrada / ajuste / pérdida / devolución)
// ---------------------------------------------------------------
inventoryRoutes.post('/movements', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = stockAdjustSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())

  const input = parsed.data
  let signed: number
  if (input.type === 'entrada' || input.type === 'devolucion') signed = input.quantity
  else if (input.type === 'perdida') signed = -input.quantity
  else signed = input.direction === 'out' ? -input.quantity : input.quantity

  const allowNegative = false
  const reference = input.reference || (input.type === 'entrada' ? 'Entrada de mercadería' : 'Ajuste manual')

  const stmts = await planStockChanges(
    c.env,
    [{ productId: input.product_id, variantId: input.variant_id ?? null, delta: signed }],
    { reference, movementType: input.type as StockMovementType, allowNegative },
  )
  await c.env.DB.batch(stmts)

  const product = await c.env.DB.prepare('SELECT id, name, stock, min_stock FROM products WHERE id = ?')
    .bind(input.product_id)
    .first<{ id: number; name: string; stock: number; min_stock: number }>()

  return c.json({
    success: true,
    data: {
      ok: true,
      product: product
        ? { id: product.id, name: product.name, stock: product.stock, status: stockStatus(product.stock, product.min_stock) }
        : null,
      created_at: nowIso(),
    },
  })
})

export default inventoryRoutes