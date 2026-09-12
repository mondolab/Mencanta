import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { cashOpenSchema, cashMovementSchema, cashCloseSchema } from '../validators'
import { badRequest, conflict, notFound } from '../lib/errors'
import { ensureOpenRegister } from '../lib/db'
import { localDateDisplay, nowIso, todayStartUtcIso } from '../lib/dates'

const cashRoutes = new Hono<AppEnv>()

interface RegisterRow {
  id: number
  date: string
  opened_at: string
  closed_at: string | null
  opening_cents: number
  expected_cents: number
  counted_cents: number | null
  difference_cents: number | null
  status: string
  observations: string
}

interface RegisterTotals {
  in: number
  out: number
}

async function registerTotals(db: D1Database, registerId: number): Promise<RegisterTotals> {
  const row = await db.prepare(
    `SELECT COALESCE(SUM(CASE WHEN direction = 'in' THEN amount_cents ELSE 0 END), 0) AS total_in,
            COALESCE(SUM(CASE WHEN direction = 'out' THEN amount_cents ELSE 0 END), 0) AS total_out
     FROM cash_movements WHERE cash_register_id = ?`,
  )
    .bind(registerId)
    .first<{ total_in: number; total_out: number }>()
  return { in: row?.total_in ?? 0, out: row?.total_out ?? 0 }
}

// ---------------------------------------------------------------
// Estado actual de la caja
// ---------------------------------------------------------------
cashRoutes.get('/', async (c) => {
  const today = localDateDisplay()
  const register = await c.env.DB.prepare(
    'SELECT * FROM cash_registers WHERE date = ? AND status = "abierta" ORDER BY id DESC LIMIT 1',
  )
    .bind(today)
    .first<RegisterRow>()

  const movements = register
    ? (await c.env.DB.prepare(
        'SELECT * FROM cash_movements WHERE cash_register_id = ? ORDER BY created_at DESC, id DESC LIMIT 200',
      ).bind(register.id).all()).results ?? []
    : []

  let totals = { in: 0, out: 0 }
  let expected = 0
  if (register) {
    totals = await registerTotals(c.env.DB, register.id)
    expected = register.opening_cents + totals.in - totals.out
  }

  // Ventas de hoy por medio de pago
  const salesByPayment = (await c.env.DB.prepare(
    `SELECT payment_method, SUM(total_cents) AS total
     FROM sales WHERE created_at >= ?
     GROUP BY payment_method`,
  )
    .bind(todayStartUtcIso())
    .all()).results ?? []

  const byMethod: Record<string, number> = {}
  let totalSoldToday = 0
  for (const row of salesByPayment) {
    const amount = Number(row.total ?? 0)
    byMethod[String(row.payment_method)] = amount
    totalSoldToday += amount
  }

  return c.json({
    success: true,
    data: {
      register,
      movements,
      totals,
      expected,
      today: {
        by_method: byMethod,
        total_sold: totalSoldToday,
        efectivo: byMethod['efectivo'] ?? 0,
        transferencia: byMethod['transferencia'] ?? 0,
        tarjetas: (byMethod['debito'] ?? 0) + (byMethod['credito'] ?? 0),
      },
    },
  })
})

// ---------------------------------------------------------------
// Abrir caja
// ---------------------------------------------------------------
cashRoutes.post('/open', async (c) => {
  const today = localDateDisplay()
  const body = await c.req.json().catch(() => null)
  const parsed = cashOpenSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())

  const existing = await c.env.DB.prepare(
    'SELECT * FROM cash_registers WHERE date = ? AND status = "abierta" ORDER BY id DESC LIMIT 1',
  )
    .bind(today)
    .first<RegisterRow>()

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE cash_registers SET opening_cents = ?, observations = ? WHERE id = ?',
    ).bind(parsed.data.opening_cents, parsed.data.observations || existing.observations, existing.id).run()
    const updated = await c.env.DB.prepare('SELECT * FROM cash_registers WHERE id = ?').bind(existing.id).first()
    return c.json({ success: true, data: updated })
  }

  const res = await c.env.DB.prepare(
    'INSERT INTO cash_registers (date, opened_at, opening_cents, observations) VALUES (?, ?, ?, ?)',
  )
    .bind(today, nowIso(), parsed.data.opening_cents, parsed.data.observations)
    .run()
  const created = await c.env.DB.prepare('SELECT * FROM cash_registers WHERE id = ?').bind(res.meta.last_row_id).first()
  return c.json({ success: true, data: created }, 201)
})

