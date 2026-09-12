import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Expense, PaymentMethod } from '@/types'
import { formatDate, parseAmountToCents } from '@/lib/money'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, PAYMENT_OPTIONS } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Select } from '@/components/ui/Select'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { Table, Td, Th } from '@/components/ui/Table'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePageTitle } from '@/hooks/usePageTitle'

interface ExpenseDraft {
  id?: number
  concept: string
  description: string
  amount: string
  payment_method: PaymentMethod
  category: string
  notes: string
  date: string
}

function blankDraft(): ExpenseDraft {
  return {
    concept: '',
    description: '',
    amount: '',
    payment_method: 'efectivo',
    category: 'otros',
    notes: '',
    date: new Date().toISOString().slice(0, 10),
  }
}

export default function Expenses() {
  usePageTitle('Gastos — M\' encanta Gestión')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState('todas')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [form, setForm] = useState<ExpenseDraft | null>(null)
  const [toDelete, setToDelete] = useState<Expense | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', { category: categoryFilter, from, to }],
    queryFn: () =>
      api.get<Expense[]>(`/api/admin/expenses?${new URLSearchParams({ category: categoryFilter, from, to }).toString()}`),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    queryClient.invalidateQueries({ queryKey: ['cash'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const save = useMutation({
    mutationFn: () => {
      if (!form) throw new Error('Datos incompletos.')
      const payload = {
        concept: form.concept,
        description: form.description,
        amount_cents: parseAmountToCents(form.amount),
        payment_method: form.payment_method,
        category: form.category,
        notes: form.notes,
        date: form.date || undefined,
      }
      return form.id != null
        ? api.put(`/api/admin/expenses/${form.id}`, payload)
        : api.post('/api/admin/expenses', payload)
    },
    onSuccess: () => { toast('Gasto guardado'); setForm(null); invalidate() },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo guardar.', 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/expenses/${id}`),
    onSuccess: () => { toast('Gasto eliminado'); setToDelete(null); invalidate() },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo eliminar.', 'error'),
  })

  const total = (data ?? []).reduce((acc, e) => acc + e.amount_cents, 0)

  if (isLoading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Gastos</h1>
          <p className="text-sm text-gray-500">{data?.length ?? 0} gastos · <MoneyDisplay cents={total} /></p>
        </div>
        <Button onClick={() => setForm(blankDraft())}><Plus className="h-4 w-4" /> Nuevo gasto</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-44" aria-label="Categoría">
          <option value="todas">Todas las categorías</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
          ))}
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Desde" className="w-40" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Hasta" className="w-40" />
        {(from || to || categoryFilter !== 'todas') && (
          <button onClick={() => { setFrom(''); setTo(''); setCategoryFilter('todas') }} className="text-xs font-semibold text-gray-500 hover:text-ink">
            Limpiar filtros
          </button>
        )}
      </div>

      {!data || data.length === 0 ? (
        <EmptyState title="Sin gastos en ese filtro" description="Registrá tus gastos para llevar el control del mes." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Concepto</Th>
              <Th>Categoría</Th>
              <Th>Medio</Th>
              <Th className="text-right">Importe</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((e) => (
              <tr key={e.id} className="border-t border-line/60 hover:bg-beige/20">
                <Td className="whitespace-nowrap text-gray-600">{formatDate(e.date)}</Td>
                <Td>
                  <p className="font-medium">{e.concept}</p>
                  {e.description && <p className="text-xs text-gray-500">{e.description}</p>}
                </Td>
                <Td>{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</Td>
                <Td>{PAYMENT_OPTIONS.find((o) => o.value === e.payment_method)?.label}</Td>
                <Td className="text-right text-red-600"><MoneyDisplay cents={e.amount_cents} small /></Td>
                <Td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setForm({
                        id: e.id,
                        concept: e.concept,
                        description: e.description,
                        amount: String(e.amount_cents / 100).replace('.', ','),
                        payment_method: e.payment_method,
                        category: e.category,
                        notes: e.notes,
                        date: e.date.slice(0, 10),
                      })}
                      className="rounded-full p-1.5 text-gray-500 hover:bg-beige/50 hover:text-ink"
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setToDelete(e)} className="rounded-full p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar">
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
        title={form?.id ? 'Editar gasto' : 'Nuevo gasto'}
        footer={<Button onClick={() => save.mutate()} loading={save.isPending}>Guardar</Button>}
      >
        {form && (
          <div className="space-y-4">
            <Input label="Concepto" value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} placeholder="Ej: Bolsas de papel" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Importe ($)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="$ 5.000" required />
              <Input label="Fecha" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
                ))}
              </Select>
              <Select label="Medio de pago" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value as PaymentMethod })}>
                {PAYMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
            <Input label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalle (opcional)" />
            {form.payment_method === 'efectivo' && (
              <p className="rounded-2xl bg-beige/50 px-4 py-3 text-xs text-gray-600">Se descuenta automáticamente de la caja de hoy.</p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        loading={remove.isPending}
        title="Eliminar gasto"
        message={`¿Seguro que querés eliminar el gasto "${toDelete?.concept}"?`}
      />
    </div>
  )
}