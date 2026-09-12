import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Truck, Clock, MapPin, MessageCircle, Store } from 'lucide-react'
import { api } from '@/lib/api'
import { useSettings } from '@/contexts/SettingsContext'
import { contactarWhatsApp } from '@/lib/whatsapp'
import { SmartText } from '@/components/shop/SmartText'
import { Button } from '@/components/ui/Button'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function Nosotros() {
  usePageTitle('Nosotros — M\' encanta')

  const { settings, whatsappNumber } = useSettings()
  const { data } = useQuery({
    queryKey: ['settings-public'],
    queryFn: () => api.get<Record<string, unknown>>('/api/settings/public'),
  })

  const business = (data?.business as { name?: string; tagline?: string; description?: string } | undefined) ?? settings?.business ?? {}
  const contact = (data?.contact as { email?: string; instagram?: string; map_url?: string } | undefined) ?? settings?.contact ?? {}
  const address = (data?.address as { street?: string; city?: string; notes?: string } | undefined) ?? settings?.address ?? {}
  const shipping = (data?.shipping as { zones?: string; cost_note?: string; delivery_time?: string; pickup?: boolean } | undefined) ?? settings?.shipping ?? {}
  const schedule = (data?.schedule as { title?: string; lines?: string[] } | undefined) ?? settings?.schedule ?? {}

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sand">Nosotros</p>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{business.name || "M' encanta"}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
          {business.description || 'Blanquería para el hogar y accesorios de acero quirúrgico.'}
        </p>
        {business.tagline && <p className="mt-2 font-display text-lg italic text-sand">{business.tagline}</p>}
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2.5rem] border border-line bg-white p-8 shadow-soft sm:p-10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-beige/60">
            <MapPin className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-semibold">Nuestro showroom</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {address.notes || 'Showroom físico en Paraná, Entre Ríos. Consultanos por WhatsApp para coordinar tu visita.'}
          </p>
          <address className="mt-5 space-y-1 not-italic text-sm text-gray-700">
            {address.street && <p>{address.street}</p>}
            {address.city && <p>{address.city}</p>}
            {contact.email && <p className="pt-1 text-gray-500">{contact.email}</p>}
          </address>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={contactarWhatsApp(whatsappNumber, 'Consulta por el showroom')} target="_blank" rel="noreferrer">
              <Button variant="whatsapp"><MessageCircle className="h-4 w-4" /> Coordinar visita</Button>
            </a>
            <Link to="/productos">
              <Button variant="outline">Ver catálogo</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-line bg-white p-8 shadow-soft sm:p-10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-beige/60">
            <Truck className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-semibold">Envíos y entregas</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {shipping.delivery_time ? `Tiempo estimado de entrega: ${shipping.delivery_time}.` : 'Enviamos a domicilio y coordinamos cada entrega por WhatsApp.'}
          </p>
          {shipping.zones && (
            <p className="mt-3 flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="h-4 w-4 text-sand" /> {shipping.zones}
            </p>
          )}
          {shipping.cost_note && (
            <p className="mt-2 flex items-center gap-2 text-sm text-gray-700">
              <Store className="h-4 w-4 text-sand" /> {shipping.cost_note}
            </p>
          )}
          {shipping.pickup && (
            <p className="mt-2 flex items-center gap-2 text-sm text-gray-700">
              <Clock className="h-4 w-4 text-sand" /> También podés retirar en el showroom.
            </p>
          )}
          {schedule.lines && schedule.lines.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{schedule.title || 'Horario'}</h3>
              <ul className="space-y-1.5">
                {schedule.lines.map((l) => (
                  <li key={l} className="flex items-start gap-2 text-sm text-gray-600">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-sand" /> {l}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6">
            <a href={contactarWhatsApp(whatsappNumber, 'Consulta por envíos')} target="_blank" rel="noreferrer" className="inline-flex">
              <Button variant="whatsapp"><MessageCircle className="h-4 w-4" /> Consultar por envíos</Button>
            </a>
          </div>
        </div>
      </section>

      {shipping.zones && (
        <section className="mt-6 rounded-[2.5rem] bg-ink p-8 text-white shadow-lift sm:p-10">
          <h2 className="font-display text-xl font-semibold">Zonas de cobertura</h2>
          <div className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
            <SmartText text={`${shipping.zones}. ${shipping.cost_note ?? ''} ${shipping.delivery_time ? `Entrega estimada: ${shipping.delivery_time}.` : ''}`} />
          </div>
        </section>
      )}
    </div>
  )
}