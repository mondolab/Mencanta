import { z } from 'zod'

export const PAYMENTS = ['efectivo', 'transferencia', 'debito', 'credito', 'mercado_pago', 'otro'] as const
export const ORDER_STATUS = ['pendiente', 'confirmado', 'preparando', 'listo', 'entregado', 'cancelado'] as const
export const STOCK_MOVEMENT_TYPES = ['entrada', 'venta', 'ajuste', 'perdida', 'devolucion'] as const
export const CASH_MOVEMENT_TYPES = ['ingreso', 'retiro', 'ajuste', 'gasto'] as const
export const EXPENSE_CATEGORIES = ['mercaderia', 'packaging', 'transporte', 'publicidad', 'servicios', 'combustible', 'otros'] as const

export const idParamSchema = z.coerce.number().int().positive()

export const loginSchema = z.object({
  email: z.string().email('Ingresá un email válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
})

export const setupSchema = loginSchema.extend({
  name: z.string().min(1, 'Ingresá tu nombre.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  setup_key: z.string().min(1, 'Falta la clave de configuración.'),
})

export const imageInputSchema = z.object({
  image_url: z.string().url('URL inválida.').optional().nullable(),
  alt: z.string().max(255).default(''),
  sort_order: z.number().int().min(0).default(0),
})

export const categoryInputSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio.'),
  slug: z.string().optional(),
  type: z.enum(['blanqueria', 'acero', 'otros']).default('blanqueria'),
  description: z.string().max(2000).default(''),
  image_url: z.string().url('URL inválida.').optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  active: z.coerce.boolean().default(true),
})

export const variantInputSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1).max(255),
  size: z.string().max(120).default(''),
  color: z.string().max(120).default(''),
  price_cents: z.number().int().nonnegative().optional().nullable(),
  compare_price_cents: z.number().int().nonnegative().optional().nullable(),
  cost_cents: z.number().int().nonnegative().optional().nullable(),
  stock: z.number().int().min(0).default(0),
  active: z.coerce.boolean().default(true),
})

export const productInputSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio.'),
  slug: z.string().optional(),
  description: z.string().max(10000).default(''),
  category_id: z.number().int().positive().nullable().optional(),
  price_cents: z.number().int().nonnegative(),
  compare_price_cents: z.number().int().nonnegative().optional().nullable(),
  cost_cents: z.number().int().nonnegative().default(0),
  stock: z.number().int().min(0).optional(),
  min_stock: z.number().int().min(0).default(0),
  featured: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true),
  has_variants: z.coerce.boolean().default(false),
  images: z.array(imageInputSchema).max(10).default([]),
  delete_image_ids: z.array(z.number().int()).default([]),
  variants: z.array(variantInputSchema).max(60).default([]),
})

export const saleItemSchema = z.object({
  product_id: z.number().int().positive(),
  variant_id: z.number().int().positive().optional().nullable(),
  quantity: z.number().int().min(1).max(999),
  unit_price_cents: z.number().int().nonnegative().optional().nullable(),
})

export const saleInputSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'Agregá al menos un producto.'),
  discount_cents: z.number().int().nonnegative().default(0),
  discount_percent: z.number().nonnegative().max(100).optional(),
  payment_method: z.enum(PAYMENTS).default('efectivo'),
  customer_name: z.string().max(255).default(''),
  customer_phone: z.string().max(64).default(''),
  customer_cuit: z.string().max(32).default(''),
  customer_id: z.number().int().positive().optional().nullable(),
  observations: z.string().max(1000).default(''),
})

export const orderItemSchema = z.object({
  product_id: z.number().int().positive(),
  variant_id: z.number().int().positive().optional().nullable(),
  quantity: z.number().int().min(1).max(999),
})

export const orderCreateSchema = z.object({
  customer_name: z.string().min(2, 'Ingresá tu nombre.'),
  customer_phone: z.string().min(6, 'Ingresá tu WhatsApp (incluí código de área).'),
  delivery_type: z.enum(['envio', 'retiro']).default('envio'),
  observations: z.string().max(1000).default(''),
  items: z.array(orderItemSchema).min(1, 'El carrito está vacío.'),
})

export const orderUpdateSchema = z.object({
  status: z.enum(ORDER_STATUS).optional(),
  observations: z.string().max(1000).optional(),
  customer_name: z.string().max(255).optional(),
  customer_phone: z.string().max(64).optional(),
  delivery_type: z.enum(['envio', 'retiro']).optional(),
})

export const stockAdjustSchema = z.object({
  product_id: z.number().int().positive(),
  variant_id: z.number().int().positive().optional().nullable(),
  type: z.enum(['entrada', 'ajuste', 'perdida', 'devolucion']),
  quantity: z.number().int().min(1),
  /** para "ajuste": 'in' suma, 'out' resta (por defecto 'in') */
  direction: z.enum(['in', 'out']).optional(),
  reference: z.string().max(255).default(''),
})

export const cashOpenSchema = z.object({
  opening_cents: z.number().int().nonnegative().default(0),
  observations: z.string().max(1000).default(''),
})

export const cashMovementSchema = z.object({
  type: z.enum(['ingreso', 'retiro', 'ajuste', 'gasto']),
  description: z.string().min(1, 'Ingresá una descripción.').max(500),
  amount_cents: z.number().int().positive(),
  direction: z.enum(['in', 'out']).optional(),
  payment_method: z.enum(PAYMENTS).default('efectivo'),
})

export const cashCloseSchema = z.object({
  counted_cents: z.number().int().nonnegative(),
  observations: z.string().max(1000).default(''),
})

export const expenseInputSchema = z.object({
  concept: z.string().min(1, 'El concepto es obligatorio.'),
  description: z.string().max(1000).default(''),
  amount_cents: z.number().int().positive(),
  payment_method: z.enum(PAYMENTS).default('efectivo'),
  category: z.enum(EXPENSE_CATEGORIES).default('otros'),
  notes: z.string().max(1000).default(''),
  date: z.string().optional(),
})

export const customerInputSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio.'),
  phone: z.string().max(64).default(''),
  email: z.string().email('Email inválido.').or(z.literal('')).default(''),
  address: z.string().max(255).default(''),
  city: z.string().max(120).default(''),
  notes: z.string().max(500).default(''),
})