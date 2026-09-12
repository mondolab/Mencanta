import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, Package, Wallet, Boxes, TrendingUp, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import type { Dashboard as DashboardData } from '@/types'
import { StatCard } from '@/components/admin/StatCard'
import { Card } from '@/components/ui/Card'
import { Table, Td, Th } from '@/components/ui/Table'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { PAYMENT_LABELS } from '@/lib/utils'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function Dashboard() {
  usePageTitle('Dashboard — M\' encanta Gestión')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/api/admin/dashboard'),
  })

  if (isLoading) return <LoadingState />
  if (!data) return <EmptyState title="No hay datos todavía" />

  const monthNet = data.month.sales_total_cents - data.month.expenses_total_cents

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-500">Resumen del día y del mes.</p>
        </div>
        <Link to="/admin/nueva-venta">
          <Button><ShoppingBag className="h-4 w-4" /> Nueva venta</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ventas hoy"
          value={<span>{data.today.sales_count} · <MoneyDisplay cents={data.today.total_cents} /></span>}
          icon={<ShoppingBag className="h-5 w-5" />}
          tone="pink"
        />
        <StatCard
          label="Pedidos pendientes"
          value={data.orders_pending}
          icon={<Package className="h-5 w-5" />}
          tone={data.orders_pending > 0 ? 'warn' : 'default'}
          sub={<Link to="/admin/pedidos" className="underline underline-offset-2">Ver pedidos</Link>}
        />
        <StatCard
          label="Caja esperada hoy"
          value={data.cash.register ? <MoneyDisplay cents={data.cash.expected_cents} /> : '—'}
          icon={<Wallet className="h-5 w-5" />}
          tone={data.cash.register ? (data.cash.register.status === 'cerrada' ? 'warn' : 'default') : 'warn'}
          sub={<Link to="/admin/caja" className="underline underline-offset-2">Abrir / ver caja</Link>}
        />
        <StatCard
          label="Stock total"
          value={data.total_stock}
          icon={<Boxes className="h-5 w-5" />}
          tone={data.low_stock_count > 0 ? 'warn' : 'default'}
          sub={`${data.low_stock_count} en nivel bajo`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Mes actual</h2>
            <Link to="/admin/ventas" className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:underline">
              Ver ventas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-beige/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ventas</p>
              <p className="mt-1 font-display text-xl font-semibold">{data.month.sales_count}</p>
              <p className="text-xs text-gray-500"><MoneyDisplay cents={data.month.sales_total_cents} /></p>
            </div>
            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Gastos</p>
              <p className="mt-1 font-display text-xl font-semibold">{data.month.expenses_count}</p>
              <p className="text-xs text-gray-500"><MoneyDisplay cents={data.month.expenses_total_cents} /></p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 sm:col-span-1 col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resultado</p>
              <p className="mt-1 flex items-center gap-1.5 font-display text-xl font-semibold">
                <TrendingUp className="h-5 w-5 text-emerald-600" /> <MoneyDisplay cents={monthNet} />
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Pagos de hoy</h2>
          {data.today.payments.length === 0 ? (
            <p className="text-sm text-gray-500">Todavía no hay ventas hoy.</p>
          ) : (
            <ul className="space-y-3">
              {data.today.payments.map((p) => (
                <li key={p.method} className="flex items-center justify-between rounded-2xl bg-beige/40 px-4 py-3">
                  <span className="text-sm font-medium">{PAYMENT_LABELS[p.method] ?? p.method}</span>
                  <MoneyDisplay cents={p.total_cents} small />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-0 lg:col-span-1">
          <div className="flex items-center justify-between px-6 pt-5">
            <h2 className="font-display text-lg font-semibold">Últimas ventas</h2>
            <Link to="/admin/ventas" className="text-xs font-semibold text-ink underline underline-offset-2">Ver todas</Link>
          </div>
          <div className="p-4">
            {data.latest_sales.length === 0 ? (
              <EmptyState title="Sin ventas hoy" description="Cuando registres tu primera venta del día aparecerá acá." />
            ) : (
              <Table>
                <thead>
                  <tr><Th>N°</Th><Th>Cliente</Th><Th>Medio</Th><Th className="text-right">Total</Th></tr>
                </thead>
                <tbody>
                  {data.latest_sales.slice(0, 6).map((s) => (
                    <tr key={s.id} className="border-t border-line/60">
                      <Td className="font-medium">{s.number}</Td>
                      <Td>{s.customer_name || '—'}</Td>
                      <Td>{PAYMENT_LABELS[s.payment_method] ?? s.payment_method}</Td>
                      <Td className="text-right"><MoneyDisplay cents={s.total_cents} small /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Stock bajo</h2>
            <Link to="/admin/inventario" className="text-xs font-semibold text-ink underline underline-offset-2">Inventario</Link>
          </div>
          {data.low_stock_products.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Boxes className="h-4 w-4" /> Todo con buen stock.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.low_stock_products.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-2xl bg-beige/40 px-4 py-3">
                  <div className="min-w-0">
                    <Link to={`/admin/productos/${p.id}/editar`} className="block truncate text-sm font-medium text-ink hover:underline">
                      {p.name}
                    </Link>
                    {p.stock <= 0 && <span className="text-xs text-red-600">Sin stock</span>}
                    {p.stock > 0 && p.min_stock > 0 && p.stock < p.min_stock && (
                      <span className="text-xs text-amber-700">Mínimo: {p.min_stock}</span>
                    )}
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{p.stock} u.</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}