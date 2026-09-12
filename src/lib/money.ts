/** Formatea montos en pesos argentinos: $ 125.000 */
export function formatMoney(cents: number): string {
  const value = (cents ?? 0) / 100
  const hasCents = Math.round(cents ?? 0) % 100 !== 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace(/\u00A0/g, ' ')
}

/**
 * Convierte un input del usuario ("$ 125.000", "125000", "125000,50") a centavos.
 * Acepta puntos y comas como separadores.
 */
export function parseAmountToCents(input: string): number {
  const cleaned = input.trim().replace(/[^0-9.,]/g, '')
  if (!cleaned) return 0

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  let normalized = cleaned
  if (lastComma > lastDot) {
    // la coma es separador decimal
    normalized = cleaned.replace(/\./g, '').replace(/,/g, '.')
  } else if (lastDot > -1) {
    // el punto puede ser miles o decimal
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      normalized = parts.join('')
    } else if (parts.length === 2 && parts[1].length === 3) {
      normalized = parts.join('')
    } else if (parts.length === 2) {
      normalized = parts[0] + '.' + parts[1]
    }
  }

  const value = parseFloat(normalized)
  if (Number.isNaN(value)) return 0
  return Math.round(value * 100)
}

/** Parsea un porcentaje ("10", "10,5") y lo acota a 0-100. */
export function parsePercent(input: string): number {
  const value = Number(String(input).trim().replace(',', '.'))
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 100)
}

/** Devuelve el porcentaje de un monto en centavos (redondeado). */
export function percentOfCents(cents: number, percent: number): number {
  return Math.round((cents * Math.min(Math.max(percent, 0), 100)) / 100)
}

/** Formatea la fecha ISO del servidor a DD/MM/YYYY (zona Argentina). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = iso.includes('T') ? new Date(iso) : new Date(iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Cordoba',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/** Formatea fecha y hora: DD/MM/YYYY HH:MM */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = iso.includes('T') ? new Date(iso) : new Date(iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Cordoba',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Hora HH:MM */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = iso.includes('T') ? new Date(iso) : new Date(iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Cordoba',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Fecha para input <input type="date"> en Argentina (YYYY-MM-DD), a partir de ISO. */
export function toDateInputValue(iso: string): string {
  if (!iso) return ''
  const date = iso.includes('T') ? new Date(iso) : new Date(iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Cordoba',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}