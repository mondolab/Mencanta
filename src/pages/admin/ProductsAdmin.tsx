import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Star } from 'lucide-react'
import { api } from '@/lib/api'
import type { Product } from '@/types'
import { formatDateTime } from '@/lib/money'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Table, Td, Th } from '@/components/ui/Table'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/Modal'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function ProductsAdmin() {
  usePageTitle('Productos — M\' encanta Gestión')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('todos')
  const [toDelete, setToDelete] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['products-admin', { q, status }],
    queryFn: () => api.get<Product[]>(`/api/admin/products?${new URLSearchParams({ q, status })}`),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products-admin'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
  }

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/products/${id}`),
    onSuccess: () => { toast('Producto eliminado'); setToDelete(null); invalidate() },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo eliminar.', 'error'),
  })

  const handleDelete = () => {
    if (!toDelete) return
    setDeleting(true)
    remove.mutate(toDelete.id, { onSettled: () => setDeleting(false) })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Productos</h1>
          <p className="text-sm text-gray-500">{data?.length ?? 0} productos</p>
        </div>
        <Link to="/admin/productos/nuevo">
          <Button><Plus className="h-4 w-4" /> Nuevo producto</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar producto…" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44" aria-label="Estado">
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Sin productos" description="Creá tu primer producto para empezar a vender." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Producto</Th>
              <Th>Categoría</Th>
              <Th className="text-right">Precio</Th>
              <Th className="text-right">Stock</Th>
              <Th>Estado</Th>
              <Th>Actualizado</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} className="border-t border-line/60 hover:bg-beige/20">
                <Td>
                  <Link to={`/admin/productos/${p.id}/editar`} className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-beige/50">
                      {p.image?.url ? (
                        <img src={p.image.url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-display text-sand/60">{p.name.charAt(0)}</div>
                      )}
                    </div>
                    <span className="font-medium hover:underline">{p.name}</span>
                    {p.featured && <Star className="h-3.5 w-3.5 text-sand fill-sand" />}
                  </Link>
                </Td>
                <Td className="text-gray-600">{p.category_name ?? '—'}</Td>
                <Td className="text-right"><MoneyDisplay cents={p.price_cents} small /></Td>
                <Td className="text-right tabular-nums">{p.stock}</Td>
                <Td>{p.active ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}</Td>
                <Td className="whitespace-nowrap text-xs text-gray-500">{formatDateTime(p.created_at)}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <Link to={`/admin/productos/${p.id}/editar`} className="text-xs font-semibold text-sand hover:underline">Editar</Link>
                    <button onClick={() => setToDelete(p)} className="text-xs font-semibold text-red-600 hover:underline">Eliminar</button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar producto"
        message={`¿Seguro que querés eliminar "${toDelete?.name}"? Esta acción no se puede deshacer.`}
      />
    </div>
  )
}