import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import type { Settings } from '@/types'
import { DEFAULT_WHATSAPP } from '@/lib/whatsapp'

interface SettingsContextValue {
  settings: Settings | null
  loading: boolean
  whatsappNumber: string
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: null,
  loading: true,
  whatsappNumber: DEFAULT_WHATSAPP,
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get<Settings>('/api/settings/public')
      .then((data) => {
        if (active) setSettings(data)
      })
      .catch(() => {
        if (active) setSettings(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const whatsappNumber = settings?.whatsapp?.number || DEFAULT_WHATSAPP

  return (
    <SettingsContext.Provider value={{ settings, loading, whatsappNumber }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}