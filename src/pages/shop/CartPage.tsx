import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, MessageCircle, Truck, Store } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useSettings } from '@/contexts/SettingsContext'
import { useToast } from '@/contexts/ToastContext'
import { api } from '@/lib/api'
import { enviarPedidoWhatsApp } from '@/lib/whatsapp'
import { formatMoney } from '@/lib/money'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/lib/utils'
import type { Order } from '@/types'

export default function CartPage() {
  const { items, setQuantity, remove, subtotalCents, clear } = useCart()
  const { settings, whatsappNumber } = useSettings()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryType, setDeliveryType] = useState<'envio' | 'retiro'>('envio')
  const [observations, setObservations] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<Order | null>(null)

  usePageTitle('Carrito — M\' encanta')

  const shipping = settings?.shipping
  const freeFrom = shipping?.min_order_free_cents ?? 0
  const deliveryCost = shipping?.cost_cents ?? 0
  const shippingCents = deliveryType === 'envio' && subtotalCents < freeFrom ? deliveryCost : 0
  const totalCents = subtotalCents + shippingCents

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <EmptyState
          title="Tu carrito está vacío"
          description="Explorá la colección y sumá productos para armar tu pedido."
          action={<Link to="/productos"><Button>Ver catálogo</Button></Link>}
        />
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      toast('Completá tu nombre y WhatsApp.', 'error')
      return
    }
    setSubmitting(true)
    try {
      const order = await api.post<Order>('/api/orders', {
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        delivery_type: deliveryType,
        observations,
        items: items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id ?? null, quantity: i.quantity })),
      })
      setCreated(order)
      const link = enviarPedidoWhatsApp(
        whatsappNumber,
        items.map((i) => ({ name: i.name, variant: i.variant_name, quantity: i.quantity })),
        totalCents,
        deliveryType === 'envio' ? 'Elijo envío a domicilio.' : 'Voy a retirarlo en el showroom.',
      )
      window.open(link, '_blank')
      clear()
      toast('Pedido generado. Te abrimos WhatsApp para confirmarlo.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo generar el pedido.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-display text-3xl font-semibold">Tu carrito</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ul className="divide-y divide-line rounded-3xl border border-line bg-white shadow-soft">
            {items.map((item) => {
              const lineKey = `${item.product_id}:${item.variant_id ?? ''}`
              return (
                <li key={lineKey} className="flex gap-4 p-4">
                  <Link to={`/producto/${item.slug}`} className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-beige/40">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-2xl text-sand/60">
                        {item.name.charAt(0)}
                      </div>
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link to={`/producto/${item.slug}`} className="font-display text-base text-ink hover:underline">
                          {item.name}
                        </Link>
                        {item.variant_name && <p className="text-xs text-gray-500">{item.variant_name}</p>}
                      </div>
                      <button
                        onClick={() => remove(item.product_id, item.variant_id)}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Quitar producto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3 rounded-pill border border-line px-2 py-1">
                        <button
                          onClick={() => setQuantity(item.product_id, item.variant_id, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-ink hover:bg-beige/50"
                          aria-label="Restar"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                        <button
                          onClick={() => setQuantity(item.product_id, item.variant_id, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-ink hover:bg-beige/50"
                          aria-label="Sumar"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="font-semibold tabular-nums">{formatMoney(item.price_cents * item.quantity)}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-line bg-white p-6 shadow-soft">
            <h2 className="font-display text-xl font-semibold">Completá tu pedido</h2>

            <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" required />
            <Input
              label="WhatsApp"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Código de área + número"
              required
            />

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">Entrega</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('envio')}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-xs font-semibold transition-colors',
                    deliveryType === 'envio' ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:bg-beige/30',
                  )}
                >
                  <Truck className="h-4 w-4" />
                  Envío a domicilio
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType('retiro')}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-xs font-semibold transition-colors',
                    deliveryType === 'retiro' ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:bg-beige/30',
                  )}
                >
                  <Store className="h-4 w-4" />
                  Retiro en showroom
                </button>
              </div>
            </div>

            <Input
              label="Observaciones (opcional)"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ej: preferís que te llame antes de enviar…"
            />

            <div className="space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatMoney(subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Envío</span>
                <span className="tabular-nums">{shippingCents === 0 ? (deliveryType === 'envio' && subtotalCents >= freeFrom ? 'Gratis' : 'Retiro') : formatMoney(shippingCents)}</span>
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <span className="font-semibold">Total estimado</span>
                <span className="font-display text-xl font-semibold tabular-nums">{formatMoney(totalCents)}</span>
              </div>
              {deliveryType === 'envio' && freeFrom > 0 && subtotalCents < freeFrom && (
                <p className="text-xs text-gray-500">
                  Envío gratis a partir de {formatMoney(freeFrom)}.
                </p>
              )}
            </div>

            <Button type="submit" variant="whatsapp" size="lg" className="w-full" loading={submitting}>
              <MessageCircle className="h-4 w-4" />
              {created ? 'Reenviar por WhatsApp' : 'Enviar pedido por WhatsApp'}
            </Button>
            <p className="text-center text-xs text-gray-500">
              Generamos tu pedido y te abrimos WhatsApp para coordinar la entrega.
            </p>
            {created && (
              <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                Pedido {created.number} registrado. Ahora coordiná el pago por WhatsApp.
              </p>
            )}
            <div className="flex justify-center">
              <button type="button" onClick={() => navigate('/productos')} className="text-xs font-semibold text-ink underline underline-offset-4">
                Seguir comprando
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}