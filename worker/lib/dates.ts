export const ARGENTINA_TZ = 'America/Argentina/Cordoba'

/** Fecha local en formato YYYYMMDD (para números de venta/pedido). */
export function localDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}${get('month')}${get('day')}`
}

/** Fecha local en formato DD-MM-YYYY (clave de caja). */
export function localDateDisplay(date = new Date()): string {
  const k = localDateKey(date)
  return `${k.slice(6, 8)}-${k.slice(4, 6)}-${k.slice(0, 4)}`
}

export function toIso(date = new Date()): string {
  return date.toISOString()
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Inicio del día local (Argentina) expresado en UTC. */
export function todayStartUtcIso(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0'
  const y = Number(get('year'))
  const m = Number(get('month'))
  const d = Number(get('day'))
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).toISOString()
}