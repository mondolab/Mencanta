import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, MessageCircle } from 'lucide-react'
import { api } from '@/lib/api'
import type { Order, OrderItem, OrderStatus, PaymentMethod } from '@/types'
import { formatDateTime, formatMoney, parsePercent, percentOfCents } from '@/lib/money'
import { buildWaLink } from '@/lib/whatsapp'
import { ORDER_STATUS_LABELS, PAYMENT_OPTIONS } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Table, Td, Th } from '@/components/ui/Table'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showConvert, setShowConvert] = useState(false)
  const [convertPayment, setConvertPayment] = useState<PaymentMethod>('efectivo')
  const [convertDiscount, setConvertDiscount] = useState('')

  usePageTitle('Pedido — M\' encanta Gestión')

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<Order & { items: OrderItem[] }>(`/api/admin/orders/${id}`),
  })

  const updateOrder = useMutation({
    mutationFn: (payload: { status: OrderStatus }) => api.put(`/api/admin/orders/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast('Pedido actualizado')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo actualizar.', 'error'),
  })

  const convertDiscountPercent = parsePercent(convertDiscount)
  const convertDiscountCents = percentOfCents(order?.subtotal_cents ?? 0, convertDiscountPercent)

  const convert = useMutation({
    mutationFn: () =>
      api.post(`/api/admin/orders/${id}/convert`, {
        payment_method: convertPayment,
        discount_percent: convertDiscountPercent,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast('Pedido registrado como venta')
      setShowConvert(false)
      setConvertDiscount('')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo registrar la venta.', 'error'),
  })

  if (isLoading) return <LoadingState />
  if (!order) return <EmptyState title="Pedido no encontrado" />

  const isCancelled = order.status === 'cancelado'
  const isConverted = order.sale_id != null

  return (
    <div className="space-y-6">
      <Link to="/admin/pedidos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> Pedidos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 font-display text-2xl font-semibold">
            Pedido {order.number}
            <OrderStatusBadge status={order.status} />
          </h1>
          <p className="text-sm text-gray-500">Recibido el {formatDateTime(order.created_at)} · Origen web</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={buildWaLink(order.customer_phone, `Hola ${order.customer_name}, te escribimos por tu pedido ${order.number} (${ORDER_STATUS_LABELS[order.status]}). ¿Lo coordinamos?`)}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="whatsapp"><MessageCircle className="h-4 w-4" /> Escribir al cliente</Button>
          </a>
          {!isCancelled && !isConverted && (
            <Button onClick={() => setShowConvert(true)}>Registrar como venta</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Productos</h2>
            <Table>
              <thead>
                <tr><Th>Producto</Th><Th>Variante</Th><Th className="text-right">Cant.</Th><Th className="text-right">Subtotal</Th></tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id} className="border-t border-line/60">
                    <Td>{it.product_name}</Td>
                    <Td>{it.variant_name || '—'}</Td>
                    <Td className="text-right tabular-nums">{it.quantity}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(it.subtotal_cents)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="tabular-nums">{formatMoney(order.subtotal_cents)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Envío</span><span className="tabular-nums">{order.delivery_type === 'envio' ? formatMoney(order.shipping_cents) : '—'}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span className="tabular-nums">{formatMoney(order.total_cents)}</span></div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-display text-lg font-semibold">Estado del pedido</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={order.status} onChange={(e) => updateOrder.mutate({ status: e.target.value as OrderStatus })} className="w-52">
                {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
              {updateOrder.isPending && <span className="text-xs text-gray-500">Guardando…</span>}
            </div>
            {order.observations && (
              <div className="mt-4 rounded-2xl bg-beige/50 p-4 text-sm text-gray-700">
                <span className="font-semibold">Observaciones:</span> {order.observations}
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Cliente</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="font-semibold text-gray-500">Nombre</dt><dd>{order.customer_name}</dd></div>
            <div><dt className="font-semibold text-gray-500">WhatsApp</dt><dd className="tabular-nums">{order.customer_phone}</dd></div>
            <div><dt className="font-semibold text-gray-500">Entrega</dt><dd className="capitalize">{order.delivery_type === 'envio' ? 'Envío a domicilio' : 'Retiro en showroom'}</dd></div>
            <div><dt className="font-semibold text-gray-500">Creado</dt><dd>{formatDateTime(order.created_at)}</dd></div>
          </dl>
          {isConverted && (
            <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
              Este pedido ya fue registrado como venta.
            </p>
          )}
        </Card>
      </div>

      <Modal
        open={showConvert}
        onClose={() => setShowConvert(false)}
        title={`Registrar ${order.number} como venta`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowConvert(false)}>Cancelar</Button>
            <Button onClick={() => convert.mutate()} loading={convert.isPending}>Registrar y descontar stock</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Medio de pago" value={convertPayment} onChange={(e) => setConvertPayment(e.target.value as PaymentMethod)}>
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Input label="Descuento (%)" value={convertDiscount} onChange={(e) => setConvertDiscount(e.target.value)} placeholder="0" />
        </div>
        {convertDiscountCents > 0 && (
          <p className="mt-3 text-right text-sm text-emerald-700">
            Descuento (-{convertDiscountPercent}%): {formatMoney(convertDiscountCents)} → Total {formatMoney((order?.total_cents ?? 0) - convertDiscountCents)}
          </p>
        )}
        <p className="mt-4 rounded-2xl bg-beige/50 px-4 py-3 text-xs text-gray-600">
          Se descuenta el stock de los productos registrados y, si el medio de pago es efectivo, se suma a la caja de hoy.
        </p>
      </Modal>
    </div>
  )
}