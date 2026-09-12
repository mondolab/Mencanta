export interface ProductImageDto {
  id: number
  url: string | null
  alt: string
}

export function resolveImageUrl(url?: string | null): string | null {
  return url ?? null
}

export interface ProductRow {
  id: number
  name: string
  slug: string
  description: string
  category_id: number | null
  category_name?: string | null
  category_slug?: string | null
  category_type?: string | null
  price_cents: number
  compare_price_cents: number | null
  cost_cents: number
  stock: number
  min_stock: number
  featured: number
  active: number
  has_variants: number
  image_url?: string | null
  created_at: string
  updated_at: string
}

export function serializePublicProduct(row: ProductRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category_id: row.category_id,
    category_name: row.category_name ?? null,
    category_slug: row.category_slug ?? null,
    price_cents: row.price_cents,
    compare_price_cents: row.compare_price_cents,
    stock: row.stock,
    has_variants: row.has_variants,
    featured: row.featured === 1,
    active: row.active === 1,
    image: {
      url: resolveImageUrl(row.image_url),
    },
    discount_percent: discountPercent(row.price_cents, row.compare_price_cents),
    is_offer: row.compare_price_cents != null
      ? row.compare_price_cents > row.price_cents
      : false,
  }
}

export function discountPercent(price: number, compare: number | null | undefined): number | null {
  if (compare == null || compare <= price || price <= 0) return null
  return Math.round(((compare - price) / compare) * 100)
}