import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { expenseInputSchema, idParamSchema } from '../validators'
import { badRequest, notFound } from '../lib/errors'
import { ensureOpenRegister } from '../lib/db'
import { localDateDisplay, nowIso } from '../lib/dates'

const expensesRoutes = new Hono<AppEnv>()

async function linkCashMovement(env: AppEnv['Bindings'], expenseId: number, amountCents: number, description: string): Promise<void> {
  const registerId = await ensureOpenRegister(env, localDateDisplay())
  const res = await env.DB.prepare(
    `INSERT INTO cash_movements (cash_register_id, type, description, amount_cents, direction, payment_method, reference, created_at)
     VALUES (?, 'gasto', ?, ?, 'out', 'efectivo', ?, ?)`,
  )
    .bind(registerId, description, amountCents, `expense:${expenseId}`, nowIso())
    .run()
  await env.DB.prepare('UPDATE expenses SET cash_movement_id = ? WHERE id = ?')
    .bind(res.meta.last_row_id, expenseId)
    .run()
}

function needsCash(paymentMethod: string): boolean {
  return paymentMethod === 'efectivo'
}

// ---------------------------------------------------------------
// Listado
// ---------------------------------------------------------------
expensesRoutes.get('/', async (c) => {
  const from = c.req.query('from')
  const to = c.req.query('to')
  const category = c.req.query('category')
  const where: string[] = ['1=1']
  const params: unknown[] = []
  if (from) {
    where.push('date(date) >= date(?)')
    params.push(from)
  }
  if (to) {
    where.push('date(date) <= date(?)')
    params.push(to)
  }
  if (category && category !== 'todas') {
    where.push('category = ?')
    params.push(category)
  }

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM expenses WHERE ${where.join(' AND ')} ORDER BY date DESC, id DESC LIMIT 500`,
  )
    .bind(...params)
    .all()
  return c.json({ success: true, data: results ?? [] })
})

// ---------------------------------------------------------------
// Crear gasto
// ---------------------------------------------------------------
expensesRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = expenseInputSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())
  const input = parsed.data

  const date = input.date ? new Date(input.date).toISOString() : nowIso()

  const res = await c.env.DB.prepare(
    `INSERT INTO expenses (concept, description, amount_cents, payment_method, category, notes, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.concept.trim(),
      input.description,
      input.amount_cents,
      input.payment_method,
      input.category,
      input.notes,
      date,
    )
    .run()
  const expenseId = res.meta.last_row_id

  if (needsCash(input.payment_method)) {
    await linkCashMovement(c.env, expenseId, input.amount_cents, `Gasto: ${input.concept.trim()}`)
  }

  const created = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ?').bind(expenseId).first()
  return c.json({ success: true, data: created }, 201)
})

// ---------------------------------------------------------------
// Actualizar gasto (recalcula el movimiento de caja asociado)
// ---------------------------------------------------------------
expensesRoutes.put('/:id', async (c) => {
  const id = idParamSchema.parse(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ?').bind(id).first<Record<string, unknown>>()
  if (!existing) throw notFound('El gasto no existe.')

  const body = await c.req.json().catch(() => null)
  const parsed = expenseInputSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())
  const input = parsed.data

  const date = input.date ? new Date(input.date).toISOString() : existing.date

  await c.env.DB.prepare(
    `UPDATE expenses SET concept = ?, description = ?, amount_cents = ?, payment_method = ?, category = ?, notes = ?, date = ?
     WHERE id = ?`,
  )
    .bind(
      input.concept.trim(),
      input.description,
      input.amount_cents,
      input.payment_method,
      input.category,
      input.notes,
      date,
      id,
    )
    .run()

  const oldInCash = needsCash(String(existing.payment_method))
  const newInCash = needsCash(input.payment_method)
  const oldCashMovementId = existing.cash_movement_id ? Number(existing.cash_movement_id) : null

  if (newInCash && !oldInCash) {
    await linkCashMovement(c.env, id, input.amount_cents, `Gasto: ${input.concept.trim()}`)
  } else if (!newInCash && oldInCash && oldCashMovementId) {
    await c.env.DB.prepare('DELETE FROM cash_movements WHERE id = ?').bind(oldCashMovementId).run()
    await c.env.DB.prepare('UPDATE expenses SET cash_movement_id = NULL WHERE id = ?').bind(id).run()
  } else if (newInCash && oldInCash && oldCashMovementId) {
    await c.env.DB.prepare(
      'UPDATE cash_movements SET amount_cents = ?, description = ? WHERE id = ?',
    ).bind(input.amount_cents, `Gasto: ${input.concept.trim()}`, oldCashMovementId).run()
  }

  const updated = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: updated })
})

// ---------------------------------------------------------------
// Eliminar gasto
// ---------------------------------------------------------------
expensesRoutes.delete('/:id', async (c) => {
  const id = idParamSchema.parse(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ?').bind(id).first<Record<string, unknown>>()
  if (!existing) throw notFound('El gasto no existe.')

  const cashMovementId = existing.cash_movement_id ? Number(existing.cash_movement_id) : null
  await c.env.DB.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run()
  if (cashMovementId) {
    await c.env.DB.prepare('DELETE FROM cash_movements WHERE id = ?').bind(cashMovementId).run()
  }
  return c.json({ success: true, data: { id } })
})

export default expensesRoutes