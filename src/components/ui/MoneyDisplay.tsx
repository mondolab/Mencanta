import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

export function MoneyDisplay({
  cents,
  className,
  muted,
  small,
}: {
  cents: number
  className?: string
  muted?: boolean
  small?: boolean
}) {
  return (
    <span className={cn('tabular-nums font-semibold', small ? 'text-sm' : 'text-base', muted && 'text-gray-500', className)}>
      {formatMoney(cents)}
    </span>
  )
}

export function MoneyWithCompare({
  cents,
  compareCents,
  className,
}: {
  cents: number
  compareCents?: number | null
  className?: string
}) {
  return (
    <span className={cn('flex flex-wrap items-baseline gap-2', className)}>
      <MoneyDisplay cents={cents} />
      {compareCents != null && compareCents > cents && (
        <span className="text-sm text-gray-400 line-through">{formatMoney(compareCents)}</span>
      )}
      {compareCents != null && compareCents > cents && (
        <span className="inline-block rounded-pill bg-blush/40 px-2 py-0.5 text-[11px] font-bold text-ink">
          {Math.round(((compareCents - cents) / compareCents) * 100)}% OFF
        </span>
      )}
    </span>
  )
}