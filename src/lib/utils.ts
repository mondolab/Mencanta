export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  debito: 'Tarjeta débito',
  credito: 'Tarjeta crédito',
  mercado_pago: 'Mercado Pago',
  otro: 'Otro',
}

export const PAYMENT_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'debito', label: 'Tarjeta débito' },
  { value: 'credito', label: 'Tarjeta crédito' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'otro', label: 'Otro' },
]

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  preparando: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  confirmado: 'bg-sky-100 text-sky-800',
  preparando: 'bg-violet-100 text-violet-800',
  listo: 'bg-emerald-100 text-emerald-800',
  entregado: 'bg-lime-100 text-lime-800',
  cancelado: 'bg-red-100 text-red-700',
}

export const EXPENSE_CATEGORIES = [
  'mercaderia',
  'packaging',
  'transporte',
  'publicidad',
  'servicios',
  'combustible',
  'otros',
] as const

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  mercaderia: 'Mercadería',
  packaging: 'Packaging',
  transporte: 'Transporte',
  publicidad: 'Publicidad',
  servicios: 'Servicios',
  combustible: 'Combustible',
  otros: 'Otros',
}