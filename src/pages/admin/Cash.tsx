import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, ArrowUpFromLine, Wallet, BadgeCheck } from 'lucide-react'
import { api } from '@/lib/api'
import type { CashMovement } from '@/types'
import { formatDateTime, formatMoney, parseAmountToCents, formatDate } from '@/lib/money'
import { PAYMENT_LABELS } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Table, Td, Th } from '@/components/ui/Table'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/admin/StatCard'
import { usePageTitle } from '@/hooks/usePageTitle'

interface CashData {
  register: {
    id: number
    date: string
    opened_at: string
    closed_at: string | null
    opening_cents: number
    status: string
    observations: string
  } | null
  movements: CashMovement[]
  totals: { in: number; out: number }
  expected: number
  today: {
    by_method: Record<string, number>
    total_sold: number
    efectivo: number
    transferencia: number
    tarjetas: number
  }
}

const MOVEMENT_LABELS: Record<string, string> = {
  venta_efectivo: 'Venta en efectivo',
  ingreso: 'Ingreso',
  retiro: 'Retiro',
  ajuste: 'Ajuste',
  gasto: 'Gasto',
}

export default function Cash() {
  usePageTitle('Caja — M\' encanta Gestión')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [openModal, setOpenModal] = useState(false)
  const [opening, setOpening] = useState('')
  const [movementModal, setMovementModal] = useState(false)
  const [moveType, setMoveType] = useState<'ingreso' | 'retiro' | 'ajuste'>('ingreso')
  const [moveDesc, setMoveDesc] = useState('')
  const [moveAmount, setMoveAmount] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['cash'],
    queryFn: () => api.get<CashData>('/api/admin/cash'),
  })

  const { data: registers } = useQuery({
    queryKey: ['cash-registers'],
    queryFn: () => api.get<Array<{ id: number; date: string; opening_cents: number; expected_cents: number; counted_cents: number | null; difference_cents: number | null; status: string; closed_at: string | null }>>('/api/admin/cash/registers'),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cash'] })
    queryClient.invalidateQueries({ queryKey: ['cash-registers'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const openCash = useMutation({
    mutationFn: () => api.post('/api/admin/cash/open', { opening_cents: parseAmountToCents(opening) }),
    onSuccess: () => { toast('Caja abierta'); setOpenModal(false); setOpening(''); invalidate() },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo abrir la caja.', 'error'),
  })

  const addMovement = useMutation({
    mutationFn: () =>
      api.post('/api/admin/cash/movements', {
        type: moveType,
        description: moveDesc,
        amount_cents: parseAmountToCents(moveAmount),
        direction: moveType === 'retiro' ? 'out' : 'in',
      }),
    onSuccess: () => { toast('Movimiento cargado'); setMovementModal(false); setMoveDesc(''); setMoveAmount(''); invalidate() },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo cargar el movimiento.', 'error'),
  })

  const reopen = useMutation({
    mutationFn: (registerId: number) => api.post(`/api/admin/cash/${registerId}/reopen`),
    onSuccess: () => { toast('Caja reabierta'); invalidate() },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo reabrir.', 'error'),
  })

  if (isLoading) return <LoadingState />

  const registerOpen = data?.register && data.register.status === 'abierta'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Caja</h1>
          <p className="text-sm text-gray-500">
            {registerOpen
              ? `Abierta el ${formatDate(data!.register!.opened_at)}`
              : 'No hay caja abierta hoy.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!registerOpen && <Button onClick={() => setOpenModal(true)}><Wallet className="h-4 w-4" /> Abrir caja</Button>}
          {registerOpen && (
            <>
              <Button variant="outline" onClick={() => setMovementModal(true)}><ArrowDownToLine className="h-4 w-4" /> Movimiento</Button>
              <Link to="/admin/caja/cierre"><Button><BadgeCheck className="h-4 w-4" /> Realizar cierre</Button></Link>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Efectivo esperado" value={data ? <MoneyDisplay cents={data.expected} /> : '—'} icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Ventas de hoy" value={data ? <MoneyDisplay cents={data.today.total_sold} /> : '—'} icon={<BadgeCheck className="h-5 w-5" />} tone="pink" />
        <StatCard label="Ingresos" value={data ? <MoneyDisplay cents={data.totals.in} /> : '—'} icon={<ArrowDownToLine className="h-5 w-5" />} tone="ok" />
        <StatCard label="Egresos" value={data ? <MoneyDisplay cents={data.totals.out} /> : '—'} icon={<ArrowUpFromLine className="h-5 w-5" />} tone="warn" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold">Movimientos</h2>
          {!data || data.movements.length === 0 ? (
            <EmptyState title="Sin movimientos" description="Las ventas en efectivo y los gastos aparecen acá automáticamente." />
          ) : (
            <Table>
              <thead>
                <tr><Th>Fecha</Th><Th>Concepto</Th><Th className="text-right">Importe</Th></tr>
              </thead>
              <tbody>
                {data.movements.map((m) => (
                  <tr key={m.id} className="border-t border-line/60">
                    <Td className="whitespace-nowrap text-gray-600">{formatDateTime(m.created_at)}</Td>
                    <Td>
                      <p className="font-medium">{m.description || (MOVEMENT_LABELS[m.type] ?? m.type)}</p>
                      <p className="text-xs text-gray-500">{MOVEMENT_LABELS[m.type] ?? m.type}{m.payment_method ? ` · ${PAYMENT_LABELS[m.payment_method] ?? m.payment_method}` : ''}</p>
                    </Td>
                    <Td className="text-right">
                      <span className={m.direction === 'in' ? 'text-emerald-600' : 'text-red-600'}>
                        {m.direction === 'in' ? '+' : '−'}{formatMoney(m.amount_cents)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Hoy por medio</h2>
          {data && (
            <ul className="space-y-2.5">
              <li className="flex justify-between rounded-2xl bg-beige/40 px-4 py-3 text-sm">
                <span>Efectivo</span><span className="font-semibold tabular-nums">{formatMoney(data.today.efectivo)}</span>
              </li>
              <li className="flex justify-between rounded-2xl bg-beige/40 px-4 py-3 text-sm">
                <span>Transferencia</span><span className="font-semibold tabular-nums">{formatMoney(data.today.transferencia)}</span>
              </li>
              <li className="flex justify-between rounded-2xl bg-beige/40 px-4 py-3 text-sm">
                <span>Tarjetas</span><span className="font-semibold tabular-nums">{formatMoney(data.today.tarjetas)}</span>
              </li>
            </ul>
          )}
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Cierres anteriores</h3>
            {!registers || registers.filter((r) => r.status === 'cerrada').length === 0 ? (
              <p className="text-sm text-gray-500">Todavía no hay cierres.</p>
            ) : (
              <ul className="space-y-2">
                {registers.filter((r) => r.status === 'cerrada').slice(0, 6).map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-2xl border border-line px-4 py-2.5 text-xs">
                    <span className="font-medium tabular-nums">{formatDate(r.closed_at)}</span>
                    <span className="tabular-nums">{formatMoney(r.expected_cents)}</span>
                    <button
                      onClick={() => reopen.mutate(r.id)}
                      className="text-xs font-semibold text-sand hover:underline"
                      title="Reabrir esta caja"
                    >
                      Reabrir
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Abrir caja */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Abrir caja"
        footer={<Button onClick={() => openCash.mutate()} loading={openCash.isPending}>Abrir caja</Button>}
      >
        <p className="mb-4 text-sm text-gray-600">Cargá el monto con el que abre la caja hoy (puede ser 0).</p>
        <Input label="Apertura ($)" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="$ 0" autoFocus />
      </Modal>

      {/* Movimiento manual */}
      <Modal open={movementModal} onClose={() => setMovementModal(false)} title="Registrar movimiento"
        footer={<Button onClick={() => addMovement.mutate()} loading={addMovement.isPending}>Guardar</Button>}
      >
        <div className="grid gap-4">
          <Select label="Tipo" value={moveType} onChange={(e) => setMoveType(e.target.value as typeof moveType)}>
            <option value="ingreso">Ingreso (entra plata)</option>
            <option value="retiro">Retiro (sale plata)</option>
            <option value="ajuste">Ajuste</option>
          </Select>
          <Input label="Concepto" value={moveDesc} onChange={(e) => setMoveDesc(e.target.value)} placeholder="Ej: cambio para entrega…" required />
          <Input label="Importe ($)" value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} placeholder="$ 0" required />
        </div>
      </Modal>
    </div>
  )
}