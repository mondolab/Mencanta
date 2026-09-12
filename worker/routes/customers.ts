import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { customerInputSchema, idParamSchema } from '../validators'
import { badRequest, notFound } from '../lib/errors'

const customersRoutes = new Hono<AppEnv>()

customersRoutes.get('/', async (c) => {
  const q = c.req.query('q')?.trim() ?? ''
  const where = ['1=1']
  const params: unknown[] = []
  if (q) {
    where.push('(name LIKE ? OR phone LIKE ? OR email LIKE ? OR city LIKE ?)')
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
  }
  const { results } = await c.env.DB.prepare(
    `SELECT c.*,
       (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id) AS sales_count,
       (SELECT COUNT(*) FROM orders o WHERE o.customer_phone = c.phone AND o.customer_phone != '') AS orders_count
     FROM customers c
     WHERE ${where.join(' AND ')}
     ORDER BY c.name
     LIMIT 300`,
  )
    .bind(...params)
    .all()
  return c.json({ success: true, data: results ?? [] })
})

customersRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = customerInputSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())
  const input = parsed.data

  const res = await c.env.DB.prepare(
    'INSERT INTO customers (name, phone, email, address, city, notes) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(input.name.trim(), input.phone, input.email, input.address, input.city, input.notes)
    .run()
  const created = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(res.meta.last_row_id).first()
  return c.json({ success: true, data: created }, 201)
})

customersRoutes.put('/:id', async (c) => {
  const id = idParamSchema.parse(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT id FROM customers WHERE id = ?').bind(id).first()
  if (!existing) throw notFound('El cliente no existe.')

  const body = await c.req.json().catch(() => null)
  const parsed = customerInputSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())
  const input = parsed.data

  await c.env.DB.prepare(
    `UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, city = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(input.name.trim(), input.phone, input.email, input.address, input.city, input.notes, id)
    .run()
  const updated = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: updated })
})

customersRoutes.delete('/:id', async (c) => {
  const id = idParamSchema.parse(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT id FROM customers WHERE id = ?').bind(id).first()
  if (!existing) throw notFound('El cliente no existe.')
  await c.env.DB.prepare('UPDATE sales SET customer_id = NULL WHERE customer_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM customers WHERE id = ?').bind(id).run()
  return c.json({ success: true, data: { id } })
})

export default customersRoutes