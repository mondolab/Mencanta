import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Category, Product } from '@/types'
import { ProductGrid } from '@/components/shop/ProductGrid'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { cn } from '@/lib/utils'
import { parseAmountToCents } from '@/lib/money'

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const tipo = searchParams.get('tipo') ?? ''
  const categoria = searchParams.get('categoria') ?? ''
  const sort = searchParams.get('sort') ?? 'new'
  const inStock = searchParams.get('in_stock') === '1'
  const offers = searchParams.get('offers') === '1'
  const [showFilters, setShowFilters] = useState(false)
  const [minInput, setMinInput] = useState('')
  const [maxInput, setMaxInput] = useState('')

  const { data: categories } = useQuery({
    queryKey: ['categories-public'],
    queryFn: () => api.get<Category[]>('/api/categories'),
  })

  const minMax = useMemo(() => {
    const min = parseAmountToCents(minInput)
    const max = parseAmountToCents(maxInput)
    return { min, max }
  }, [minInput, maxInput])

  const { data, isLoading } = useQuery({
    queryKey: ['products', { q, tipo, categoria, sort, inStock, offers, min: minMax.min, max: minMax.max }],
    queryFn: () => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (tipo) params.set('type', tipo)
      if (categoria) params.set('category', categoria)
      params.set('sort', sort)
      if (inStock) params.set('in_stock', '1')
      if (offers) params.set('offers', '1')
      if (minMax.min > 0) params.set('min', String(minMax.min))
      if (minMax.max > 0) params.set('max', String(minMax.max))
      return api.get<Product[]>(`/api/products?${params.toString()}`)
    },
  })

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const tipoOptions = [
    { value: '', label: 'Todo el catálogo' },
    { value: 'blanqueria', label: 'Blanquería' },
    { value: 'acero', label: 'Acero quirúrgico' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sand">Catálogo</p>
        <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
          {offers ? 'Ofertas' : tipo === 'blanqueria' ? 'Blanquería' : tipo === 'acero' ? 'Acero quirúrgico' : 'Productos'}
        </h1>
      </div>

      {/* Filtros */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={q}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Buscar productos…"
            className="max-w-xs"
            prefix={<SearchIcon />}
          />
          <Select
            value={tipo}
            onChange={(e) => {
              updateParam('tipo', e.target.value)
              updateParam('categoria', '')
            }}
            className="w-48"
            aria-label="Tipo"
          >
            {tipoOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => updateParam('sort', e.target.value)} className="w-52" aria-label="Orden">
            <option value="new">Más nuevos</option>
            <option value="featured">Destacados</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
            <option value="name">Nombre</option>
          </Select>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-pill border px-4 text-sm font-semibold transition-colors',
              showFilters ? 'border-sand bg-beige/60' : 'border-line bg-white hover:bg-beige/30',
            )}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </button>
          {(q || inStock || offers || categoria || minInput || maxInput) && (
            <button
              onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-end gap-4 rounded-3xl border border-line bg-white p-5 animate-fadeUp">
            <div className="w-full sm:w-auto sm:min-w-48">
              <Select value={categoria} onChange={(e) => updateParam('categoria', e.target.value)} label="Categoría">
                <option value="">Todas</option>
                {categories
                  ?.filter((c) => !tipo || c.type === tipo)
                  .map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </div>
            <Input label="Precio mínimo" value={minInput} onChange={(e) => setMinInput(e.target.value)} placeholder="$ 0" className="w-36" />
            <Input label="Precio máximo" value={maxInput} onChange={(e) => setMaxInput(e.target.value)} placeholder="$ 200.000" className="w-40" />
            <label className="flex items-center gap-2 pb-2 text-sm text-ink">
              <Toggle
                checked={inStock}
                onChange={(v) => updateParam('in_stock', v ? '1' : '')}
                label="Solo con stock"
              />
              Solo con stock
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm text-ink">
              <Toggle checked={offers} onChange={(v) => updateParam('offers', v ? '1' : '')} label="Solo ofertas" />
              Solo ofertas
            </label>
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No encontramos productos con esos filtros"
          description="Probá ajustar la búsqueda o los filtros seleccionados."
          action={
            <button
              onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
              className="text-sm font-semibold text-ink underline underline-offset-4"
            >
              Ver todo el catálogo
            </button>
          }
        />
      ) : (
        <>
          <p className="mb-5 text-sm text-gray-500">{data.length} productos</p>
          <ProductGrid products={data} />
        </>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}