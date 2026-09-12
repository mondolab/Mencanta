import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  PlusCircle,
  Package,
  Tags,
  Boxes,
  Wallet,
  Receipt,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Store,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/admin/nueva-venta', label: 'Nueva venta', icon: PlusCircle, highlight: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: Package },
  { to: '/admin/productos', label: 'Productos', icon: Boxes },
  { to: '/admin/categorias', label: 'Categorías', icon: Tags },
  { to: '/admin/inventario', label: 'Inventario', icon: Boxes },
  { to: '/admin/caja', label: 'Caja', icon: Wallet },
  { to: '/admin/gastos', label: 'Gastos', icon: Receipt },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/configuracion', label: 'Configuración', icon: SettingsIcon },
]

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { logout, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const onLogout = async () => {
    try {
      await logout()
      navigate('/admin/login')
    } catch {
      toast('No se pudo cerrar sesión.', 'error')
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-line/70 px-5">
        <span className="font-display text-2xl font-semibold">M' encanta</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-sand">Gestión</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Panel">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : item.to === '/admin'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                item.highlight && 'bg-blush/40 text-ink hover:bg-blush/60',
                !item.highlight && isActive && 'bg-beige/70 text-ink',
                !item.highlight && !isActive && 'text-ink/70 hover:bg-beige/40 hover:text-ink',
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-line/70 p-3">
        {user && (
          <p className="px-3.5 pb-1 text-xs text-gray-500">
            {user.name} · {user.email}
          </p>
        )}
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Cerrar sesión
        </button>
        <Link
          to="/"
          className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:bg-beige/40 hover:text-ink"
        >
          <Store className="h-[18px] w-[18px]" />
          Ver tienda
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-lift animate-fadeIn">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-full px-2 py-1.5 font-display text-lg font-semibold"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
            M' encanta Gestión
          </button>
          <button
            onClick={onLogout}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink/60 hover:bg-beige/50"
            aria-label="Cerrar sesión"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}