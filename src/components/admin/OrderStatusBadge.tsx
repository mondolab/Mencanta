import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils'

export function OrderStatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[11px] font-semibold ${ORDER_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}>
    {ORDER_STATUS_LABELS[status] ?? status}
  </span>
}