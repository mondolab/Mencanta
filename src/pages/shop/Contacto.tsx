import { useState } from 'react'
import { Mail, MessageCircle, MapPin, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useSettings } from '@/contexts/SettingsContext'
import { useToast } from '@/contexts/ToastContext'
import { contactarWhatsApp } from '@/lib/whatsapp'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function Contacto() {
  usePageTitle('Contacto — M\' encanta')

  const { settings, whatsappNumber } = useSettings()
  const { toast } = useToast()
  const { data } = useQuery({
    queryKey: ['settings-public'],
    queryFn: () => api.get<Record<string, unknown>>('/api/settings/public'),
  })

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const contact = (data?.contact as { email?: string; instagram?: string; map_url?: string } | undefined) ?? settings?.contact ?? {}
  const address = (data?.address as { street?: string; city?: string; notes?: string } | undefined) ?? settings?.address ?? {}
  const schedule = (data?.schedule as { title?: string; lines?: string[] } | undefined) ?? settings?.schedule ?? {}

  const openWhatsApp = () => {
    if (!name.trim()) {
      toast('Contanos tu nombre.', 'error')
      return
    }
    const text = [`Hola! Soy ${name}${phone ? ` (WhatsApp ${phone})` : ''}.`, subject ? `Motivo: ${subject}` : '', message || '']
      .filter(Boolean)
      .join('\n')
    const c = contactarWhatsApp(whatsappNumber, text)
    window.open(c, '_blank')
  }

  const mapEmbed = (contact.map_url ?? 'https://maps.google.com/?q=Paraná,+Entre+Ríos').replace(/\/$/, '') + '&output=embed'

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sand">Contacto</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Escribinos</h1>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <a
            href={contactarWhatsApp(whatsappNumber, 'Hola! Quiero hacer una consulta.')}
            target="_blank"
            rel="noreferrer"
            className="flex gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#1fb457]">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Chateá por WhatsApp</p>
              <p className="mt-0.5 text-sm text-gray-500">Respuesta rápida en horario de atención.</p>
            </div>
          </a>

          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft transition-transform hover:-translate-y-0.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-beige/60 text-ink">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">Escribinos un mail</p>
                <p className="mt-0.5 break-all text-sm text-gray-500">{contact.email}</p>
              </div>
            </a>
          )}

          <div className="flex gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-beige/60 text-ink">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Showroom</p>
              <p className="mt-0.5 text-sm text-gray-500">
                {address.street ? `${address.street}, ` : ''}
                {address.city || 'Paraná, Entre Ríos'}
              </p>
              {address.notes && <p className="mt-1 text-sm text-gray-500">{address.notes}</p>}
            </div>
          </div>

          {schedule.lines && schedule.lines.length > 0 && (
            <div className="flex gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-beige/60 text-ink">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{schedule.title || 'Horarios de atención'}</p>
                <ul className="mt-1 space-y-0.5 text-sm text-gray-500">
                  {schedule.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-3">
          <div className="rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8">
            <h2 className="mb-5 font-display text-xl font-semibold">Envianos un mensaje</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                openWhatsApp()
              }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <Input label="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" required />
              <Input label="Tu WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Código de área + número" />
              <div className="sm:col-span-2">
                <Input label="Motivo" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ej: Consulta por una sábana…" />
              </div>
              <div className="sm:col-span-2">
                <Textarea label="Mensaje" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escribinos lo que necesitás…" rows={5} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="whatsapp"><MessageCircle className="h-4 w-4" /> Enviar por WhatsApp</Button>
              </div>
            </form>
          </div>

          {contact.map_url && (
            <div className="overflow-hidden rounded-[2rem] border border-line shadow-soft">
              <iframe
                title="Mapa del showroom"
                src={mapEmbed}
                className="h-72 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}