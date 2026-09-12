import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Truck, Store, MessageCircle } from 'lucide-react'
import { api } from '@/lib/api'
import type { Category, Product } from '@/types'
import { useSettings } from '@/contexts/SettingsContext'
import { contactarWhatsApp } from '@/lib/whatsapp'
import { CategoryCard } from '@/components/shop/CategoryCard'
import { ProductGrid } from '@/components/shop/ProductGrid'
import { LoadingState } from '@/components/ui/LoadingState'
import { Button } from '@/components/ui/Button'

interface HomeData {
  settings: Record<string, unknown>
  whatsapp: string
  categories: Category[]
  featured: Product[]
}

export default function Home() {
  const { whatsappNumber } = useSettings()
  const { data, isLoading } = useQuery({
    queryKey: ['home'],
    queryFn: () => api.get<HomeData>('/api/home'),
  })

  const business = (data?.settings?.business as { name?: string; tagline?: string; description?: string } | undefined) ?? {}
  const texts = (data?.settings?.texts as { hero_title?: string; hero_subtitle?: string; hero_text?: string; banner_title?: string; banner_text?: string } | undefined) ?? {}
  const heroImage = (data?.settings?.hero_image as { url?: string | null } | undefined)?.url
  const shipping = (data?.settings?.shipping as { zones?: string; cost_note?: string; delivery_time?: string } | undefined) ?? {}

  if (isLoading) return <LoadingState />

  const title = texts.hero_title || business.tagline || "M' encanta"
  const subtitle = texts.hero_subtitle || texts.hero_text || business.tagline || "Bienvenido a M' encanta"

  return (
    <div className="animate-fadeIn">
      {/* HERO */}
      <section className="relative overflow-hidden bg-beige/50">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="animate-fadeUp">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-sand">{business.name || "M' encanta"}</p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl lg:text-6xl">
              Detalles que transforman <span className="text-sand italic">tu hogar.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-gray-600">
              {subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/productos">
                <Button size="lg">Ver colección <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <a href={contactarWhatsApp(whatsappNumber, business.name)} target="_blank" rel="noreferrer">
                <Button size="lg" variant="whatsapp">
                  <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
                </Button>
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-lg animate-fadeUp">
            {heroImage ? (
              <img
                src={heroImage}
                alt={title}
                className="aspect-[4/5] w-full rounded-[2.5rem] object-cover shadow-lift"
                fetchPriority="high"
              />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center rounded-[2.5rem] bg-blush/30 font-display text-7xl text-sand/60">
                M' encanta
              </div>
            )}
            <div className="absolute -bottom-4 left-6 hidden rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-soft sm:block">
              Paraná · Entre Ríos
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      {data && data.categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-semibold">Nuestras categorías</h2>
              <p className="mt-2 text-sm text-gray-500">Lino, algodón, texturas nobles y acero quirúrgico.</p>
            </div>
            <Link to="/productos" className="hidden items-center gap-1 text-sm font-semibold text-ink hover:underline sm:flex">
              Ver todo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {data.categories.slice(0, 12).map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>
      )}

      {/* DESTACADOS */}
      {data && data.featured.length > 0 && (
        <section className="bg-white py-14 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="font-display text-3xl font-semibold">Destacados</h2>
                <p className="mt-2 text-sm text-gray-500">Una selección pensada para tu hogar.</p>
              </div>
              <Link to="/productos" className="hidden items-center gap-1 text-sm font-semibold text-ink hover:underline sm:flex">
                Ver catálogo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ProductGrid products={data.featured} />
            <div className="mt-8 text-center sm:hidden">
              <Link to="/productos">
                <Button variant="outline">Ver catálogo completo</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* BANNER ENVÍOS + SHOWROOM */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col justify-between rounded-[2.5rem] border border-line bg-white p-8 shadow-soft sm:p-10">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-beige/60 text-ink">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-semibold">{texts.banner_title || 'Envíos a domicilio'}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">
                {texts.banner_text || 'Llevamos tus elegidos hasta tu casa.'}
              </p>
              {(shipping.zones || shipping.delivery_time) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {shipping.delivery_time && (
                    <span className="rounded-pill bg-beige/50 px-3 py-1.5 text-xs font-semibold text-ink">{shipping.delivery_time}</span>
                  )}
                  {shipping.zones && (
                    <span className="rounded-pill bg-beige/50 px-3 py-1.5 text-xs font-semibold text-ink">{shipping.zones}</span>
                  )}
                </div>
              )}
            </div>
            <Link to="/nosotros" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-ink hover:underline">
              Ver condiciones de envío <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex flex-col justify-between rounded-[2.5rem] bg-ink p-8 text-white shadow-lift sm:p-10">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Store className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-semibold">Nuestro showroom</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
                Visitá nuestro showroom en Paraná, Entre Ríos. Conocé los productos en persona y asesoramiento personalizado.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/nosotros"
                className="inline-flex h-11 items-center justify-center rounded-pill bg-white px-6 text-sm font-semibold text-ink transition-colors hover:bg-beige"
              >
                Conocer más
              </Link>
              <a
                href={contactarWhatsApp(whatsappNumber, business.name)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-[#25D366] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1fb457]"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}