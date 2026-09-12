import { Badge } from './Badge'

export function StockBadge({ stock, min }: { stock: number; min?: number }) {
  if (stock <= 0) return <Badge tone="danger">Sin stock</Badge>
  if (min != null && min > 0 && stock < min) return <Badge tone="warning">Poco stock · {stock}</Badge>
  return <Badge tone="success">Disponible · {stock}</Badge>
}