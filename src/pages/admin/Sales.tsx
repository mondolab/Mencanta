import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { api } from '@/lib/api'
import type { Sale, SaleItem } from '@/types'
import { formatDateTime, toDateInputValue, formatMoney } from '@/lib/money'
import { PAYMENT_LABELS } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Table, Td, Th } from '@/components/ui/Table'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function Sales() {
  usePageTitle('Ventas — M\' encanta Gestión')

  const todayValue = toDateInputValue(new Date().toISOString())
  const [from, setFrom] = useState(todayValue)
  const [to, setTo] = useState(todayValue)
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sales', { from, to }],
    queryFn: () => api.get<Sale[]>(`/api/admin/sales?${new URLSearchParams({ from, to })}`),
  })

  const { data: detail } = useQuery({
    queryKey: ['sale', detailId],
    queryFn: () => api.get<Sale & { items: SaleItem[] }>(`/api/admin/sales/${detailId}`),
    enabled: detailId !== null,
  })

  const totals = (data ?? []).reduce((acc, s) => acc + s.total_cents, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Ventas</h1>
          <p className="text-sm text-gray-500">{data?.length ?? 0} ventas · <MoneyDisplay cents={totals} /></p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Desde" className="w-40" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Hasta" className="w-40" />
          <Button variant="outline" size="md" onClick={() => { setFrom(todayValue); setTo(todayValue) }}>
            Hoy
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Sin ventas en ese rango" description="Filtrá por fechas o registrá una venta nueva." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>N°</Th>
              <Th>Fecha</Th>
              <Th>Cliente</Th>
              <Th>Medio</Th>
              <Th>Origen</Th>
              <Th className="text-right">Total</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id} className="border-t border-line/60 hover:bg-beige/20">
                <Td className="font-medium">{s.number}</Td>
                <Td className="whitespace-nowrap text-gray-600">{formatDateTime(s.created_at)}</Td>
                <Td>{s.customer_name || '—'}</Td>
                <Td>{PAYMENT_LABELS[s.payment_method] ?? s.payment_method}</Td>
                <Td className="uppercase text-xs font-semibold tracking-wide text-gray-400">{s.source}</Td>
                <Td className="text-right"><MoneyDisplay cents={s.total_cents} small /></Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDetailId(s.id)} className="rounded-pill border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-sand hover:bg-beige/30">
                      Ver
                    </button>
                    <Link to={`/admin/ventas/${s.id}/factura`} className="inline-flex items-center gap-1 rounded-pill border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-sand hover:bg-beige/30">
                      <FileText className="h-3.5 w-3.5" /> Comprobante
                    </Link>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal open={detailId !== null} onClose={() => setDetailId(null)} title={`Venta ${detail?.number ?? ''}`} size="lg">
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-gray-500">Total</p>
                <p className="mt-1 font-display text-lg font-semibold"><MoneyDisplay cents={detail.total_cents} /></p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-gray-500">Medio</p>
                <p className="mt-1 text-sm font-semibold">{PAYMENT_LABELS[detail.payment_method]}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-gray-500">Cliente</p>
                <p className="mt-1 text-sm font-semibold">{detail.customer_name || '—'}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-gray-500">Fecha</p>
                <p className="mt-1 text-sm font-semibold">{formatDateTime(detail.created_at)}</p>
              </Card>
            </div>

            <Table>
              <thead>
                <tr><Th>Producto</Th><Th>Variante</Th><Th className="text-right">Cant.</Th><Th className="text-right">P. unit</Th><Th className="text-right">Subtotal</Th></tr>
              </thead>
              <tbody>
                {detail.items.map((it) => (
                  <tr key={it.id} className="border-t border-line/60">
                    <Td>{it.product_name}</Td>
                    <Td>{it.variant_name || '—'}</Td>
                    <Td className="text-right tabular-nums">{it.quantity}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(it.unit_price_cents)}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(it.subtotal_cents)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="tabular-nums">{formatMoney(detail.subtotal_cents)}</span></div>
              {detail.discount_cents > 0 && (
                <div className="flex justify-between text-emerald-700"><span>Descuento</span><span className="tabular-nums">-{formatMoney(detail.discount_cents)}</span></div>
              )}
              <div className="flex justify-between font-semibold"><span>Total</span><span className="tabular-nums">{formatMoney(detail.total_cents)}</span></div>
            </div>

            <Link to={`/admin/ventas/${detail.id}/factura`} className="inline-block">
              <Button><FileText className="h-4 w-4" /> Generar comprobante</Button>
            </Link>
          </div>
        )}
      </Modal>
    </div>
  )
}