import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { loginSchema, setupSchema } from '../validators'
import {
  createSession,
  destroySession,
  getUserBySessionToken,
  hashPassword,
  readSessionToken,
  requireAuth,
  sessionCookieName,
  verifyPassword,
} from '../lib/auth'
import { rateLimit } from '../lib/rate-limit'
import { badRequest, conflict } from '../lib/errors'

const authRoutes = new Hono<AppEnv>()

function sessionCookie(env: AppEnv['Bindings'], token: string): string {
  const secure = env.ENVIRONMENT === 'production' ? '; Secure' : ''
  return `${sessionCookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`
}

async function usersCount(env: AppEnv['Bindings']): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS c FROM users').first<{ c: number }>()
  return row?.c ?? 0
}

/** Si no hay usuarios y existen credenciales en secrets, crea el admin. */
async function bootstrapAdmin(env: AppEnv['Bindings']): Promise<void> {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return
  const count = await usersCount(env)
  if (count > 0) return
  const passwordHash = await hashPassword(env.ADMIN_PASSWORD)
  await env.DB.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
    .bind(env.ADMIN_EMAIL.toLowerCase().trim(), passwordHash, 'Administrador')
    .run()
}

authRoutes.post('/login', rateLimit({ windowMs: 60_000, max: 10 }), async (c) => {
  await bootstrapAdmin(c.env)
  const body = await c.req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())
  }
  const { email, password } = parsed.data
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, password_hash FROM users WHERE email = ? LIMIT 1',
  )
    .bind(email.toLowerCase().trim())
    .first<{ id: number; email: string; name: string; password_hash: string }>()
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw badRequest('BAD_CREDENTIALS', 'Email o contraseña incorrectos.')
  }

  const token = await createSession(c.env, user.id)
  c.header('Set-Cookie', sessionCookie(c.env, token))
  return c.json({
    success: true,
    data: { id: user.id, email: user.email, name: user.name },
  })
})

authRoutes.post('/setup', async (c) => {
  const count = await usersCount(c.env)
  if (count > 0) throw conflict('ALREADY_SETUP', 'El sistema ya tiene un administrador.')

  const expected = c.env.ADMIN_SETUP_KEY
  if (!expected) throw badRequest('SETUP_DISABLED', 'La configuración inicial no está habilitada en este servidor.')

  const body = await c.req.json().catch(() => null)
  const parsed = setupSchema.safeParse(body)
  if (!parsed.success) throw badRequest('VALIDATION', 'Datos inválidos.', parsed.error.flatten())
  if (parsed.data.setup_key !== expected) throw badRequest('BAD_SETUP_KEY', 'Clave de configuración incorrecta.')

  const passwordHash = await hashPassword(parsed.data.password)
  await c.env.DB.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
    .bind(parsed.data.email.toLowerCase().trim(), passwordHash, parsed.data.name)
    .run()

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? LIMIT 1')
    .bind(parsed.data.email.toLowerCase().trim())
    .first<{ id: number; email: string; name: string }>()
  const token = await createSession(c.env, user!.id)
  c.header('Set-Cookie', sessionCookie(c.env, token))
  return c.json({ success: true, data: { id: user!.id, email: user!.email, name: user!.name } })
})

authRoutes.get('/me', async (c) => {
  const token = readSessionToken(c.req.header('cookie'))
  const user = await getUserBySessionToken(c.env, token)
  if (!user) return c.json({ success: true, data: null })
  return c.json({ success: true, data: { id: user.id, email: user.email, name: user.name } })
})

authRoutes.post('/logout', async (c) => {
  const token = readSessionToken(c.req.header('cookie'))
  await destroySession(c.env, token)
  c.header('Set-Cookie', `${sessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
  return c.json({ success: true, data: null })
})

export { requireAuth }

export default authRoutes