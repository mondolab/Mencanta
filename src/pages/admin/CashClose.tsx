import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Wallet } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDateTime, formatMoney, parseAmountToCents } from '@/lib/money'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { PayBreakdown } from '@/components/ui/PayBreakdown'
import { usePageTitle } from '@/hooks/usePageTitle'

interface CashData {
  register: {
    id: number
    date: string
    opened_at: string
    opening_cents: number
    status: string
    observations: string
  } | null
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

export default function CashClose() {
  usePageTitle('Cierre de caja — M\' encanta Gestión')
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [counted, setCounted] = useState('')
  const [observations, setObservations] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['cash'],
    queryFn: () => api.get<CashData>('/api/admin/cash'),
  })

  const countedCents = parseAmountToCents(counted)
  const difference = data ? countedCents - data.expected : 0

  const closeCash = useMutation({
    mutationFn: () =>
      api.post('/api/admin/cash/close', { counted_cents: countedCents, observations }),
    onSuccess: () => {
      toast('Caja cerrada con éxito')
      queryClient.invalidateQueries({ queryKey: ['cash'] })
      queryClient.invalidateQueries({ queryKey: ['cash-registers'] })
      navigate('/admin/caja')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo cerrar la caja.', 'error'),
  })

  if (isLoading) return <LoadingState />

  if (!data?.register || data.register.status !== 'abierta') {
    return (
      <div className="mx-auto max-w-md py-10">
        <EmptyState
          title="No hay caja abierta"
          description="Abrí la caja de hoy antes de hacer el cierre."
          action={<Button onClick={() => navigate('/admin/caja')}>Ir a Caja</Button>}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">Cierre de caja</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-gray-500">Apertura</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums">{formatMoney(data.register.opening_cents)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-gray-500">Ingresos de hoy</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums text-emerald-600">+{formatMoney(data.totals.in)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-gray-500">Egresos de hoy</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums text-red-600">−{formatMoney(data.totals.out)}</p>
        </Card>
      </div>

      <Card className="p-6">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Wallet className="h-4 w-4" /> Efectivo esperado
        </p>
        <p className="mt-2 font-display text-4xl font-semibold tabular-nums">{formatMoney(data.expected)}</p>
        <PayBreakdown
          openingCents={data.register.opening_cents}
          totalsIn={data.totals.in}
          totalsOut={data.totals.out}
          todayPayments={data.today.by_method}
          expectedCents={data.expected}
        />
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold">Arqueo físico</h2>
        <Input label="Efectivo contado en caja ($)" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="$ 0" autoFocus suffix={<BadgeCheck className="h-4 w-4" />} />
        {countedCents > 0 && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${difference === 0 ? 'bg-emerald-50 text-emerald-700' : difference > 0 ? 'bg-sky-50 text-sky-800' : 'bg-amber-50 text-amber-800'}`}>
            {difference === 0
              ? 'El conteo coincide con el esperado.'
              : difference > 0
                ? `Sobrante de ${formatMoney(difference)}.`
                : `Faltante de ${formatMoney(Math.abs(difference))}.`}
          </div>
        )}
        <Textarea label="Observaciones" value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Cualquier novedad del día…" rows={3} />
        <Button size="lg" className="w-full" onClick={() => closeCash.mutate()} loading={closeCash.isPending}>
          Confirmar cierre por {formatMoney(data.expected)} contados = {countedCents > 0 ? formatMoney(countedCents) : '—'}
        </Button>
      </Card>

      <p className="text-center text-xs text-gray-400">
        Apertura: {formatDateTime(data.register.opened_at)}
      </p>
    </div>
  )
}