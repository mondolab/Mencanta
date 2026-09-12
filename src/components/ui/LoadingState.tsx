import { Loader2 } from 'lucide-react'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={`h-5 w-5 animate-spin ${className ?? ''}`} aria-hidden />
}

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
      <Spinner className="h-7 w-7 text-sand" />
      <p className="text-sm">{label}</p>
    </div>
  )
}