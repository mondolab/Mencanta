import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'

export function StatCard({
  label,
  value,
  icon,
  sub,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'pink' | 'warn' | 'ok'
}) {
  const tones = {
    default: 'bg-beige/50 text-ink',
    pink: 'bg-blush/40 text-ink',
    warn: 'bg-amber-100 text-amber-900',
    ok: 'bg-emerald-100 text-emerald-900',
  }
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
        </div>
        {icon && (
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', tones[tone])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}