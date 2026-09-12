import type { Env } from '../types'
import { nowIso } from './dates'

export interface BusinessSettings {
  name: string
  tagline: string
  description: string
}

export interface WhatsappSettings {
  number: string
  display: string
}

export async function getSetting(env: Env, key: string): Promise<string | null> {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>()
  return row?.value ?? null
}

export async function getSettingJson<T>(env: Env, key: string, fallback: T): Promise<T> {
  const raw = await getSetting(env, key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function setSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  )
    .bind(key, value)
    .run()
}

export async function getBusinessSettings(env: Env): Promise<BusinessSettings> {
  return getSettingJson<BusinessSettings>(env, 'business', {
    name: "M' encanta",
    tagline: 'Detalles que transforman tu hogar.',
    description: 'Blanquería para el hogar y accesorios de acero quirúrgico.',
  })
}

export async function getWhatsappSettings(env: Env): Promise<WhatsappSettings> {
  return getSettingJson<WhatsappSettings>(env, 'whatsapp', {
    number: '5493434056155',
    display: '+54 9 3434 05 6155',
  })
}

export async function getAllSettings(env: Env): Promise<Record<string, unknown>> {
  const rows = await env.DB.prepare('SELECT key, value FROM settings ORDER BY key').all<{ key: string; value: string }>()
  const out: Record<string, unknown> = {}
  for (const row of rows.results ?? []) {
    try {
      out[row.key] = JSON.parse(row.value)
    } catch {
      out[row.key] = row.value
    }
  }
  return out
}

export function isTrue(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

export async function allowNegativeStock(env: Env): Promise<boolean> {
  const rules = await getSettingJson<{ allow_negative_stock?: boolean }>(env, 'rules', {})
  return rules.allow_negative_stock === true
}

export const PUBLIC_SETTING_KEYS = [
  'business',
  'whatsapp',
  'contact',
  'address',
  'shipping',
  'schedule',
  'texts',
  'hero_image',
] as const

export async function getPublicSettings(env: Env): Promise<Record<string, unknown>> {
  const all = await getAllSettings(env)
  const out: Record<string, unknown> = {}
  for (const key of PUBLIC_SETTING_KEYS) {
    if (key in all) out[key] = all[key]
  }
  return out
}

/** Encuentra o crea la caja abierta de hoy. */
export async function ensureOpenRegister(env: Env, today: string): Promise<number> {
  const existing = await env.DB.prepare(
    'SELECT id FROM cash_registers WHERE date = ? AND status = "abierta" ORDER BY id DESC LIMIT 1',
  )
    .bind(today)
    .first<{ id: number }>()
  if (existing) return existing.id

  await env.DB.prepare(
    'INSERT INTO cash_registers (date, opened_at, opening_cents) VALUES (?, ?, 0)',
  )
    .bind(today, nowIso())
    .run()
  const created = await env.DB.prepare(
    'SELECT id FROM cash_registers ORDER BY id DESC LIMIT 1',
  ).first<{ id: number }>()
  if (!created) throw new Error('No se pudo crear la caja.')
  return created.id
}

/** Próximo número correlativo diario: prefijo + fecha + secuencia. */
export async function nextNumber(env: Env, table: 'sales' | 'orders', prefix: string): Promise<string> {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Cordoba',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replace(/-/g, '')
  const like = `${prefix}-${day}-%`
  const countRes = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM ${table} WHERE number LIKE ?`,
  )
    .bind(like)
    .first<{ c: number }>()
  const seq = (countRes?.c ?? 0) + 1
  return `${prefix}-${day}-${String(seq).padStart(3, '0')}`
}