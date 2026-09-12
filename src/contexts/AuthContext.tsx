import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'

export interface AdminUser {
  id: number
  email: string
  name: string
}

interface AuthContextValue {
  user: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => undefined,
  logout: async () => undefined,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get<AdminUser | null>('/api/auth/me')
      .then((data) => {
        if (active) setUser(data)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const onUnauthorized = () => {
      setUser(null)
      setLoading(false)
    }
    window.addEventListener('mencanta:unauthorized', onUnauthorized)
    return () => {
      active = false
      window.removeEventListener('mencanta:unauthorized', onUnauthorized)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const data = await api.post<AdminUser>('/api/auth/login', { email, password })
    setUser(data)
  }

  const logout = async () => {
    await api.post('/api/auth/logout')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}