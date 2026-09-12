import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { InventoryItem, StockMovement } from '@/types'
import { formatDateTime } from '@/lib/money'
import { useToast } from '@/contexts/ToastContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Table, Td, Th } from '@/components/ui/Table'
import { SearchInput } from '@/components/ui/SearchInput'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePageTitle } from '@/hooks/usePageTitle'

const MOVEMENT_TYPES: Record<string, { label: string; tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral' }> = {
  entrada: { label: 'Entrada', tone: 'success' },
  venta: { label: 'Venta', tone: 'info' },
  ajuste: { label: 'Ajuste', tone: 'warning' },
  perdida: { label: 'Pérdida', tone: 'danger' },
  devolucion: { label: 'Devolución', tone: 'neutral' },
}

export default function Inventory() {
  usePageTitle('Inventario — M\' encanta Gestión')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('todos')
  const [adjust, setAdjust] = useState<{ product: InventoryItem; variants?: Array<{ id: number; name: string; stock: number; active: boolean }> } | null>(null)
  const [movementType, setMovementType] = useState<'entrada' | 'ajuste' | 'perdida' | 'devolucion'>('entrada')
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [quantity, setQuantity] = useState('')
  const [variantId, setVariantId] = useState('')
  const [reference, setReference] = useState('')
  const [movFilter, setMovFilter] = useState('todos')

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', { q, status }],
    queryFn: () => api.get<InventoryItem[]>(`/api/admin/inventory?${new URLSearchParams({ q, status })}`),
  })

  const { data: movements } = useQuery({
    queryKey: ['stock-movements', movFilter],
    queryFn: () => api.get<StockMovement[]>(`/api/admin/inventory/movements?${new URLSearchParams({ type: movFilter })}`),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const saveAdjust = useMutation({
    mutationFn: () =>
      api.post('/api/admin/inventory/movements', {
        product_id: adjust!.product.id,
        variant_id: variantId ? Number(variantId) : null,
        type: movementType,
        quantity: Number(quantity) || 1,
        direction: movementType === 'ajuste' ? direction : undefined,
        reference,
      }),
    onSuccess: () => {
      toast('Stock actualizado')
      setAdjust(null)
      setQuantity('')
      setReference('')
      setVariantId('')
      invalidate()
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo actualizar el stock.', 'error'),
  })

  const openAdjust = async (p: InventoryItem) => {
    if ((p.variants_count ?? 0) > 0) {
      try {
        const variants = await api.get<Array<{ id: number; name: string; stock: number; active: boolean }>>(`/api/admin/inventory/variants/${p.id}`)
        setAdjust({ product: p, variants })
      } catch {
        setAdjust({ product: p })
      }
    } else {
      setAdjust({ product: p })
    }
    setMovementType('entrada')
    setDirection('in')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Inventario</h1>
        <p className="text-sm text-gray-500">Stock de todos los productos y movimientos registrados.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar por producto…" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44" aria-label="Estado de stock">
          <option value="todos">Todos</option>
          <option value="sin_stock">Sin stock</option>
          <option value="bajo">Stock bajo</option>
          <option value="normal">Normal</option>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isLoading ? (
            <LoadingState />
          ) : !data || data.length === 0 ? (
            <EmptyState title="Sin productos" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Producto</Th>
                  <Th>Categoría</Th>
                  <Th className="text-right">Stock</Th>
                  <Th>Estado</Th>
                  <Th>Último movimiento</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="border-t border-line/60 hover:bg-beige/20">
                    <Td>
                      <span className="font-medium">{p.name}</span>
                      {(p.variants_count ?? 0) > 0 && <span className="ml-1 text-xs text-gray-400">· {p.variants_count} var.</span>}
                    </Td>
                    <Td className="text-gray-600">{p.category_name ?? '—'}</Td>
                    <Td className="text-right font-semibold tabular-nums">{p.stock}</Td>
                    <Td>
                      <Badge tone={p.status === 'normal' ? 'success' : p.status === 'bajo' ? 'warning' : 'danger'}>
                        {p.status === 'normal' ? 'OK' : p.status === 'bajo' ? `Bajo · min ${p.min_stock}` : 'Sin stock'}
                      </Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-gray-500">{p.last_movement ? formatDateTime(p.last_movement) : '—'}</Td>
                    <Td>
                      <Button variant="outline" size="sm" onClick={() => openAdjust(p)}>Ajustar</Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <Card className="p-0 lg:col-span-1">
          <div className="flex items-center justify-between px-5 pt-4">
            <h2 className="font-display text-lg font-semibold">Movimientos</h2>
            <Select value={movFilter} onChange={(e) => setMovFilter(e.target.value)} className="!w-36" aria-label="Tipo de movimiento">
              <option value="todos">Todos</option>
              {Object.entries(MOVEMENT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </div>
          <div className="p-3">
            {!movements || movements.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-gray-500">Sin movimientos.</p>
            ) : (
              <ul className="max-h-[32rem] space-y-2 overflow-y-auto">
                {movements.slice(0, 60).map((m) => (
                  <li key={m.id} className="rounded-2xl border border-line px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium">{m.product_name}</span>
                      <Badge tone={MOVEMENT_TYPES[m.type]?.tone ?? 'neutral'}>
                        {MOVEMENT_TYPES[m.type]?.label ?? m.type} {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {m.reference || '—'} · {formatDateTime(m.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={adjust !== null}
        onClose={() => setAdjust(null)}
        title={`Ajustar stock: ${adjust?.product.name ?? ''}`}
        footer={<Button onClick={() => saveAdjust.mutate()} loading={saveAdjust.isPending}>Confirmar</Button>}
      >
        {adjust && (
          <div className="space-y-4">
            <Select label="Tipo de movimiento" value={movementType} onChange={(e) => setMovementType(e.target.value as typeof movementType)}>
              <option value="entrada">Entrada de mercadería (+)</option>
              <option value="devolucion">Devolución (+)</option>
              <option value="ajuste">Ajuste (+/-)</option>
              <option value="perdida">Pérdida (−)</option>
            </Select>
            {adjust.variants && adjust.variants.length > 0 && (
              <Select label="Variante" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                <option value="">Variante que corresponde al stock total</option>
                {adjust.variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.stock} u.)</option>
                ))}
              </Select>
            )}
            {movementType === 'ajuste' && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">Dirección</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setDirection('in')} className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold ${direction === 'in' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-line bg-white text-gray-600'}`}>
                    Sumar stock
                  </button>
                  <button onClick={() => setDirection('out')} className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold ${direction === 'out' ? 'border-red-400 bg-red-50 text-red-700' : 'border-line bg-white text-gray-600'}`}>
                    Descontar
                  </button>
                </div>
              </div>
            )}
            <Input label="Cantidad" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" />
            <Input label="Referencia (opcional)" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej: Compra proveedor" />
            <p className="text-xs text-gray-500">Cada movimiento queda registrado en el historial con fecha y stock resultante.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}