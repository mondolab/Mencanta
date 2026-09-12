import type { ReactNode } from 'react'
import { PackageOpen } from 'lucide-react'

export function EmptyState({
  title = 'Sin datos todavía',
  description,
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line bg-white/60 px-6 py-14 text-center">
      <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-beige/60 text-sand">
        <PackageOpen className="h-7 w-7" />
      </div>
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}