import type { D1PreparedStatement } from '@cloudflare/workers-types'
import type { Env } from '../types'
import { badRequest, notFound } from './errors'
import { nowIso } from './dates'

export type StockMovementType = 'entrada' | 'venta' | 'ajuste' | 'perdida' | 'devolucion'

export interface StockChange {
  productId: number
  variantId?: number | null
  /** delta con signo: positivo suma stock, negativo resta */
  delta: number
}

export interface StockPlanCommand {
  stmt: D1PreparedStatement
  sql: string
  params: unknown[]
}

/**
 * Planifica cambios de stock para ejecutarse de forma atómica con `DB.batch`.
 * Valida stock disponible ANTES de construir la operación (a menos que
 * `allowNegative` esté activo). Cada producto afectado genera además un
 * movimiento de inventario (auditoría).
 */
export async function planStockChanges(
  env: Env,
  changes: StockChange[],
  opts: { reference: string; movementType: StockMovementType; allowNegative: boolean },
): Promise<D1PreparedStatement[]> {
  if (changes.length === 0) return []

  const stmts: D1PreparedStatement[] = []
  const productNet: Map<number, number> = new Map()

  // 1) Validar y preparar updates a nivel variante / producto
  for (const change of changes) {
    const B = (sql: string, ...params: unknown[]) => env.DB.prepare(sql).bind(...params)

    if (change.variantId) {
      const variant = await env.DB.prepare(
        `SELECT v.id, v.product_id, v.stock, p.has_variants AS pv
         FROM product_variants v JOIN products p ON p.id = v.product_id
         WHERE v.id = ?`,
      )
        .bind(change.variantId)
        .first<{ id: number; product_id: number; stock: number }>()
      if (!variant || variant.product_id !== change.productId) throw notFound('No se encontró la variante.')
      const next = variant.stock + change.delta
      if (next < 0 && !opts.allowNegative) {
        throw badRequest('INSUFFICIENT_STOCK', 'No hay stock suficiente.')
      }
      stmts.push(B('UPDATE product_variants SET stock = ?, updated_at = ? WHERE id = ?', next, nowIso(), change.variantId))
      productNet.set(variant.product_id, (productNet.get(variant.product_id) ?? 0) + change.delta)
    } else {
      const product = await env.DB.prepare('SELECT id, stock FROM products WHERE id = ?')
        .bind(change.productId)
        .first<{ id: number; stock: number }>()
      if (!product) throw notFound('No se encontró el producto.')
      const next = product.stock + change.delta
      if (next < 0 && !opts.allowNegative) {
        throw badRequest('INSUFFICIENT_STOCK', 'No hay stock suficiente.')
      }
      productNet.set(product.id, (productNet.get(product.id) ?? 0) + change.delta)
    }
    const B2 = (sql: string, ...params: unknown[]) => env.DB.prepare(sql).bind(...params)
    void B2
  }

  // 2) Por producto: actualizar agregado + guardar movimiento
  for (const [productId, net] of productNet) {
    const product = await env.DB.prepare('SELECT stock FROM products WHERE id = ?')
      .bind(productId)
      .first<{ stock: number }>()
    if (!product) throw notFound('No se encontró el producto.')
    const stockAfter = product.stock + net
    stmts.push(
      env.DB.prepare(
        `UPDATE products
         SET stock = (SELECT COALESCE(SUM(v.stock), 0) FROM product_variants v WHERE v.product_id = ?),
             updated_at = ?
         WHERE id = ? AND (SELECT COUNT(*) FROM product_variants WHERE product_id = ?) > 0`,
      ).bind(productId, nowIso(), productId, productId),
    )
    stmts.push(
      env.DB.prepare(
        'UPDATE products SET stock = ?, updated_at = ? WHERE id = ? AND (SELECT COUNT(*) FROM product_variants WHERE product_id = ?) = 0',
      ).bind(stockAfter, nowIso(), productId, productId),
    )
    stmts.push(
      env.DB.prepare(
        `INSERT INTO stock_movements (product_id, type, quantity, stock_after, reference, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(productId, opts.movementType, net, stockAfter, opts.reference, nowIso()),
    )
  }

  return stmts
}