// ---------------------------------------------------------------
// Movimiento manual de caja (ingreso / retiro / ajuste)
// ---------------------------------------------------------------
cashRoutes.post('/movements', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = cashMovementSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())

  const registerId = await ensureOpenRegister(c.env, localDateDisplay())
  let direction = parsed.data.direction
  if (!direction) {
    direction = parsed.data.type === 'ingreso' ? 'in' : parsed.data.type === 'retiro' ? 'out' : 'in'
  }

  const description = parsed.data.description
  await c.env.DB.prepare(
    `INSERT INTO cash_movements (cash_register_id, type, description, amount_cents, direction, payment_method, reference, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      registerId,
      parsed.data.type,
      description,
      parsed.data.amount_cents,
      direction,
      parsed.data.payment_method,
      'manual',
      nowIso(),
    )
    .run()

  const movement = await c.env.DB.prepare('SELECT * FROM cash_movements ORDER BY id DESC LIMIT 1').first()
  return c.json({ success: true, data: movement }, 201)
})

// ---------------------------------------------------------------
// Historial de cierres
// ---------------------------------------------------------------
cashRoutes.get('/registers', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM cash_registers ORDER BY date DESC, id DESC LIMIT 60',
  ).all()
  return c.json({ success: true, data: results ?? [] })
})

// ---------------------------------------------------------------
// Arqueo / cierre de caja
// ---------------------------------------------------------------
cashRoutes.post('/close', async (c) => {
  const today = localDateDisplay()
  const register = await c.env.DB.prepare(
    'SELECT * FROM cash_registers WHERE date = ? AND status = "abierta" ORDER BY id DESC LIMIT 1',
  )
    .bind(today)
    .first<RegisterRow>()
  if (!register) throw conflict('NO_OPEN_REGISTER', 'No hay una caja abierta para cerrar.')

  const body = await c.req.json().catch(() => null)
  const parsed = cashCloseSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())

  const totals = await registerTotals(c.env.DB, register.id)
  const expected = register.opening_cents + totals.in - totals.out
  const difference = parsed.data.counted_cents - expected

  await c.env.DB.prepare(
    `UPDATE cash_registers SET closed_at = ?, expected_cents = ?, counted_cents = ?, difference_cents = ?, status = 'cerrada', observations = ?
     WHERE id = ?`,
  )
    .bind(
      nowIso(),
      expected,
      parsed.data.counted_cents,
      difference,
      parsed.data.observations || register.observations,
      register.id,
    )
    .run()

  const closed = await c.env.DB.prepare('SELECT * FROM cash_registers WHERE id = ?').bind(register.id).first()
  return c.json({ success: true, data: closed })
})

// ---------------------------------------------------------------
// Reabrir una caja cerrada (acción administrativa explícita)
// ---------------------------------------------------------------
cashRoutes.post('/:id/reopen', async (c) => {
  const id = Number(c.req.param('id'))
  const register = await c.env.DB.prepare('SELECT * FROM cash_registers WHERE id = ?').bind(id).first<RegisterRow>()
  if (!register) throw notFound('La caja no existe.')
  await c.env.DB.prepare(
    `UPDATE cash_registers SET status = 'abierta', closed_at = NULL, counted_cents = NULL, difference_cents = NULL WHERE id = ?`,
  ).bind(id).run()
  const reopened = await c.env.DB.prepare('SELECT * FROM cash_registers WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: reopened })
})

export default cashRoutes