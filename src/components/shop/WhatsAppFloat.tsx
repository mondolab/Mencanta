import { MessageCircle } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { contactarWhatsApp } from '@/lib/whatsapp'

export function WhatsAppFloat() {
  const { settings, whatsappNumber } = useSettings()
  const name = settings?.business?.name || "M' encanta"

  return (
    <a
      href={contactarWhatsApp(whatsappNumber, name)}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lift transition-transform hover:scale-105"
      aria-label="Consultar por WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  )
}