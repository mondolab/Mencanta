import type { D1PreparedStatement } from '@cloudflare/workers-types'
import type { Env } from '../types'
import { badRequest, notFound } from './errors'
import { allowNegativeStock, ensureOpenRegister } from './db'
import { localDateDisplay, nowIso } from './dates'
import { planStockChanges } from './stock'
import { nextNumber } from './db'

export interface SaleItemInput {
  product_id: number
  variant_id?: number | null
  quantity: number
  unit_price_cents?: number | null
}

export interface CreateSaleOptions {
  items: SaleItemInput[]
  discount_cents?: number
  discount_percent?: number
  payment_method: string
  customer_name?: string
  customer_cuit?: string
  customer_id?: number | null
  source: 'showroom' | 'pedido'
  order_id?: number | null
  observations?: string
}

export interface LoadedProduct {
  id: number
  name: string
  price_cents: number
  cost_cents: number
  stock: number
  has_variants: number
}

/** Descuento en porcentaje (0-100) o, si viene por monto, acotado al subtotal. */
function percentDiscountCents(percent: number | undefined, subtotal: number, cents?: number): number {
  if (percent != null) {
    const clamped = Math.min(Math.max(percent, 0), 100)
    return Math.min(Math.round((subtotal * clamped) / 100), subtotal)
  }
  return Math.min(cents ?? 0, subtotal)
}

/**
 * Registra una venta de forma segura:
 * 1) inserta la venta, 2) el detalle, 3) descuenta stock con auditoría,
 * 4) registra movimiento de caja cuando corresponde,
 * 5) enlaza pedido si existe.
 */
export async function createSale(env: Env, opts: CreateSaleOptions) {
  const items = opts.items
  const allowNegative = await allowNegativeStock(env)

  // 1) Validar stock y cargar precios
  const loaded: Array<{ product: LoadedProduct; variantId: number | null; variantName: string; unitPrice: number; unitCost: number; quantity: number }> = []
  for (const item of items) {
    const product = await env.DB.prepare(
      'SELECT id, name, slug, price_cents, cost_cents, stock, has_variants FROM products WHERE id = ? AND active = 1',
    )
      .bind(item.product_id)
      .first<LoadedProduct & { name: string }>()
    if (!product) throw notFound('No se encontró el producto.')

    let variantName = ''
    let unitPrice = item.unit_price_cents ?? product.price_cents
    let unitCost = product.cost_cents
    let variantId: number | null = item.variant_id ?? null

    if (product.has_variants === 1) {
      if (!item.variant_id) throw badRequest('VARIANT_REQUIRED', `Elegí el tamaño/color de "${product.name}".`)
      const variant = await env.DB.prepare(
        'SELECT id, name, price_cents, cost_cents, stock FROM product_variants WHERE id = ? AND product_id = ? AND active = 1',
      )
        .bind(item.variant_id, product.id)
        .first<{ id: number; name: string; price_cents: number | null; cost_cents: number | null; stock: number }>()
      if (!variant) throw badRequest('INVALID_VARIANT', `La variante de "${product.name}" no es válida.`)
      variantId = variant.id
      variantName = variant.name
      unitPrice = item.unit_price_cents ?? variant.price_cents ?? product.price_cents
      unitCost = variant.cost_cents ?? product.cost_cents
      if (!allowNegative && variant.stock < item.quantity) {
        throw badRequest('INSUFFICIENT_STOCK', `Stock insuficiente de "${product.name}" (${variant.name}).`)
      }
    } else {
      if (!allowNegative && product.stock < item.quantity) {
        throw badRequest('INSUFFICIENT_STOCK', `Stock insuficiente de "${product.name}".`)
      }
    }

    loaded.push({
      product: product as LoadedProduct,
      variantId,
      variantName,
      unitPrice,
      unitCost,
      quantity: item.quantity,
    })
  }

  // 2) Totales
  let subtotal = 0
  for (const l of loaded) {
    subtotal += l.unitPrice * l.quantity
  }
  const discount = percentDiscountCents(opts.discount_percent, subtotal, opts.discount_cents)
  const total = subtotal - discount

  // 3) Número correlativo + caja
  const number = await nextNumber(env, 'sales', 'V')
  const registerId = await ensureOpenRegister(env, localDateDisplay())

  // 4) Plan de stock (venta)
  const stockStmts = await planStockChanges(
    env,
    loaded.map((l) => ({ productId: l.product.id, variantId: l.variantId, delta: -l.quantity })),
    { reference: `Venta ${number}`, movementType: 'venta', allowNegative },
  )

  // 5) Customer name
  let customerName = opts.customer_name?.trim() ?? ''
  if (opts.customer_id) {
    const customer = await env.DB.prepare('SELECT name FROM customers WHERE id = ?')
      .bind(opts.customer_id)
      .first<{ name: string }>()
    if (!customer) throw notFound('El cliente no existe.')
    customerName = customer.name
  }

  // 6) Insertar la venta (con número correlativo, dos fases por atomicidad del detalle)
  const inserted = await env.DB.prepare(
    `INSERT INTO sales (number, subtotal_cents, discount_cents, total_cents, payment_method, cash_register_id, customer_name, customer_cuit, customer_id, order_id, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id, number`,
  )
    .bind(
      number,
      subtotal,
      discount,
      total,
      opts.payment_method,
      registerId,
      customerName,
      opts.customer_cuit?.trim() ?? '',
      opts.customer_id ?? null,
      opts.order_id ?? null,
      opts.source,
    )
    .first<{ id: number; number: string }>()
  if (!inserted) throw badRequest('SALE_FAILED', 'No se pudo registrar la venta.')

  const stmts: D1PreparedStatement[] = []

  // Detalle
  for (const l of loaded) {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO sale_items (sale_id, product_id, variant_id, product_name, variant_name, quantity, unit_price_cents, unit_cost_cents, subtotal_cents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        inserted.id,
        l.product.id,
        l.variantId,
        l.product.name,
        l.variantName,
        l.quantity,
        l.unitPrice,
        l.unitCost,
        l.unitPrice * l.quantity,
      ),
    )
  }

  // Caja: sumar movimiento si es efectivo
  if (opts.payment_method === 'efectivo' && total > 0) {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO cash_movements (cash_register_id, type, description, amount_cents, direction, payment_method, reference, created_at)
         VALUES (?, 'venta_efectivo', ?, ?, 'in', 'efectivo', ?, ?)`,
      ).bind(registerId, `Venta ${number}`, total, `sale:${inserted.id}`, nowIso()),
    )
  }

  // Pedido vinculado → marcar entregado
  if (opts.order_id) {
    stmts.push(env.DB.prepare('UPDATE orders SET sale_id = ?, status = ?, updated_at = ? WHERE id = ?')
      .bind(inserted.id, 'entregado', nowIso(), opts.order_id))
  }

  // 7) Ejecutar atómicamente (stock + detalle + caja + pedido)
  stmts.push(...stockStmts)
  try {
    await env.DB.batch(stmts)
  } catch (error) {
    // limpiar venta huérfana si el lote falló
    await env.DB.prepare('DELETE FROM sales WHERE id = ?').bind(inserted.id).run().catch(() => undefined)
    throw error
  }

  return { id: inserted.id, number, subtotal, discount, total, payment_method: opts.payment_method }
}