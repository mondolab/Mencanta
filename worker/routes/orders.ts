import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { orderCreateSchema, orderUpdateSchema, idParamSchema } from '../validators'
import { badRequest, conflict, notFound } from '../lib/errors'
import { createSale } from '../lib/sales'
import { getSettingJson, nextNumber } from '../lib/db'
import { nowIso } from '../lib/dates'
import { z } from 'zod'
import type { D1PreparedStatement } from '@cloudflare/workers-types'

const ordersRoutes = new Hono<AppEnv>()

// ---------------------------------------------------------------
// Crear pedido (público — se guarda, no descuenta stock)
// ---------------------------------------------------------------
ordersRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = orderCreateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())

  // subcategoría precios
  const items: Array<{ product_id: number; variant_id?: number | null; product_name: string; variant_name: string; quantity: number; unit_price_cents: number }> = []
  let subtotal = 0
  for (const item of parsed.data.items) {
    const product = await c.env.DB.prepare(
      'SELECT id, name, price_cents, has_variants FROM products WHERE id = ? AND active = 1',
    )
      .bind(item.product_id)
      .first<{ id: number; name: string; price_cents: number; has_variants: number }>()
    if (!product) throw notFound('No se encontró un producto del pedido.')

    let variantName = ''
    let price = product.price_cents
    if (product.has_variants === 1) {
      if (!item.variant_id) throw badRequest('VARIANT_REQUIRED', `Elegí el tamaño/color de "${product.name}".`)
      const variant = await c.env.DB.prepare(
        'SELECT id, name, price_cents, stock FROM product_variants WHERE id = ? AND product_id = ? AND active = 1',
      )
        .bind(item.variant_id, product.id)
        .first<{ id: number; name: string; price_cents: number | null; stock: number }>()
      if (!variant) throw badRequest('INVALID_VARIANT', 'La variante de un producto no es válida.')
      variantName = variant.name
      price = variant.price_cents ?? product.price_cents
    }

    items.push({
      product_id: product.id,
      variant_id: item.variant_id ?? null,
      product_name: product.name,
      variant_name: variantName,
      quantity: item.quantity,
      unit_price_cents: price,
    })
    subtotal += price * item.quantity
  }

  // envío (reglas configuradas)
  const shipping = await getSettingJson<{ cost_cents?: number; min_order_free_cents?: number }>(c.env, 'shipping', {})
  let shippingCents = 0
  if (parsed.data.delivery_type === 'envio') {
    const freeFrom = shipping.min_order_free_cents ?? 0
    if (subtotal < freeFrom) {
      shippingCents = shipping.cost_cents ?? 0
    }
  }
  const total = subtotal + shippingCents

  const number = await nextNumber(c.env, 'orders', 'P')
  const inserted = await c.env.DB.prepare(
    `INSERT INTO orders (number, customer_name, customer_phone, delivery_type, subtotal_cents, shipping_cents, total_cents, status, observations, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, 'web')
     RETURNING id, number`,
  )
    .bind(
      number,
      parsed.data.customer_name.trim(),
      parsed.data.customer_phone.trim(),
      parsed.data.delivery_type,
      subtotal,
      shippingCents,
      total,
      parsed.data.observations,
    )
    .first<{ id: number; number: string }>()
  if (!inserted) throw badRequest('ORDER_FAILED', 'No se pudo generar el pedido.')

  const stmts: D1PreparedStatement[] = []
  for (const item of items) {
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price_cents, subtotal_cents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        inserted.id,
        item.product_id,
        item.variant_id,
        item.product_name,
        item.variant_name,
        item.quantity,
        item.unit_price_cents,
        item.unit_price_cents * item.quantity,
      ),
    )
  }
  await c.env.DB.batch(stmts)

  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(inserted.id).first()
  const orderItems = (await c.env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(inserted.id).all()).results ?? []
  return c.json({ success: true, data: { ...order, items: orderItems } }, 201)
})

