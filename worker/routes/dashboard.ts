import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { ensureOpenRegister } from '../lib/db'
import { localDateDisplay, todayStartUtcIso } from '../lib/dates'

const dashboardRoutes = new Hono<AppEnv>()

dashboardRoutes.get('/', async (c) => {
  const todayStart = todayStartUtcIso()

  const [todaySales, todayTotals, pendingOrders, stockInfo, lowStock, latestSales, monthSales, monthExpenses] =
    await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) AS count FROM sales WHERE created_at >= ?').bind(todayStart).first<{ count: number }>(),
      c.env.DB.prepare('SELECT COALESCE(SUM(total_cents), 0) AS total FROM sales WHERE created_at >= ?').bind(todayStart).first<{ total: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) AS count FROM orders WHERE status IN ('pendiente', 'confirmado', 'preparando', 'listo')").first<{ count: number }>(),
      c.env.DB.prepare('SELECT COALESCE(SUM(stock), 0) AS total FROM products WHERE active = 1').first<{ total: number }>(),
      c.env.DB.prepare(
        `SELECT id, name, stock, min_stock FROM products WHERE active = 1 AND (stock <= min_stock) ORDER BY stock ASC LIMIT 12`,
      )
        .all<{ id: number; name: string; stock: number; min_stock: number }>(),

      c.env.DB.prepare('SELECT * FROM sales WHERE created_at >= ? ORDER BY created_at DESC LIMIT 8')
        .bind(todayStart)
        .all(),
      c.env.DB.prepare(
        `SELECT COUNT(*) AS count, COALESCE(SUM(total_cents), 0) AS total FROM sales
         WHERE created_at >= date('now', 'start of month') AND created_at < date('now', 'start of month', '+1 month')`,
      ).first<{ count: number; total: number }>(),
      c.env.DB.prepare(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount_cents), 0) AS total FROM expenses
         WHERE date(date) >= date('now', 'start of month')`,
      ).first<{ count: number; total: number }>(),
    ])

  const lowStockList = (lowStock.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    stock: r.stock,
    min_stock: r.min_stock,
  }))

  // Caja esperada de hoy
  let cashExpected = 0
  let cashRegister = null
  try {
    const registerId = await ensureOpenRegister(c.env, localDateDisplay())
    const register = await c.env.DB.prepare(
      'SELECT id, opening_cents, status FROM cash_registers WHERE id = ?',
    ).bind(registerId).first<{ id: number; opening_cents: number; status: string }>()
    if (register) {
      const totals = await c.env.DB.prepare(
        `SELECT COALESCE(SUM(CASE WHEN direction = 'in' THEN amount_cents ELSE 0 END), 0) AS tin,
                COALESCE(SUM(CASE WHEN direction = 'out' THEN amount_cents ELSE 0 END), 0) AS tout
         FROM cash_movements WHERE cash_register_id = ?`,
      )
        .bind(register.id)
        .first<{ tin: number; tout: number }>()
      cashExpected = register.opening_cents + (totals?.tin ?? 0) - (totals?.tout ?? 0)
      cashRegister = { id: register.id, status: register.status }
    }
  } catch {
    cashExpected = 0
  }

  const paymentsToday = (await c.env.DB.prepare(
    `SELECT payment_method, SUM(total_cents) AS total FROM sales WHERE created_at >= ? GROUP BY payment_method`,
  )
    .bind(todayStart)
    .all()).results ?? []

  return c.json({
    success: true,
    data: {
      today: {
        sales_count: todaySales?.count ?? 0,
        total_cents: todayTotals?.total ?? 0,
        payments: paymentsToday.map((row: Record<string, unknown>) => ({
          method: row.payment_method,
          total_cents: Number(row.total ?? 0),
        })),
      },
      orders_pending: pendingOrders?.count ?? 0,
      total_stock: stockInfo?.total ?? 0,
      low_stock_count: lowStockList.filter((p) => p.stock <= p.min_stock).length,
      zero_stock: lowStockList.filter((p) => p.stock <= 0).length,
      low_stock_products: lowStockList,
      cash: {
        expected_cents: cashExpected,
        register: cashRegister,
      },
      latest_sales: (latestSales.results ?? []),
      month: {
        sales_count: monthSales?.count ?? 0,
        sales_total_cents: monthSales?.total ?? 0,
        expenses_count: monthExpenses?.count ?? 0,
        expenses_total_cents: monthExpenses?.total ?? 0,
      },
    },
  })
})

export default dashboardRoutes