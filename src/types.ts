export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  code?: string
  data: T
}

export interface Category {
  id: number
  name: string
  slug: string
  type: 'blanqueria' | 'acero' | 'otros'
  description: string
  image_key?: string | null
  image_url?: string | null
  sort_order: number
  active: boolean
  created_at?: string
  updated_at?: string
}

export interface ProductImage {
  id: number
  url: string | null
  alt: string
  image_key?: string | null
  image_url?: string | null
  sort_order?: number
}

export interface ProductVariant {
  id: number
  name: string
  size: string
  color: string
  price_cents: number
  compare_price_cents: number | null
  cost_cents?: number | null
  stock: number
  active: boolean
}

export interface Product {
  id: number
  name: string
  slug: string
  description: string
  category_id: number | null
  category_name?: string | null
  category_slug?: string | null
  price_cents: number
  compare_price_cents: number | null
  cost_cents: number
  stock: number
  min_stock: number
  featured: boolean
  active: boolean
  has_variants: boolean
  image: { url: string | null }
  discount_percent: number | null
  is_offer: boolean
  created_at?: string
  updated_at?: string
}

export interface ProductDetail extends Product {
  gallery: ProductImage[]
  variants: ProductVariant[]
}

export interface ProductAdmin extends Product {
  created_at: string
  updated_at: string
}

export interface ProductEditPayload extends ProductDetail {
  variants: (ProductVariant & { cost_cents?: number | null })[]
  images: ProductImage[]
}

export interface SaleItem {
  id: number
  product_id: number | null
  product_name: string
  variant_name: string
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
  unit_cost_cents: number
}

export interface Sale {
  id: number
  number: string
  subtotal_cents: number
  discount_cents: number
  total_cents: number
  payment_method: PaymentMethod
  customer_name: string
  customer_phone?: string
  customer_cuit?: string
  source: string
  created_at: string
  items_count?: number
  items?: SaleItem[]
}

export type PaymentMethod = 'efectivo' | 'transferencia' | 'debito' | 'credito' | 'mercado_pago' | 'otro'

export type OrderStatus = 'pendiente' | 'confirmado' | 'preparando' | 'listo' | 'entregado' | 'cancelado'

export interface Order {
  id: number
  number: string
  customer_name: string
  customer_phone: string
  delivery_type: 'envio' | 'retiro'
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
  status: OrderStatus
  observations: string
  sale_id: number | null
  created_at: string
  updated_at: string
  items_count?: number
  items?: OrderItem[]
}

export interface OrderItem {
  id: number
  product_id: number | null
  product_name: string
  variant_name: string
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
}

export interface Customer {
  id: number
  name: string
  phone: string
  email: string
  address: string
  city: string
  notes: string
  sales_count?: number
  orders_count?: number
}

export interface CashMovement {
  id: number
  type: 'venta_efectivo' | 'ingreso' | 'retiro' | 'ajuste' | 'gasto'
  description: string
  amount_cents: number
  direction: 'in' | 'out'
  payment_method: string
  reference: string
  created_at: string
}

export interface CashRegister {
  id: number
  date: string
  opened_at: string
  closed_at: string | null
  opening_cents: number
  expected_cents: number
  counted_cents: number | null
  difference_cents: number | null
  status: 'abierta' | 'cerrada'
  observations: string
}

export interface Expense {
  id: number
  concept: string
  description: string
  amount_cents: number
  payment_method: PaymentMethod
  category: string
  notes: string
  date: string
  cash_movement_id: number | null
}

export interface StockMovement {
  id: number
  product_id: number
  product_name: string
  type: 'entrada' | 'venta' | 'ajuste' | 'perdida' | 'devolucion'
  quantity: number
  stock_after: number
  reference: string
  created_at: string
}

export interface InventoryItem {
  id: number
  name: string
  slug: string
  stock: number
  min_stock: number
  status: 'normal' | 'bajo' | 'sin_stock'
  active: boolean
  category_name: string | null
  variants_count?: number
  last_movement: string | null
}

export interface Settings {
  business: { name: string; tagline: string; description: string }
  whatsapp: { number: string; display: string }
  contact: { email: string; instagram: string; map_url: string }
  address: { street: string; city: string; notes: string }
  shipping: { zones: string; cost_cents: number; min_order_free_cents: number; cost_note: string; delivery_time: string; pickup: boolean }
  schedule: { title: string; lines: string[] }
  texts: { hero_title: string; hero_subtitle: string; hero_text: string; banner_title: string; banner_text: string }
  hero_image: { url: string | null; key?: string | null }
  invoice?: { tax_id?: string; footer?: string }
  rules?: { allow_negative_stock?: boolean }
  [key: string]: unknown
}

export interface Dashboard {
  today: {
    sales_count: number
    total_cents: number
    payments: { method: string; total_cents: number }[]
  }
  orders_pending: number
  total_stock: number
  low_stock_count: number
  zero_stock: number
  low_stock_products: { id: number; name: string; stock: number; min_stock: number }[]
  cash: { expected_cents: number; register: { id: number; status: string } | null }
  latest_sales: Sale[]
  month: {
    sales_count: number
    sales_total_cents: number
    expenses_count: number
    expenses_total_cents: number
  }
}