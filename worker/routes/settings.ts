import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { getAllSettings, setSetting } from '../lib/db'
import { badRequest } from '../lib/errors'
import { z } from 'zod'

const settingsRoutes = new Hono<AppEnv>()

const updateSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
})

settingsRoutes.get('/', async (c) => {
  const settings = await getAllSettings(c.env)
  return c.json({ success: true, data: settings })
})

settingsRoutes.put('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())

  for (const [key, value] of Object.entries(parsed.data.settings)) {
    const serialized = typeof value === 'string' ? (tryParseJson(value) ?? value) : value
    await setSetting(c.env, key, JSON.stringify(serialized))
  }

  const settings = await getAllSettings(c.env)
  return c.json({ success: true, data: settings })
})

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export default settingsRoutes