import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Plus, Trash2, Upload, Loader2 } from 'lucide-react'
import { api, uploadImageFile } from '@/lib/api'
import { parseAmountToCents } from '@/lib/money'
import { slugify } from '@/lib/utils'
import type { Category } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { LoadingState } from '@/components/ui/LoadingState'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/lib/utils'

interface VariantRow {
  id?: number
  name: string
  size: string
  color: string
  priceCents: string
  compareCents: string
  costCents: string
  stock: string
  active: boolean
}

interface ImageRow {
  id?: number
  url: string
  alt: string
}

interface ProductDetailData {
  name: string
  slug: string
  description: string
  category_id: number | null
  price_cents: number
  compare_price_cents: number | null
  cost_cents: number
  stock: number
  min_stock: number
  featured: boolean
  active: boolean
  has_variants: boolean
  images: Array<{ id: number; url: string | null; alt: string }>
  variants: Array<{ id: number; name: string; size: string; color: string; price_cents: number | null; compare_price_cents: number | null; cost_cents: number | null; stock: number; active: boolean }>
}

const PRICE_LABEL = 'Precio ($)'

export default function ProductForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  usePageTitle(isEdit ? 'Editar producto — M\' encanta Gestión' : 'Nuevo producto — M\' encanta Gestión')

  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [autoSlug, setAutoSlug] = useState(true)
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('')
  const [comparePrice, setComparePrice] = useState('')
  const [cost, setCost] = useState('')
  const [stock, setStock] = useState('0')
  const [minStock, setMinStock] = useState('0')
  const [featured, setFeatured] = useState(false)
  const [active, setActive] = useState(true)
  const [hasVariants, setHasVariants] = useState(false)
  const [images, setImages] = useState<ImageRow[]>([])
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newImageAlt, setNewImageAlt] = useState('')
  const [deleteImageIds, setDeleteImageIds] = useState<number[]>([])
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [uploading, setUploading] = useState(false)

  const { data: categories } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: () => api.get<Category[]>('/api/admin/categories'),
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['product-detail', id],
    queryFn: () => api.get<ProductDetailData>(`/api/admin/products/${id}`),
    enabled: isEdit,
  })

  useEffect(() => {
    if (!detail) return
    setName(detail.name)
    setSlug(detail.slug)
    setAutoSlug(false)
    setDescription(detail.description)
    setCategoryId(detail.category_id ? String(detail.category_id) : '')
    setPrice(String(detail.price_cents / 100).replace('.', ','))
    setComparePrice(detail.compare_price_cents ? String(detail.compare_price_cents / 100).replace('.', ',') : '')
    setCost(String(detail.cost_cents / 100).replace('.', ','))
    setStock(String(detail.stock))
    setMinStock(String(detail.min_stock))
    setFeatured(detail.featured)
    setActive(detail.active)
    setHasVariants(detail.has_variants)
    setImages((detail.images ?? []).map((img) => ({ id: img.id, url: img.url ?? '', alt: img.alt })))
    setVariants(
      (detail.variants ?? []).map((v) => ({
        id: v.id,
        name: v.name,
        size: v.size,
        color: v.color,
        priceCents: v.price_cents != null ? String(v.price_cents / 100).replace('.', ',') : '',
        compareCents: v.compare_price_cents != null ? String(v.compare_price_cents / 100).replace('.', ',') : '',
        costCents: v.cost_cents != null ? String(v.cost_cents / 100).replace('.', ',') : '',
        stock: String(v.stock),
        active: v.active,
      })),
    )
  }, [detail])

  const variantName = (v: Pick<VariantRow, 'size' | 'color'>) => {
    if (v.size && v.color) return `${v.size} / ${v.color}`
    return v.size || v.color || 'Variante'
  }

  // Al encender variantes, generar una fila inicial
  useEffect(() => {
    if (hasVariants && variants.length === 0) {
      setVariants([{ name: '', size: '', color: '', priceCents: price, compareCents: '', costCents: '', stock: '0', active: true }])
    }
  }, [hasVariants]) // eslint-disable-line react-hooks/exhaustive-deps

  const addImage = () => {
    const url = newImageUrl.trim()
    if (!url) return
    setImages((prev) => [...prev, { url, alt: newImageAlt.trim() }])
    setNewImageUrl('')
    setNewImageAlt('')
  }

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadImageFile(file, 'products')
      setImages((prev) => [...prev, { url, alt: '' }])
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo subir la imagen.', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        slug: autoSlug ? '' : slug,
        description,
        category_id: categoryId ? Number(categoryId) : null,
        price_cents: hasVariants && variants.length > 0 ? parseAmountToCents(variants[0].priceCents || price) : parseAmountToCents(price),
        compare_price_cents: parseAmountToCents(comparePrice) || null,
        cost_cents: parseAmountToCents(cost),
        stock: Number(stock) || 0,
        min_stock: Number(minStock) || 0,
        featured,
        active,
        has_variants: hasVariants,
        images: images
          .filter((img) => !img.id)
          .map((img, i) => ({ image_url: img.url, alt: img.alt, sort_order: i })),
        delete_image_ids: deleteImageIds,
        variants: hasVariants
          ? variants.map((v) => ({
              id: v.id,
              name: variantName(v),
              size: v.size,
              color: v.color,
              price_cents: parseAmountToCents(v.priceCents) || parseAmountToCents(price),
              compare_price_cents: parseAmountToCents(v.compareCents) || null,
              cost_cents: parseAmountToCents(v.costCents) || null,
              stock: Number(v.stock) || 0,
              active: v.active,
            }))
          : [],
      }
      return isEdit
        ? api.put(`/api/admin/products/${id}`, payload)
        : api.post('/api/admin/products', payload)
    },
    onSuccess: () => {
      toast(isEdit ? 'Producto actualizado' : 'Producto creado')
      queryClient.invalidateQueries({ queryKey: ['products-admin'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      navigate('/admin/productos')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo guardar el producto.', 'error'),
  })

  if (isEdit && detailLoading) return <LoadingState />

  return (
    <div className="space-y-6">
      <Link to="/admin/productos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> Productos
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h1>
        <Button onClick={() => save.mutate()} loading={save.isPending}><Plus className="h-4 w-4" /> Guardar producto</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">Información</h2>
            <Input label="Nombre" value={name} onChange={(e) => { setName(e.target.value); if (autoSlug) setSlug(slugify(e.target.value)) }} placeholder="Ej: Acolchado Queen" />
            <Input
              label="Slug (URL)"
              value={slug}
              onChange={(e) => { setSlug(slugify(e.target.value)); setAutoSlug(false) }}
              hint="Se genera automáticamente desde el nombre."
              placeholder="acolchado-queen"
            />
            <Select label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sin categoría</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Textarea label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción que verán los clientes…" rows={5} />
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">Precios y stock</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Precio ($)" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$ 50.000" />
              <Input label="Precio anterior ($)" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} placeholder="Para ofertas" />
              <Input label="Costo ($)" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="$ 30.000" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {!hasVariants && <Input label="Stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />}
              <Input label="Stock mínimo" type="number" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} hint='Alerta de "stock bajo" cuando el stock es menor.' />
            </div>
            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-3 text-sm font-medium">
                <Toggle checked={featured} onChange={setFeatured} label="Destacado" />
                Destacado en la home
              </label>
              <label className="flex items-center gap-3 text-sm font-medium">
                <Toggle checked={active} onChange={setActive} label="Activo" />
                Visible en la tienda
              </label>
              <label className="flex items-center gap-3 text-sm font-medium">
                <Toggle checked={hasVariants} onChange={setHasVariants} label="Variantes" />
                Tiene variantes (tamaño/color)
              </label>
            </div>
            {hasVariants && <p className="text-xs text-gray-500">El stock del producto se calcula como la suma del stock de las variantes activas.</p>}
          </Card>

          {hasVariants && (
            <Card className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Variantes</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVariants((prev) => [...prev, { name: '', size: '', color: '', priceCents: price, compareCents: '', costCents: '', stock: '0', active: true }])}
                >
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>
              <div className="space-y-3">
                {variants.map((v, i) => (
                  <div key={v.id ?? i} className="rounded-2xl border border-line p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{variantName(v)}</p>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs font-medium">
                          <Toggle checked={v.active} onChange={(val) => updateVariant(i, 'active', val)} label={`Activar ${v.name}`} />
                          Activa
                        </label>
                        <button onClick={() => setVariants((prev) => prev.filter((_, j) => j !== i))} className="rounded-full p-1.5 text-gray-400 hover:text-red-600" aria-label="Quitar variante">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Input label="Tamaño" value={v.size} onChange={(e) => updateVariant(i, 'size', e.target.value)} placeholder="Queen" />
                      <Input label="Color" value={v.color} onChange={(e) => updateVariant(i, 'color', e.target.value)} placeholder="Blanco" />
                      <Input label={PRICE_LABEL} value={v.priceCents} onChange={(e) => updateVariant(i, 'priceCents', e.target.value)} placeholder="$ 50.000" />
                      <Input label="Stock" type="number" min="0" value={v.stock} onChange={(e) => updateVariant(i, 'stock', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
              {variants.length === 0 && <p className="text-sm text-gray-500">Agregá al menos una variante.</p>}
            </Card>
          )}

          <Card className="space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">Imágenes</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((img, i) => (
                <div key={img.id ?? `new-${i}`} className="group relative overflow-hidden rounded-2xl border border-line">
                  <img src={img.url} alt={img.alt || `Imagen ${i + 1}`} className="aspect-square w-full object-cover" loading="lazy" />
                  <button
                    onClick={() => {
                      if (img.id) setDeleteImageIds((prev) => [...prev, img.id!])
                      setImages((prev) => prev.filter((_, j) => j !== i))
                    }}
                    className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1.5 text-red-600 shadow
                     opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Quitar imagen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line text-gray-500 transition-colors hover:border-sand hover:bg-beige/30">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                <span className="text-xs font-medium">Subir</span>
                <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
              </label>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="sm:flex-1">
                <Input label="o por URL" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="https://…" />
              </div>
              <Input label="Texto alternativo" value={newImageAlt} onChange={(e) => setNewImageAlt(e.target.value)} placeholder="Descripción breve" />
              <Button variant="outline" onClick={addImage} disabled={!newImageUrl.trim()}>
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>
            <p className="text-xs text-gray-500">Subí el archivo (el sistema genera el nombre) o pegá una URL directa. La primera imagen es la principal.</p>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24 space-y-3 p-6">
            <h2 className="font-display text-lg font-semibold">Resumen</h2>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Stock total</span>
              <span className="font-semibold tabular-nums">{hasVariants ? variants.reduce((a, v) => a + (Number(v.stock) || 0), 0) : Number(stock) || 0} u.</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Estado</span>
              <span className={cn('font-semibold', active ? 'text-emerald-600' : 'text-gray-400')}>{active ? 'Activo' : 'Oculto'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Variantes</span>
              <span className="font-semibold tabular-nums">{hasVariants ? variants.length : 0}</span>
            </div>
            <Button className="w-full" onClick={() => save.mutate()} loading={save.isPending}>
              {isEdit ? 'Guardar cambios' : 'Crear producto'}
            </Button>
            <Link to="/admin/productos" className="block text-center text-xs font-semibold text-gray-500 hover:text-ink">
              Cancelar
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )

  function updateVariant(i: number, field: keyof VariantRow, value: string | boolean) {
    setVariants((prev) => prev.map((v, j) => (j === i ? { ...v, [field]: value } : v)))
  }
}