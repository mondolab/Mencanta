import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { api, uploadImageFile } from '@/lib/api'
import type { Category } from '@/types'
import { slugify } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePageTitle } from '@/hooks/usePageTitle'

type CategoryRow = Category & { type: 'blanqueria' | 'acero' | 'otros' }

const TYPE_OPTIONS = [
  { value: 'blanqueria', label: 'Blanquería' },
  { value: 'acero', label: 'Acero quirúrgico' },
  { value: 'otros', label: 'Otros' },
]

export default function Categories() {
  usePageTitle('Categorías — M\' encanta Gestión')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<{ id?: number; name: string; slug: string; type: CategoryRow['type']; description: string; sort_order: string; active: boolean; image?: { url: string; key?: string | null } | null } | null>(null)
  const [toDelete, setToDelete] = useState<CategoryRow | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: () => api.get<CategoryRow[]>('/api/admin/categories'),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['categories-admin'] })
    queryClient.invalidateQueries({ queryKey: ['categories-public'] })
    queryClient.invalidateQueries({ queryKey: ['home'] })
  }

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown> & { id?: number }) =>
      payload.id != null
        ? api.put(`/api/admin/categories/${payload.id}`, payload)
        : api.post('/api/admin/categories', payload),
    onSuccess: () => { toast('Categoría guardada'); setForm(null); invalidate() },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo guardar.', 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/categories/${id}`),
    onSuccess: () => { toast('Categoría eliminada'); setToDelete(null); invalidate() },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo eliminar.', 'error'),
  })

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !form) return
    setUploading(true)
    try {
      const { url, key } = await uploadImageFile(file, 'categories')
      setForm((f) => (f ? { ...f, image: { url, key } } : f))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo subir la imagen.', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (isLoading) return <LoadingState />

  const submit = () => {
    if (!form) return
    save.mutate({
      id: form.id,
      name: form.name,
      slug: form.id ? (form.slug !== (data?.find((c) => c.id === form.id)?.slug ?? form.slug) ? form.slug : '') : form.slug || '',
      type: form.type,
      description: form.description,
      image_key: form.image?.key ?? null,
      image_url: form.image?.url ?? null,
      sort_order: Number(form.sort_order) || 0,
      active: form.active,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Categorías</h1>
          <p className="text-sm text-gray-500">Organizan el catálogo en la tienda.</p>
        </div>
        <Button onClick={() => setForm({ name: '', slug: '', type: 'blanqueria', description: '', sort_order: String((data ?? []).length), active: true, image: null })}>
          <Plus className="h-4 w-4" /> Nueva categoría
        </Button>
      </div>

      {!data || data.length === 0 ? (
        <EmptyState title="Sin categorías" description="Creá la primera para organizar tus productos." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id} className="group p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-beige/50">
                    {c.image_url || c.image_key ? (
                      <img src={c.image_url ?? ''} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-lg text-sand/60">{c.name.charAt(0)}</div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-gray-500">{TYPE_OPTIONS.find((t) => t.value === c.type)?.label}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => setForm({ id: c.id, name: c.name, slug: c.slug, type: c.type, description: c.description, sort_order: String(c.sort_order), active: c.active, image: c.image_url ? { url: c.image_url, key: c.image_key ?? null } : null })} className="rounded-full p-2 text-gray-500 hover:bg-beige/50 hover:text-ink" aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setToDelete(c)} className="rounded-full p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-gray-500">{c.description || 'Sin descripción.'}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-xs font-semibold ${c.active ? 'text-emerald-600' : 'text-gray-400'}`}>{c.active ? 'Visible' : 'Oculta'}</span>
                <span className="text-[11px] text-gray-400">/productos?categoria={c.slug}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? 'Editar categoría' : 'Nueva categoría'}
        footer={<Button onClick={submit} loading={save.isPending}>Guardar categoria</Button>}
      >
        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })} placeholder="Ropa de cama" />
              <Select label="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CategoryRow['type'] })}>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>
            <Textarea label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Breve descripción…" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Orden" type="number" min="0" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 text-sm font-medium">
                  <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Activa" />
                  Activa
                </label>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">Imagen</p>
              <div className="flex items-center gap-3">
                {form.image?.url && (
                  <img src={form.image.url} alt={form.name} className="h-16 w-16 rounded-2xl border border-line object-cover" />
                )}
                <label className="flex h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-4 text-xs font-semibold text-gray-500 hover:border-sand hover:bg-beige/30">
                  {uploading ? 'Subiendo…' : 'Subir imagen'}
                  <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
                </label>
                {form.image && (
                  <button onClick={() => setForm({ ...form, image: null })} className="text-xs font-semibold text-red-600 hover:underline">
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        loading={remove.isPending}
        title="Eliminar categoría"
        message={`¿Seguro que querés eliminar "${toDelete?.name}"? Los productos quedarán sin categoría.`}
      />
    </div>
  )
}