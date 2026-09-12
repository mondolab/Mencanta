import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Product } from '@/types'
import { ProductGrid } from '@/components/shop/ProductGrid'
import { LoadingState } from '@/components/ui/LoadingState'
import { Button } from '@/components/ui/Button'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function Ofertas() {
  usePageTitle('Ofertas — M\' encanta')

  const { data, isLoading } = useQuery({
    queryKey: ['products-offers'],
    queryFn: () => api.get<Product[]>('/api/products?offers=1&sort=price_desc'),
  })

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 rounded-[2.5rem] bg-ink p-8 text-white shadow-lift sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Ofertas exclusivas</p>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Descuentos que enamoran</h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/70">
          Precios especiales por tiempo limitado. Stock disponible, consultanos por WhatsApp y no te lo pierdas.
        </p>
      </div>

      {!data || data.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-12 text-center">
          <p className="font-display text-xl">¡Ups!</p>
          <p className="mt-2 text-sm text-gray-500">Ahora mismo no hay productos en oferta.</p>
          <div className="mt-6 flex justify-center">
            <Link to="/productos">
              <Button>Ver todo el catálogo</Button>
            </Link>
          </div>
        </div>
      ) : (
        <ProductGrid products={data} />
      )}
    </div>
  )
}