// ---------------------------------------------------------------
// Listado admin de pedidos
// ---------------------------------------------------------------
ordersRoutes.get('/', async (c) => {
  const status = c.req.query('status')
  const seq = c.req.query('seq')
  const where: string[] = ['1=1']
  const params: unknown[] = []
  if (status && status !== 'todos') {
    where.push('status = ?')
    params.push(status)
  }
  if (seq === 'pendientes') {
    where.push("status IN ('pendiente', 'confirmado', 'preparando', 'listo')")
  }
  const { results } = await c.env.DB.prepare(
    `SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
     FROM orders o
     WHERE ${where.join(' AND ')}
     ORDER BY CASE WHEN o.status = 'pendiente' THEN 0 WHEN o.status = 'confirmado' THEN 1 WHEN o.status='preparando' THEN 2 WHEN o.status='listo' THEN 3 ELSE 4 END, o.created_at DESC`,
  )
    .bind(...params)
    .all()
  return c.json({ success: true, data: results ?? [] })
})

// ---------------------------------------------------------------
// Detalle de pedido
// ---------------------------------------------------------------
ordersRoutes.get('/:id', async (c) => {
  const id = idParamSchema.parse(c.req.param('id'))
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<Record<string, unknown>>()
  if (!order) throw notFound('El pedido no existe.')
  const items = (await c.env.DB.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').bind(id).all()).results ?? []
  return c.json({ success: true, data: { ...order, items } })
})

// ---------------------------------------------------------------
// Actualizar pedido (estado / datos)
// ---------------------------------------------------------------
ordersRoutes.put('/:id', async (c) => {
  const id = idParamSchema.parse(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<Record<string, unknown>>()
  if (!existing) throw notFound('El pedido no existe.')

  const body = await c.req.json().catch(() => null)
  const parsed = orderUpdateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())

  const status = parsed.data.status ?? existing.status

  await c.env.DB.prepare(
    `UPDATE orders SET
       status = ?, observations = ?, customer_name = ?, customer_phone = ?, delivery_type = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      status,
      parsed.data.observations ?? existing.observations,
      parsed.data.customer_name ?? existing.customer_name,
      parsed.data.customer_phone ?? existing.customer_phone,
      parsed.data.delivery_type ?? existing.delivery_type,
      nowIso(),
      id,
    )
    .run()

  const updated = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: updated })
})

// ---------------------------------------------------------------
// Convertir pedido en venta (stock + caja + estado)
// ---------------------------------------------------------------
ordersRoutes.post('/:id/convert', async (c) => {
  const id = idParamSchema.parse(c.req.param('id'))
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<{
    id: number
    number: string
    status: string
    sale_id: number | null
    total_cents: number
    customer_name: string
    delivery_type: string
  }>()
  if (!order) throw notFound('El pedido no existe.')
  if (order.status === 'cancelado') throw conflict('ORDER_CANCELLED', 'No se puede registrar un pedido cancelado.')
  if (order.sale_id) throw conflict('ALREADY_CONVERTED', 'Este pedido ya fue registrado como venta.')

  const items = (await c.env.DB.prepare(
    'SELECT product_id, variant_id, quantity, unit_price_cents FROM order_items WHERE order_id = ? ORDER BY id',
  ).bind(id).all()).results ?? []

  const body = await c.req.json().catch(() => null) ?? {}
  const convertSchema = z.object({
    payment_method: z.enum(['efectivo', 'transferencia', 'debito', 'credito', 'mercado_pago', 'otro']).default('efectivo'),
    discount_cents: z.number().int().nonnegative().default(0),
    discount_percent: z.number().nonnegative().max(100).optional(),
  })
  const convertInput = convertSchema.safeParse(body)
  const paymentMethod = convertInput.success ? convertInput.data.payment_method : 'efectivo'
  const discountCents = convertInput.success ? convertInput.data.discount_cents : 0
  const discountPercent = convertInput.success ? convertInput.data.discount_percent : undefined

  const sale = await createSale(c.env, {
    items: items.map((it: Record<string, unknown>) => ({
      product_id: Number(it.product_id),
      variant_id: it.variant_id ? Number(it.variant_id) : null,
      quantity: Number(it.quantity),
      unit_price_cents: Number(it.unit_price_cents),
    })),
    discount_cents: discountCents,
    discount_percent: discountPercent,
    payment_method: paymentMethod,
    customer_name: order.customer_name,
    source: 'pedido',
    order_id: order.id,
  })

  const done = await c.env.DB.prepare('SELECT * FROM sales WHERE id = ?').bind(sale.id).first()
  return c.json({ success: true, data: done }, 201)
})

export default ordersRoutes