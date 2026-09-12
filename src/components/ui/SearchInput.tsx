import { Search } from 'lucide-react'
import { Input } from './Input'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={className ?? 'w-full max-w-xs'}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        prefix={<Search className="h-4 w-4" />}
      />
    </div>
  )
}