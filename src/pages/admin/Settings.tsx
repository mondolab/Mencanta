import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Upload, Loader2 } from 'lucide-react'
import { api, uploadImageFile } from '@/lib/api'
import type { Settings } from '@/types'
import { parseAmountToCents } from '@/lib/money'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Toggle } from '@/components/ui/Toggle'
import { LoadingState } from '@/components/ui/LoadingState'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function SettingsPage() {
  usePageTitle('Configuración — M\' encanta Gestión')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Settings | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get<Settings>('/api/admin/settings'),
  })

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const save = useMutation({
    mutationFn: () => {
      if (!form) throw new Error('Sin datos.')
      return api.put('/api/admin/settings', { settings: form })
    },
    onSuccess: () => {
      toast('Configuración guardada')
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      queryClient.invalidateQueries({ queryKey: ['settings-public'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'No se pudo guardar.', 'error'),
  })

  const onUploadHero = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !form) return
    setUploading(true)
    try {
      const { url } = await uploadImageFile(file, 'banners')
      setForm({ ...form, hero_image: { url } })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo subir la imagen.', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (isLoading) return <LoadingState />
  if (!form) return <p className="text-sm text-gray-500">Sin configuración.</p>

  const patch = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm({ ...form, [key]: value })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Configuración</h1>
          <p className="text-sm text-gray-500">Estos datos se muestran en la tienda y en la gestión.</p>
        </div>
        <Button onClick={() => save.mutate()} loading={save.isPending}><Save className="h-4 w-4" /> Guardar todo</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Negocio</h2>
          <Input label="Nombre" value={form.business?.name ?? ''} onChange={(e) => patch('business', { ...form.business, name: e.target.value })} placeholder="M' encanta" />
          <Input label="Eslogan" value={form.business?.tagline ?? ''} onChange={(e) => patch('business', { ...form.business, tagline: e.target.value })} placeholder="Detalles que transforman tu hogar." />
          <Textarea label="Descripción" value={form.business?.description ?? ''} onChange={(e) => patch('business', { ...form.business, description: e.target.value })} rows={3} placeholder="Blanquería y acero quirúrgico…" />
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">WhatsApp</h2>
          <Input label="Número (internacional)" value={form.whatsapp?.number ?? ''} onChange={(e) => patch('whatsapp', { ...form.whatsapp, number: e.target.value })} placeholder="5493434056155" hint="Código de país + área + número, sin + ni espacios." />
          <Input label="Mostrar como" value={form.whatsapp?.display ?? ''} onChange={(e) => patch('whatsapp', { ...form.whatsapp, display: e.target.value })} placeholder="+54 9 3434 05-6155" />
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Comprobante</h2>
          <Input label="CUIT" value={form.invoice?.tax_id ?? ''} onChange={(e) => patch('invoice', { ...form.invoice, tax_id: e.target.value })} placeholder="20-12345678-9" hint="Se muestra en el comprobante de venta." />
          <Textarea label="Pie de comprobante" value={form.invoice?.footer ?? ''} onChange={(e) => patch('invoice', { ...form.invoice, footer: e.target.value })} rows={2} placeholder="Gracias por tu compra." />
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Contacto y ubicación</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email" value={form.contact?.email ?? ''} onChange={(e) => patch('contact', { ...form.contact, email: e.target.value })} placeholder="hola@mencanta.com.ar" />
            <Input label="Instagram (URL)" value={form.contact?.instagram ?? ''} onChange={(e) => patch('contact', { ...form.contact, instagram: e.target.value })} placeholder="https://instagram.com/…" />
          </div>
          <Input label="URL del mapa (Google Maps)" value={form.contact?.map_url ?? ''} onChange={(e) => patch('contact', { ...form.contact, map_url: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Calle" value={form.address?.street ?? ''} onChange={(e) => patch('address', { ...form.address, street: e.target.value })} placeholder="Calle 123" />
            <Input label="Ciudad" value={form.address?.city ?? ''} onChange={(e) => patch('address', { ...form.address, city: e.target.value })} placeholder="Paraná, Entre Ríos" />
          </div>
          <Textarea label="Notas del showroom" value={form.address?.notes ?? ''} onChange={(e) => patch('address', { ...form.address, notes: e.target.value })} rows={2} placeholder="Cómo llegar, solicitar visita…" />
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Envíos</h2>
          <Input label="Zonas" value={form.shipping?.zones ?? ''} onChange={(e) => patch('shipping', { ...form.shipping, zones: e.target.value })} placeholder="Paraná y alrededores" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Costo ($)" value={form.shipping?.cost_cents ? String(form.shipping.cost_cents / 100).replace('.', ',') : ''} onChange={(e) => patch('shipping', { ...form.shipping, cost_cents: parseAmountToCents(e.target.value) })} placeholder="$ 0" />
            <Input label="Envío gratis desde ($)" value={form.shipping?.min_order_free_cents ? String(form.shipping.min_order_free_cents / 100).replace('.', ',') : ''} onChange={(e) => patch('shipping', { ...form.shipping, min_order_free_cents: parseAmountToCents(e.target.value) })} placeholder="$ 0 = siempre pago" />
          </div>
          <Input label="Nota de costo" value={form.shipping?.cost_note ?? ''} onChange={(e) => patch('shipping', { ...form.shipping, cost_note: e.target.value })} placeholder="Consultá el costo según tu zona." />
          <Input label="Tiempo de entrega" value={form.shipping?.delivery_time ?? ''} onChange={(e) => patch('shipping', { ...form.shipping, delivery_time: e.target.value })} placeholder="1 a 3 días hábiles" />
          <label className="flex items-center gap-3 text-sm font-medium">
            <Toggle checked={form.shipping?.pickup ?? false} onChange={(v) => patch('shipping', { ...form.shipping, pickup: v })} label="Retiro en showroom" />
            Permitir retiro en el showroom
          </label>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Horarios</h2>
          <Input label="Título" value={form.schedule?.title ?? ''} onChange={(e) => patch('schedule', { ...form.schedule, title: e.target.value })} placeholder="Horarios de atención" />
          <Textarea
            label="Líneas (una por renglón)"
            value={(form.schedule?.lines ?? []).join('\n')}
            onChange={(e) => patch('schedule', { ...form.schedule, lines: e.target.value.split('\n') })}
            rows={3}
            placeholder={"Lunes a Viernes: 9 a 13 y 16 a 20 hs\nSábados: 9 a 13 hs"}
          />
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Textos de la home</h2>
          <Input label="Título hero" value={form.texts?.hero_title ?? ''} onChange={(e) => patch('texts', { ...form.texts, hero_title: e.target.value })} placeholder="M' encanta" />
          <Input label="Subtítulo hero" value={form.texts?.hero_subtitle ?? ''} onChange={(e) => patch('texts', { ...form.texts, hero_subtitle: e.target.value })} placeholder="Detalles que transforman tu hogar." />
          <Textarea label="Texto hero" value={form.texts?.hero_text ?? ''} onChange={(e) => patch('texts', { ...form.texts, hero_text: e.target.value })} rows={2} />
          <Input label="Título banner envíos" value={form.texts?.banner_title ?? ''} onChange={(e) => patch('texts', { ...form.texts, banner_title: e.target.value })} placeholder="Envíos a domicilio" />
          <Input label="Texto banner envíos" value={form.texts?.banner_text ?? ''} onChange={(e) => patch('texts', { ...form.texts, banner_text: e.target.value })} placeholder="Llevamos tus elegidos hasta tu casa." />
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Imagen hero</h2>
          <Input
            label="URL de la imagen"
            value={form.hero_image?.url ?? ''}
            onChange={(e) => patch('hero_image', { url: e.target.value })}
            placeholder="https://…"
            hint="Subí un archivo desde la computadora o pegá una URL directa."
          />
          {form.hero_image?.url && (
            <div className="flex items-center gap-3">
              <img src={form.hero_image.url} alt="Hero" className="h-28 w-24 rounded-2xl border border-line object-cover" />
              <label className="flex h-10 cursor-pointer items-center gap-1.5 rounded-pill border border-line bg-white px-3 text-xs font-semibold text-ink hover:border-sand hover:bg-beige/40">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {form.hero_image?.url ? 'Reemplazar' : 'Subir'}
                <input type="file" accept="image/*" className="hidden" onChange={onUploadHero} />
              </label>
              <button onClick={() => patch('hero_image', { url: null })} className="text-xs font-semibold text-red-600 hover:underline">
                Quitar
              </button>
            </div>
          )}
          {!form.hero_image?.url && (
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-line px-4 text-xs font-semibold text-gray-500 hover:border-sand hover:bg-beige/30">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Subiendo…' : 'Subir imagen'}
              <input type="file" accept="image/*" className="hidden" onChange={onUploadHero} />
            </label>
          )}
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} size="lg" loading={save.isPending}><Save className="h-4 w-4" /> Guardar cambios</Button>
      </div>
    </div>
  )
}