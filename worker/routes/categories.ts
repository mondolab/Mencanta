import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { categoryInputSchema, idParamSchema } from '../validators'
import { badRequest, notFound } from '../lib/errors'
import { uniqueSlug } from '../lib/slug'

const categoriesRoutes = new Hono<AppEnv>()

categoriesRoutes.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM categories ORDER BY sort_order, name').all()
  return c.json({ success: true, data: results ?? [] })
})

categoriesRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = categoryInputSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())

  const input = parsed.data
  const slug = input.slug ? await ensureSlug(c, input.slug) : await uniqueSlug(c.env.DB, 'categories', input.name)
  const res = await c.env.DB.prepare(
    `INSERT INTO categories (name, slug, type, description, image_key, image_url, sort_order, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.name.trim(),
      slug,
      input.type,
      input.description,
      input.image_key ?? null,
      input.image_url ?? null,
      input.sort_order,
      input.active ? 1 : 0,
    )
    .run()
  const id = res.meta.last_row_id
  const created = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: created }, 201)
})

categoriesRoutes.put('/:id', async (c) => {
  const id = idParamSchema.parse(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first()
  if (!existing) throw notFound('La categoría no existe.')

  const body = await c.req.json().catch(() => null)
  const parsed = categoryInputSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())

  const input = parsed.data
  const slug = input.slug && input.slug !== existing.slug
    ? await ensureSlug(c, input.slug, id)
    : existing.slug

  await c.env.DB.prepare(
    `UPDATE categories SET name = ?, slug = ?, type = ?, description = ?, image_key = ?, image_url = ?, sort_order = ?, active = ?, updated_at = datetime('now')
     WHERE id = ?`,
  )
    .bind(
      input.name.trim(),
      slug,
      input.type,
      input.description,
      input.image_key ?? null,
      input.image_url ?? null,
      input.sort_order,
      input.active ? 1 : 0,
      id,
    )
    .run()

  const updated = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: updated })
})

categoriesRoutes.delete('/:id', async (c) => {
  const id = idParamSchema.parse(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(id).first()
  if (!existing) throw notFound('La categoría no existe.')
  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()
  return c.json({ success: true, data: { id } })
})

async function ensureSlug(c: import('hono').Context<AppEnv>, base: string, excludeId?: number): Promise<string> {
  return uniqueSlug(c.env.DB, 'categories', base, excludeId)
}

export default categoriesRoutes