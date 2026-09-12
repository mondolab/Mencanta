import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { saleInputSchema, idParamSchema } from '../validators'
import { badRequest, notFound } from '../lib/errors'
import { createSale } from '../lib/sales'
import { todayStartUtcIso } from '../lib/dates'

const salesRoutes = new Hono<AppEnv>()

// ---------------------------------------------------------------
// Listado de ventas con filtros
// ---------------------------------------------------------------
salesRoutes.get('/', async (c) => {
  const from = c.req.query('from')
  const to = c.req.query('to')
  const seq = c.req.query('seq')
  const where: string[] = ['1=1']
  const params: unknown[] = []

  if (from) {
    where.push('date(created_at) >= date(?)')
    params.push(from)
  }
  if (to) {
    where.push('date(created_at) <= date(?)')
    params.push(to)
  }
  if (seq === 'today') {
    where.push('created_at >= ?')
    params.push(todayStartUtcIso())
  }

  const { results } = await c.env.DB.prepare(
    `SELECT s.id, s.number, s.total_cents, s.discount_cents, s.subtotal_cents, s.payment_method,
            s.customer_name, s.source, s.created_at,
            (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS items_count,
            si2.quantity AS first_qty
     FROM sales s
     LEFT JOIN (SELECT si.sale_id, si.quantity FROM sale_items si GROUP BY si.sale_id ORDER BY si.id DESC) si2 ON si2.sale_id = s.id
     WHERE ${where.join(' AND ')}
     ORDER BY s.created_at DESC
     LIMIT 200`,
  )
    .bind(...params)
    .all()
  return c.json({ success: true, data: results ?? [] })
})

// ---------------------------------------------------------------
// Detalle de venta
// ---------------------------------------------------------------
salesRoutes.get('/:id', async (c) => {
  const id = idParamSchema.parse(c.req.param('id'))
  const sale = await c.env.DB.prepare('SELECT * FROM sales WHERE id = ?').bind(id).first<Record<string, unknown>>()
  if (!sale) throw notFound('La venta no existe.')
  const items = (await c.env.DB.prepare(
    'SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id',
  ).bind(id).all()).results ?? []
  return c.json({ success: true, data: { ...sale, items } })
})

// ---------------------------------------------------------------
// Alta de venta (showroom / POS)
// ---------------------------------------------------------------
salesRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = saleInputSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())

  const sale = await createSale(c.env, {
    items: parsed.data.items,
    discount_cents: parsed.data.discount_cents,
    discount_percent: parsed.data.discount_percent,
    payment_method: parsed.data.payment_method,
    customer_name: parsed.data.customer_name,
    customer_cuit: parsed.data.customer_cuit,
    customer_id: parsed.data.customer_id,
    source: 'showroom',
    observations: parsed.data.observations,
  })

  const done = await c.env.DB.prepare('SELECT * FROM sales WHERE id = ?').bind(sale.id).first()
  const items = (await c.env.DB.prepare('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id').bind(sale.id).all()).results ?? []
  return c.json({ success: true, data: { ...done, items } }, 201)
})

export default salesRoutes