import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  hint?: string
  suffix?: ReactNode
  prefix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, suffix, prefix, className, id, ...props },
  ref,
) {
  const inputId = id ?? props.name
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-ink placeholder:text-gray-400',
            'transition-all focus:border-sand focus:outline-none focus:ring-2 focus:ring-sand/40',
            prefix ? 'pl-9' : undefined,
            suffix ? 'pr-11' : undefined,
            error && 'border-red-300 focus:border-red-300 focus:ring-red-200',
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500">{suffix}</span>
        )}
      </div>
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
})