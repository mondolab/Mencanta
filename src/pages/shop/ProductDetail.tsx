import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Minus, Plus, ShoppingBag, MessageCircle, ChevronLeft, Check } from 'lucide-react'
import { api } from '@/lib/api'
import type { ProductDetail } from '@/types'
import { MoneyWithCompare } from '@/components/ui/MoneyDisplay'
import { StockBadge } from '@/components/ui/StockBadge'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/contexts/ToastContext'
import { useSettings } from '@/contexts/SettingsContext'
import { consultarProductoWhatsApp } from '@/lib/whatsapp'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/lib/utils'

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { add } = useCart()
  const { toast } = useToast()
  const { whatsappNumber } = useSettings()

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get<ProductDetail>(`/api/products/${slug}`),
  })

  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [qty, setQty] = useState(1)
  const [activeImage, setActiveImage] = useState(0)

  const { sizes, colors } = useMemo(() => {
    const variants = product?.variants ?? []
    return {
      sizes: Array.from(new Set(variants.map((v) => v.size).filter(Boolean))),
      colors: Array.from(new Set(variants.map((v) => v.color).filter(Boolean))),
    }
  }, [product])

  const selectedVariant = useMemo(() => {
    if (!product?.has_variants) return null
    return (product.variants ?? []).find((v) => v.size === size && v.color === color) ?? null
  }, [product, size, color])

  useEffect(() => {
    if (product?.variants?.length && !size) {
      const first = product.variants[0]
      setSize(first.size)
      setColor(first.color)
      setActiveImage(0)
    }
  }, [product, size])

  usePageTitle(
    product ? `${product.name} — M\' encanta` : undefined,
    product?.description ? product.description.slice(0, 160) : undefined,
  )

  if (isLoading) return <LoadingState />
  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Producto no encontrado"
          description="Puede que ya no esté disponible o que la dirección haya cambiado."
          action={
            <Link to="/productos" className="text-sm font-semibold text-ink underline underline-offset-4">
              Volver al catálogo
            </Link>
          }
        />
      </div>
    )
  }

  const availableStock = selectedVariant?.stock ?? product.stock
  const price = selectedVariant?.price_cents ?? product.price_cents
  const comparePrice = selectedVariant?.compare_price_cents ?? product.compare_price_cents

  const handleAdd = () => {
    if (product.has_variants && (!size || !color || !selectedVariant)) {
      toast('Elegí tamaño y color.', 'error')
      return
    }
    if (availableStock <= 0) {
      toast('No hay stock de esa combinación.', 'error')
      return
    }
    add({
      product_id: product.id,
      variant_id: selectedVariant?.id ?? null,
      name: product.name,
      variant_name: selectedVariant?.name ?? '',
      slug: product.slug,
      image: product.gallery?.[0]?.url ?? product.image?.url,
      price_cents: price,
      quantity: qty,
      max_stock: availableStock,
    })
    toast('Agregado al carrito')
  }

  const waProduct = selectedVariant ? `${product.name} — ${selectedVariant.name}` : product.name

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link to="/productos" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> Volver al catálogo
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Galería */}
        <div>
          <div className="overflow-hidden rounded-[2rem] border border-line bg-beige/40">
            {(product.gallery ?? []).length > 0 ? (
              <img
                src={product.gallery[activeImage]?.url ?? product.gallery[0].url ?? ''}
                alt={product.gallery[activeImage]?.alt || product.name}
                className="aspect-square w-full object-cover"
              />
            ) : product.image?.url ? (
              <img src={product.image.url} alt={product.name} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center font-display text-6xl text-sand/60">
                {product.name.charAt(0)}
              </div>
            )}
          </div>
          {(product.gallery ?? []).length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto hide-scrollbar">
              {product.gallery.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all',
                    i === activeImage ? 'border-sand' : 'border-transparent opacity-70 hover:opacity-100',
                  )}
                  aria-label={`Ver imagen ${i + 1}`}
                >
                  <img src={img.url ?? ''} alt={img.alt} className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalle */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sand">
            {product.category_name ?? "M' encanta"}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">{product.name}</h1>

          <div className="mt-5">
            <MoneyWithCompare cents={price} compareCents={comparePrice} />
            {product.discount_percent && (
              <p className="mt-1 text-xs font-semibold text-red-600">
                {product.discount_percent}% de descuento
              </p>
            )}
          </div>

          <div className="mt-4">
            <StockBadge stock={availableStock} min={product.min_stock} />
          </div>

          {product.has_variants && (
            <div className="mt-6 space-y-5">
              {sizes.length > 1 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Tamaño</p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={cn(
                          'rounded-pill border px-4 py-2 text-sm font-medium transition-colors',
                          size === s ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:bg-beige/40',
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {colors.length > 1 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((cl) => (
                      <button
                        key={cl}
                        onClick={() => setColor(cl)}
                        className={cn(
                          'rounded-pill border px-4 py-2 text-sm font-medium transition-colors',
                          color === cl ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:bg-beige/40',
                        )}
                      >
                        {cl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedVariant && (
                <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                  <Check className="h-4 w-4" /> {selectedVariant.name}
                </p>
              )}
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 rounded-pill border border-line bg-white px-2 py-1.5">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-beige/50"
                aria-label="Restar cantidad"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-bold tabular-nums">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(Math.max(1, availableStock || 1), q + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-beige/50"
                aria-label="Sumar cantidad"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button onClick={handleAdd} size="lg" disabled={availableStock <= 0}>
              <ShoppingBag className="h-4 w-4" />
              {availableStock <= 0 ? 'Sin stock' : 'Agregar al carrito'}
            </Button>
          </div>

          <a
            href={consultarProductoWhatsApp(whatsappNumber, waProduct)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex h-12 items-center gap-2 rounded-pill border border-[#25D366]/40 bg-[#25D366]/10 px-6 text-sm font-semibold text-[#1fb457] transition-colors hover:bg-[#25D366]/20"
          >
            <MessageCircle className="h-4 w-4" />
            Consultar por WhatsApp
          </a>

          <div className="mt-8 border-t border-line pt-6">
            <h2 className="mb-2 font-display text-lg">Descripción</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
              {product.description || 'Sin descripción.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}