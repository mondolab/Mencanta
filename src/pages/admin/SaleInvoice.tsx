import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Printer, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import type { Sale } from '@/types'
import { formatDateTime, formatMoney } from '@/lib/money'
import { PAYMENT_LABELS } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'

export default function SaleInvoice() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => api.get<Sale>(`/api/admin/sales/${id}`),
  })

  const { data: rawSettings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get<Record<string, unknown>>('/api/admin/settings'),
  })

  if (isLoading) return <LoadingState />
  if (!sale) return <EmptyState title="Venta no encontrada" />

  const settings = rawSettings ?? {}
  const business = (settings.business as { name?: string; tagline?: string; description?: string }) ?? {}
  const invoice = (settings.invoice as { tax_id?: string; footer?: string }) ?? {}
  const address = (settings.address as { street?: string; city?: string; notes?: string }) ?? {}
  const whatsapp = (settings.whatsapp as { display?: string }) ?? {}
  const contact = (settings.contact as { email?: string; instagram?: string }) ?? {}
  const brand = business.name || 'M\u0027 encanta'
  const customerPhone = (sale as Sale & { customer_phone?: string }).customer_phone ?? ''

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="no-print mb-4 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => navigate(`/admin/ventas/${sale.id}`)}>
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <div className="flex gap-2">
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir / guardar PDF
            </Button>
          </div>
        </div>

        <div className="invoice-doc rounded-3xl bg-white p-8 shadow-lift">
          {/* Encabezado */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-5">
            <div>
              <h1 className="font-display text-2xl font-semibold leading-tight">{brand}</h1>
              {business.tagline && <p className="text-xs uppercase tracking-widest text-gray-500">{business.tagline}</p>}
              <div className="mt-2 space-y-0.5 text-[12px] text-gray-600">
                {invoice.tax_id && <p className="font-semibold">CUIT: {invoice.tax_id}</p>}
                {address.street && <p>{address.street}</p>}
                {address.city && <p>{address.city}</p>}
                {whatsapp.display && <p>WhatsApp: {whatsapp.display}</p>}
                {contact.email && <p>{contact.email}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Comprobante de venta</p>
              <p className="mt-1 font-display text-lg font-semibold">N° {sale.number}</p>
              <p className="mt-1 text-[12px] text-gray-600">{formatDateTime(sale.created_at)}</p>
            </div>
          </div>

          {/* Cliente */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Cliente</p>
              <p className="mt-0.5 text-sm font-semibold">{sale.customer_name || 'Consumidor final'}</p>
              {sale.customer_cuit && <p className="text-[12px] text-gray-600">CUIT/DNI: {sale.customer_cuit}</p>}
              {customerPhone && <p className="text-[12px] text-gray-600">{customerPhone}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Medio de pago</p>
              <p className="mt-0.5 text-sm font-semibold">{PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}</p>
            </div>
          </div>

          {/* Detalle */}
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-widest text-gray-400">
                <th className="py-2 pr-2 font-semibold">Detalle</th>
                <th className="py-2 px-2 text-center font-semibold">Cant.</th>
                <th className="py-2 px-2 text-right font-semibold">P. unitario</th>
                <th className="py-2 pl-2 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(sale.items ?? []).map((item) => (
                <tr key={item.id} className="border-b border-line/50">
                  <td className="py-2.5 pr-2">
                    <p className="font-medium">{item.product_name}</p>
                    {item.variant_name && <p className="text-[12px] text-gray-500">{item.variant_name}</p>}
                  </td>
                  <td className="py-2.5 px-2 text-center tabular-nums">{item.quantity}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{formatMoney(item.unit_price_cents)}</td>
                  <td className="py-2.5 pl-2 text-right tabular-nums font-medium">{formatMoney(item.subtotal_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div className="mt-5 flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="tabular-nums">{formatMoney(sale.subtotal_cents)}</span></div>
              {(sale.discount_cents ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-700"><span>Descuento</span><span className="tabular-nums">-{formatMoney(sale.discount_cents)}</span></div>
              )}
              <div className="flex items-center justify-between border-t-2 border-ink pt-2 font-display text-lg font-semibold">
                <span>Total</span><span className="tabular-nums">{formatMoney(sale.total_cents)}</span>
              </div>
            </div>
          </div>

          {/* Pie */}
          {(invoice.footer || business.name) && (
            <div className="mt-8 border-t border-line pt-4 text-center text-[12px] text-gray-500">
              {invoice.footer || 'Gracias por tu compra.'}
              <p className="mt-1 text-[10px] text-gray-400">Comprobante no válido como factura fiscal.</p>
            </div>
          )}
        </div>
        <p className="no-print mt-4 text-center text-xs text-gray-400">Consejo: usá "Guardar como PDF" en el diálogo de impresión para compartirlo por WhatsApp.</p>
      </div>
    </div>
  )
}