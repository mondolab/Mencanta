import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, MessageCircle } from 'lucide-react'
import { api } from '@/lib/api'
import type { Customer } from '@/types'
import { buildWaLink } from '@/lib/whatsapp'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { Table, Td, Th } from '@/components/ui/Table'
import { SearchInput } from '@/components/ui/SearchInput'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePageTitle } from '@/hooks/usePageTitle'

interface Draft {
  id?: number
  name: string
  phone: string
  email: string
  address: string
  city: string
  notes: string
}

function blank(): Draft {
  return { name: '', phone: '', email: '', address: '', city: '', notes: '' }
}

export default function Customers() {
  usePageTitle('Clientes — M\' encanta Gestión')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [form, setForm] = useState<Draft | null>(null)
  const [toDelete, setToDelete] = useState<Customer | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', q],
    queryFn: () => api.get<Customer[]>(`/api/admin/customers?${new URLSearchParams({ q })}`),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customers'] })

  const save = useMutation({
    mutationFn: () => {
      if (!form) throw new Error('Datos incompletos.')
      return form.id != null
        ? api.put(`/api/admin/customers/${form.id}`, form)
        : api.post('/api/admin/customers', form)
    },
    onSuccess: () => { toast('Cliente guardado'); setForm(null); invalidate() },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo guardar.', 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/customers/${id}`),
    onSuccess: () => { toast('Cliente eliminado'); setToDelete(null); invalidate() },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo eliminar.', 'error'),
  })

  if (isLoading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-gray-500">{data?.length ?? 0} clientes registrados</p>
        </div>
        <Button onClick={() => setForm(blank())}><Plus className="h-4 w-4" /> Nuevo cliente</Button>
      </div>

      <SearchInput value={q} onChange={setQ} placeholder="Buscar por nombre, teléfono, email, ciudad…" className="max-w-sm" />

      {!data || data.length === 0 ? (
        <EmptyState title="Sin clientes" description="Se guardan automáticamente al registrar ventas." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Contacto</Th>
              <Th>Ciudad</Th>
              <Th className="text-right">Compras</Th>
              <Th className="text-right">Pedidos</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className="border-t border-line/60 hover:bg-beige/20">
                <Td className="font-medium">{c.name}</Td>
                <Td>
                  <p className="tabular-nums">{c.phone || '—'}</p>
                  {c.email && <p className="text-xs text-gray-500">{c.email}</p>}
                </Td>
                <Td>{c.city || '—'}</Td>
                <Td className="text-right tabular-nums">{c.sales_count ?? 0}</Td>
                <Td className="text-right tabular-nums">{c.orders_count ?? 0}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    {c.phone && (
                      <a href={buildWaLink(c.phone, `Hola ${c.name}, te contactamos desde M' encanta.`)} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]/15 text-[#1fb457] hover:bg-[#25D366]/30" aria-label="WhatsApp">
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                    <button onClick={() => setForm({ id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address, city: c.city, notes: c.notes })} className="rounded-full p-1.5 text-gray-500 hover:bg-beige/50 hover:text-ink" aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setToDelete(c)} className="rounded-full p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? 'Editar cliente' : 'Nuevo cliente'}
        footer={<Button onClick={() => save.mutate()} loading={save.isPending}>Guardar</Button>}
      >
        {form && (
          <div className="space-y-4">
            <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Código de área + número" />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="mail@ejemplo.com" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Dirección" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <Input label="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Paraná" />
            </div>
            <Input label="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        loading={remove.isPending}
        title="Eliminar cliente"
        message={`¿Seguro que querés eliminar a "${toDelete?.name}"? Sus ventas quedan sin cliente asociado.`}
      />
    </div>
  )
}