import { Link, useNavigate } from 'react-router-dom'
import { Eye, ShoppingBag } from 'lucide-react'
import type { Product } from '@/types'
import { MoneyWithCompare } from '@/components/ui/MoneyDisplay'
import { StockBadge } from '@/components/ui/StockBadge'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/contexts/ToastContext'
import { cn } from '@/lib/utils'

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const { add } = useCart()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    if (product.has_variants) {
      navigate(`/producto/${product.slug}`)
      return
    }
    if (product.stock <= 0) {
      toast('Este producto no tiene stock disponible.', 'error')
      return
    }
    add({
      product_id: product.id,
      variant_id: null,
      name: product.name,
      variant_name: '',
      slug: product.slug,
      image: product.image?.url,
      price_cents: product.price_cents,
      max_stock: product.stock,
    })
    toast('Agregado al carrito')
  }

  return (
    <article
      className={cn('group flex flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift', className)}
    >
      <Link to={`/producto/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-beige/40">
        {product.image?.url ? (
          <img
            src={product.image.url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-3xl text-sand/70">
            {product.name.charAt(0)}
          </div>
        )}
        {product.is_offer && product.discount_percent != null && (
          <span className="absolute left-3 top-3 rounded-pill bg-blush px-3 py-1 text-xs font-bold text-ink shadow-sm">
            -{product.discount_percent}%
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-sand">{product.category_name ?? "M' encanta"}</p>
        <h3 className="font-display text-base leading-snug text-ink">
          <Link to={`/producto/${product.slug}`} className="transition-colors hover:text-black">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <MoneyWithCompare cents={product.price_cents} compareCents={product.compare_price_cents} />
            <div className="mt-1">
              <StockBadge stock={product.stock} min={product.stock > 0 ? undefined : 0} />
            </div>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleAdd}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-pill bg-ink px-3 text-xs font-semibold text-white transition-colors hover:bg-black disabled:pointer-events-none disabled:opacity-50"
          >
            <ShoppingBag className="h-4 w-4" />
            {product.has_variants ? 'Ver opciones' : 'Agregar'}
          </button>
          <Link
            to={`/producto/${product.slug}`}
            className="flex h-10 w-10 items-center justify-center rounded-pill border border-line text-ink transition-colors hover:bg-beige/50"
            aria-label={`Ver ${product.name}`}
          >
            <Eye className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}