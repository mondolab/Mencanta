import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function Login() {
  usePageTitle('Ingresar — M\' encanta Gestión')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, loading, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/admin', { replace: true })
  }, [user, navigate])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/admin', { replace: true })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo iniciar sesión.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-beige/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-5xl font-semibold text-ink">M' encanta</span>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-sand">Gestión</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-line bg-white p-7 shadow-lift animate-fadeUp">
          <h1 className="font-display text-xl font-semibold">Iniciar sesión</h1>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hola@mencanta.com.ar"
            required
            autoComplete="email"
            prefix={<Mail className="h-4 w-4" />}
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            prefix={<Lock className="h-4 w-4" />}
          />
          <Button type="submit" className="w-full" size="lg" loading={submitting || loading}>
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  )
}