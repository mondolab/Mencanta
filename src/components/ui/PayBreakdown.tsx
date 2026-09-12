import { formatMoney } from '@/lib/money'

export function PayBreakdown({
  openingCents,
  totalsIn,
  totalsOut,
  todayPayments,
  expectedCents,
}: {
  openingCents: number
  totalsIn: number
  totalsOut: number
  todayPayments: Record<string, number>
  expectedCents: number
}) {
  const cashSales = todayPayments['efectivo'] ?? 0
  const otherIn = totalsIn - cashSales
  const rows: Array<{ label: string; amount: number; tone?: 'in' | 'out' }> = []
  rows.push({ label: 'Apertura de caja', amount: openingCents })
  if (cashSales > 0) rows.push({ label: 'Ventas en efectivo', amount: cashSales, tone: 'in' })
  if (otherIn > 0) rows.push({ label: 'Otros ingresos', amount: otherIn, tone: 'in' })
  if (totalsOut > 0) rows.push({ label: 'Retiros y gastos', amount: -totalsOut, tone: 'out' })

  return (
    <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between text-gray-600">
          <dt>{r.label}</dt>
          <dd className={`tabular-nums font-medium ${r.tone === 'in' ? 'text-emerald-600' : r.tone === 'out' ? 'text-red-600' : ''}`}>
            {r.amount >= 0 ? '+' : '−'}{formatMoney(Math.abs(r.amount))}
          </dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between pt-2">
        <dt className="font-semibold text-ink">Efectivo esperado</dt>
        <dd className="font-display text-lg font-semibold tabular-nums">{formatMoney(expectedCents)}</dd>
      </div>
    </dl>
  )
}