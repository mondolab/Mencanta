import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { contactarWhatsApp } from '@/lib/whatsapp'

export function Footer() {
  const { settings, whatsappNumber } = useSettings()
  const name = settings?.business?.name || "M' encanta"
  const year = new Date().getFullYear()
  const contact = settings?.contact
  const address = settings?.address
  const schedule = settings?.schedule

  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl font-semibold text-ink">{name}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-600">
            Blanco para el hogar y acero quirúrgico. Detalles que transforman tu hogar.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-sand">Visitá nuestro showroom</h4>
          <p className="text-sm leading-relaxed text-gray-600">{address?.city || 'Paraná, Entre Ríos'}</p>
          {address?.notes && <p className="mt-1 text-sm text-gray-500">{address.notes}</p>}
        </div>

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-sand">Horarios</h4>
          {schedule?.lines?.map((line, i) => (
            <p key={i} className="text-sm text-gray-600">
              {line}
            </p>
          ))}
          {contact?.instagram && (
            <a
              href={contact.instagram}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-medium text-ink underline decoration-sand underline-offset-4 hover:text-black"
            >
              Instagram
            </a>
          )}
        </div>

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-sand">Contacto</h4>
          <a
            href={contactarWhatsApp(whatsappNumber, name)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-pill bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1fb457]"
          >
            <MessageCircle className="h-4 w-4" />
            Escribinos por WhatsApp
          </a>
          {contact?.email && <p className="mt-3 text-sm text-gray-600">{contact.email}</p>}
        </div>
      </div>

      <div className="border-t border-line py-5 text-center">
        <p className="text-xs text-gray-400">
          © {year} {name} · Blanquería y acero quirúrgico · Paraná, Entre Ríos, Argentina
        </p>
        <p className="mt-1 text-xs text-gray-300">
          <Link to="/admin" className="hover:text-gray-400">Acceso</Link>
        </p>
      </div>
    </footer>
  )
}