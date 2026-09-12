import type { Context, Next } from 'hono'
import type { AppEnv, Env, UserRow } from '../types'
import { unauthorized } from './errors'
import { nowIso } from './dates'

const PBKDF2_ITERATIONS = 150_000

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

async function deriveBits(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return new Uint8Array(bits)
}

/** Formato: pbkdf2:iteraciones:salt_hex:hash_hex */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveBits(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2:${PBKDF2_ITERATIONS}:${bytesToHex(salt)}:${bytesToHex(hash)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterationsStr, saltHex, hashHex] = stored.split(':')
  if (scheme !== 'pbkdf2' || !iterationsStr || !saltHex || !hashHex) return false
  const iterations = Number(iterationsStr)
  if (!Number.isInteger(iterations) || iterations < 1_000) return false
  const derived = await deriveBits(password, hexToBytes(saltHex), iterations)
  const a = derived
  const b = hexToBytes(hashHex)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToHex(new Uint8Array(digest))
}

const SESSION_COOKIE = 'mencanta_session'
const SESSION_TTL_DAYS = 30

export function sessionCookieName(): string {
  return SESSION_COOKIE
}

export async function createSession(env: Env, userId: number): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
  const tokenHash = await sha256Hex(token)
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
  await env.DB.prepare(
    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
  )
    .bind(userId, tokenHash, expires)
    .run()
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(nowIso()).run()
  return token
}

export async function getUserBySessionToken(env: Env, token: string | undefined | null): Promise<UserRow | null> {
  if (!token) return null
  const tokenHash = await sha256Hex(token)
  const row = await env.DB.prepare(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?
     LIMIT 1`,
  )
    .bind(tokenHash, nowIso())
    .first<UserRow>()
  return row ?? null
}

export function readSessionToken(header: string | null | undefined): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === SESSION_COOKIE) return rest.join('=').trim()
  }
  return null
}

export async function destroySession(env: Env, token: string | null): Promise<void> {
  if (!token) return
  const tokenHash = await sha256Hex(token)
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run()
}

/** Middleware de autenticación para rutas administrativas. */
export async function requireAuth(c: Context<AppEnv>, next: Next): Promise<void> {
  const token = readSessionToken(c.req.header('cookie'))
  const user = await getUserBySessionToken(c.env, token)
  if (!user) throw unauthorized()
  c.set('user', user)
  await next()
}

export function getAuthUser(c: Context<AppEnv>): UserRow {
  return c.get('user')
}