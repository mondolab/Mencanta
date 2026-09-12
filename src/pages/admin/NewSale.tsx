import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Minus, Trash2, ShoppingBag, Search, Check, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import type { Product, ProductVariant, PaymentMethod } from '@/types'
import { formatMoney, parsePercent, percentOfCents } from '@/lib/money'
import { PAYMENT_OPTIONS } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Card } from '@/components/ui/Card'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { usePageTitle } from '@/hooks/usePageTitle'
import { buildWaLink } from '@/lib/whatsapp'
import { formatDateTime } from '@/lib/money'

interface CartLine {
  product_id: number
  variant_id: number | null
  name: string
  variant_name: string
  quantity: number
  unit_price_cents: number
}

interface SaleResult {
  id: number
  number: string
  subtotal_cents: number
  discount_cents: number
  total_cents: number
  payment_method: PaymentMethod
  customer_name: string
  customer_phone?: string
  customer_cuit?: string
  created_at: string
}

export default function NewSale() {
  usePageTitle('Nueva venta — M\' encanta Gestión')

  const { toast } = useToast()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [discountInput, setDiscountInput] = useState('')
  const [payment, setPayment] = useState<PaymentMethod>('efectivo')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerCuit, setCustomerCuit] = useState('')
  const [variantTarget, setVariantTarget] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<SaleResult | null>(null)

  const { data: products } = useQuery({
    queryKey: ['pos-search', q],
    queryFn: () => api.get<Product[]>(`/api/admin/products?${new URLSearchParams({ q, status: 'activos' }).toString()}`),
  })

  const subtotal = cart.reduce((acc, l) => acc + l.unit_price_cents * l.quantity, 0)
  const discountPercent = parsePercent(discountInput)
  const discount = percentOfCents(subtotal, discountPercent)
  const total = subtotal - discount

  const addProduct = (product: Product) => {
    if (product.has_variants) {
      setVariantTarget(product)
      return
    }
    addLine(product.id, null, product.name, '', product.price_cents)
  }

  const addVariant = (product: Product, variant: ProductVariant) => {
    addLine(product.id, variant.id, product.name, variant.name, variant.price_cents ?? product.price_cents)
    setVariantTarget(null)
    toast(`Agregado ${product.name}${variant.name ? ` (${variant.name})` : ''}`)
  }

  const addLine = (productId: number, variantId: number | null, name: string, variantName: string, price: number) => {
    setCart((prev) => {
      const k = `${productId}:${variantId ?? ''}`
      const existing = prev.find((l) => `${l.product_id}:${l.variant_id ?? ''}` === k)
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...prev, { product_id: productId, variant_id: variantId, name, variant_name: variantName, quantity: 1, unit_price_cents: price }]
    })
  }

  const changeQty = (index: number, delta: number) => {
    setCart((prev) => prev.map((l, i) => (i === index ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l)))
  }

  const removeLine = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) {
      toast('Sumá al menos un producto.', 'error')
      return
    }
    setSubmitting(true)
    try {
      const sale = await api.post<SaleResult>('/api/admin/sales', {
        items: cart,
        discount_percent: discountPercent,
        payment_method: payment,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_cuit: customerCuit.trim(),
      })
      setReceipt({ ...sale, customer_phone: customerPhone.trim(), customer_cuit: customerCuit.trim() })
      setCart([])
      setDiscountInput('')
      setCustomerName('')
      setCustomerPhone('')
      setCustomerCuit('')
      toast(`Venta ${sale.number} registrada`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo registrar la venta.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const salesLoading = useMemo(() => products === undefined && q.length > 0, [products, q])

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Nueva venta</h1>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Lado izquierdo: búsqueda */}
        <div className="space-y-4 lg:col-span-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto por nombre…"
            prefix={<Search className="h-4 w-4" />}
            autoFocus
          />
          {q && (
            <div className="space-y-2">
              {salesLoading && <p className="text-sm text-gray-500">Buscando…</p>}
              {!salesLoading && (products?.length ?? 0) === 0 && (
                <p className="text-sm text-gray-500">Sin resultados para “{q}”.</p>
              )}
              {(products ?? []).slice(0, 12).map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-line bg-white p-3 text-left transition-colors hover:border-sand hover:bg-beige/30"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-beige/50">
                    {p.image?.url ? (
                      <img src={p.image.url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-lg text-sand/60">{p.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    {p.has_variants && <p className="text-xs text-gray-500">Tiene variantes</p>}
                  </div>
                  <MoneyDisplay cents={p.price_cents} small />
                  <Plus className="h-4 w-4 text-sand" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Derecha: carrito */}
        <div className="lg:col-span-2">
          <form onSubmit={submit} className="space-y-4">
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                <ShoppingBag className="h-4 w-4" /> Detalle de venta
              </h2>
              {cart.length === 0 ? (
                <p className="rounded-2xl bg-beige/40 px-4 py-6 text-center text-sm text-gray-500">
                  Buscalo y tocá para agregarlo a la venta.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {cart.map((line, i) => (
                    <li key={i} className="flex items-start gap-2 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{line.name}</p>
                        {line.variant_name && <p className="text-xs text-gray-500">{line.variant_name}</p>}
                        <p className="text-xs text-gray-500 tabular-nums">{formatMoney(line.unit_price_cents)} c/u</p>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-pill border border-line px-1.5 py-0.5">
                        <button type="button" onClick={() => changeQty(i, -1)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-beige/50" aria-label="Restar">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-sm font-bold tabular-nums">{line.quantity}</span>
                        <button type="button" onClick={() => changeQty(i, 1)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-beige/50" aria-label="Sumar">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="w-20 text-right text-sm font-semibold tabular-nums">{formatMoney(line.unit_price_cents * line.quantity)}</p>
                      <button type="button" onClick={() => removeLine(i)} className="mt-1 rounded-full p-1 text-gray-400 hover:text-red-600" aria-label="Quitar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-3 p-5">
              <Input label="Descuento (%)" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="0" hint={discount > 0 ? `-${formatMoney(discount)}` : undefined} />
              <Select label="Medio de pago" value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod)}>
                {PAYMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Cliente" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre" />
                <Input label="WhatsApp" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Cód + nº" />
                <Input label="CUIT / DNI" value={customerCuit} onChange={(e) => setCustomerCuit(e.target.value)} placeholder="Opcional" />
              </div>

              <div className="space-y-1.5 border-t border-line pt-3 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="tabular-nums">{formatMoney(subtotal)}</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700"><span>Descuento ({discountPercent}%)</span><span className="tabular-nums">-{formatMoney(discount)}</span></div>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-display text-xl font-semibold tabular-nums">{formatMoney(total)}</span>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={cart.length === 0} loading={submitting}>
                <Check className="h-4 w-4" /> Registrar venta
              </Button>
            </Card>
          </form>
        </div>
      </div>

      {/* Selector de variantes */}
      <Modal
        open={variantTarget !== null}
        onClose={() => setVariantTarget(null)}
        title={variantTarget?.has_variants ? `Elegí ${variantTarget?.name}` : ''}
      >
        {variantTarget && (
          <div className="grid gap-2">
            <VariantPicker product={variantTarget} onPick={(v) => addVariant(variantTarget, v)} />
          </div>
        )}
      </Modal>

      {/* Comprobante */}
      <Modal
        open={receipt !== null}
        onClose={() => setReceipt(null)}
        title={`Venta ${receipt?.number ?? ''}`}
        footer={
          <>
            {receipt && (
              <Button size="sm" onClick={() => navigate(`/admin/ventas/${receipt.id}/factura`)}>
                <FileText className="h-4 w-4" /> Comprobante
              </Button>
            )}
            {receipt?.customer_phone ? (
              <a
                href={buildWaLink((receipt.customer_phone as string) || '', `Hola ${receipt?.customer_name || ''}, tu compra por ${formatMoney(receipt?.total_cents ?? 0)} fue registrada. ¡Gracias!`)}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="whatsapp" size="sm">Avisar por WhatsApp</Button>
              </a>
            ) : null}
            <Button size="sm" onClick={() => setReceipt(null)}>Nueva venta</Button>
          </>
        }
      >
        {receipt && (
          <div className="space-y-2 text-sm">
            <p className="flex justify-between"><span className="text-gray-500">Fecha</span><span>{formatDateTime(receipt.created_at)}</span></p>
            <p className="flex justify-between"><span className="text-gray-500">Medio de pago</span><span>{PAYMENT_OPTIONS.find((o) => o.value === receipt.payment_method)?.label}</span></p>
            <p className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="tabular-nums">{formatMoney(receipt.subtotal_cents)}</span></p>
            {receipt.discount_cents > 0 && (
              <p className="flex justify-between"><span className="text-gray-500">Descuento</span><span className="tabular-nums">-{formatMoney(receipt.discount_cents)}</span></p>
            )}
            <div className="flex justify-between border-t border-line pt-3 font-display text-lg font-semibold">
              <span>Total</span><span className="tabular-nums">{formatMoney(receipt.total_cents)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function VariantPicker({ product, onPick }: { product: Product; onPick: (v: ProductVariant) => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['product-admin', product.id],
    queryFn: () => api.get<Product & { variants: ProductVariant[] }>(`/api/admin/products/${product.id}`),
  })
  return (
    <div className="grid gap-2">
      {isLoading && <p className="text-sm text-gray-500">Cargando variantes…</p>}
      {(detail?.variants ?? [])
        .filter((v) => v.active && v.stock > 0)
        .map((v) => (
          <button
            key={v.id}
            onClick={() => onPick(v)}
            className="flex items-center justify-between rounded-2xl border border-line bg-white p-3.5 transition-colors hover:border-sand hover:bg-beige/30"
          >
            <div>
              <p className="text-sm font-semibold">{v.name}</p>
              <p className="text-xs text-gray-500">{v.stock} u. disponibles</p>
            </div>
            <MoneyDisplay cents={v.price_cents ?? product.price_cents} small />
          </button>
        ))}
      {(detail?.variants ?? []).filter((v) => v.active && v.stock > 0).length === 0 && !isLoading && (
        <p className="rounded-2xl bg-beige/40 px-4 py-6 text-center text-sm text-gray-500">
          No hay variantes con stock disponibles.
        </p>
      )}
    </div>
  )
}