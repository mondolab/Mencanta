import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, Search, ShoppingBag, MessageCircle } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useSettings } from '@/contexts/SettingsContext'
import { contactarWhatsApp } from '@/lib/whatsapp'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { settings, whatsappNumber } = useSettings()
  const { count, openCart } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const name = settings?.business?.name || "M' encanta"

  const links = [
    { to: '/', label: 'Inicio' },
    { to: '/productos?tipo=blanqueria', label: 'Blanquería' },
    { to: '/productos?tipo=acero', label: 'Acero quirúrgico' },
    { to: '/ofertas', label: 'Ofertas' },
    { to: '/nosotros', label: 'Nosotros' },
    { to: '/contacto', label: 'Contacto' },
  ]

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setMenuOpen(false)
    navigate(query.trim() ? `/productos?q=${encodeURIComponent(query.trim())}` : '/productos')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-baseline gap-1.5" onClick={() => setMenuOpen(false)}>
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">{name}</span>
          <span className="hidden text-xs tracking-widest text-sand uppercase sm:inline">Blanquería</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Principal">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium text-ink/70 transition-colors hover:text-ink',
                  isActive && link.to !== '/' && 'text-ink',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <form onSubmit={submitSearch} className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos…"
              className="h-10 w-44 rounded-pill border border-line bg-white pl-9 pr-3 text-sm text-ink transition-all focus:w-56 focus:border-sand focus:outline-none focus:ring-2 focus:ring-sand/40 lg:w-52"
              aria-label="Buscar"
            />
          </form>

          <a
            href={contactarWhatsApp(whatsappNumber, name)}
            target="_blank"
            rel="noreferrer"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-[#25D366] transition-colors hover:bg-green-50 sm:flex"
            aria-label="WhatsApp"
          >
            <MessageCircle className="h-5 w-5" />
          </a>

          <button
            onClick={openCart}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-beige/60"
            aria-label={`Carrito (${count} artículos)`}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blush px-1 text-[11px] font-bold text-ink">
                {count}
              </span>
            )}
          </button>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-beige/60 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-bg animate-fadeIn lg:hidden">
          <form onSubmit={submitSearch} className="relative px-4 pb-3 pt-3">
            <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos…"
              className="h-10 w-full rounded-pill border border-line bg-white pl-9 pr-3 text-sm text-ink focus:border-sand focus:outline-none focus:ring-2 focus:ring-sand/40"
              aria-label="Buscar"
            />
          </form>
          <nav className="flex flex-col px-4 pb-5" aria-label="Menú móvil">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-ink/80 transition-colors hover:bg-beige/50"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={contactarWhatsApp(whatsappNumber, name)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-2 rounded-xl bg-[#25D366]/10 px-3 py-3 text-sm font-semibold text-[#1fb457]"
            >
              <MessageCircle className="h-5 w-5" />
              Consultar por WhatsApp
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}