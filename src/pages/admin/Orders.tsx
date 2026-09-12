import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { api } from '@/lib/api'
import type { Order } from '@/types'
import { formatDateTime } from '@/lib/money'
import { buildWaLink } from '@/lib/whatsapp'
import { cn, ORDER_STATUS_LABELS } from '@/lib/utils'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { Select } from '@/components/ui/Select'
import { Table, Td, Th } from '@/components/ui/Table'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePageTitle } from '@/hooks/usePageTitle'

const statusFilters = [
  { value: 'pendientes', label: 'Pendientes de resolver' },
  { value: 'todos', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'preparando', label: 'En preparación' },
  { value: 'listo', label: 'Listo' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
]

export default function Orders() {
  usePageTitle('Pedidos — M\' encanta Gestión')
  const [status, setStatus] = useState('pendientes')

  const { data, isLoading } = useQuery({
    queryKey: ['orders', status],
    queryFn: () => api.get<Order[]>(`/api/admin/orders?${new URLSearchParams({ status })}`),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Pedidos online</h1>
          <p className="text-sm text-gray-500">Pedidos hechos desde la tienda web.</p>
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-56" aria-label="Filtrar por estado">
          {statusFilters.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No hay pedidos" description="Cuando alguien haga un pedido desde la tienda web aparece acá." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>N°</Th>
              <Th>Fecha</Th>
              <Th>Cliente</Th>
              <Th>Entrega</Th>
              <Th>Estado</Th>
              <Th className="text-right">Total</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {data.map((o) => (
              <tr key={o.id} className="border-t border-line/60 hover:bg-beige/20">
                <Td className="font-medium">{o.number}</Td>
                <Td className="whitespace-nowrap text-gray-600">{formatDateTime(o.created_at)}</Td>
                <Td>
                  <p className="font-medium">{o.customer_name}</p>
                  <p className="text-xs text-gray-500">{o.customer_phone || '—'}</p>
                </Td>
                <Td className={cn('capitalize text-xs font-semibold', o.delivery_type === 'envio' ? 'text-sky-700' : 'text-violet-700')}>
                  {o.delivery_type === 'envio' ? 'Envío' : 'Retiro'}
                </Td>
                <Td><OrderStatusBadge status={o.status} /></Td>
                <Td className="text-right"><MoneyDisplay cents={o.total_cents} small /></Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Link to={`/admin/pedidos/${o.id}`} className="rounded-pill border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-sand hover:bg-beige/30">
                      Ver
                    </Link>
                    {o.status !== 'cancelado' && (
                      <a
                        href={buildWaLink(o.customer_phone, `Hola ${o.customer_name}, te escribimos por tu pedido ${o.number} (${ORDER_STATUS_LABELS[o.status]}). ¿Lo coordinamos?`)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-pill bg-[#25D366]/15 text-[#1fb457] transition-colors hover:bg-[#25D366]/30"
                        aria-label="Contactar por WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {data && data.length > 0 && (
        <p className="text-xs text-gray-400">Usá el botón de WhatsApp para coordinar cada pedido con el cliente.</p>
      )}
    </div>
  )
}