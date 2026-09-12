import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { AppEnv } from './types'
import { AppError } from './lib/errors'
import publicApi from './routes/public'
import authRoutes, { requireAuth } from './routes/auth'
import categoriesRoutes from './routes/categories'
import productsRoutes from './routes/products'
import uploadsRoutes from './routes/uploads'
import ordersRoutes from './routes/orders'
import salesRoutes from './routes/sales'
import inventoryRoutes from './routes/inventory'
import cashRoutes from './routes/cash'
import expensesRoutes from './routes/expenses'
import customersRoutes from './routes/customers'
import settingsRoutes from './routes/settings'
import dashboardRoutes from './routes/dashboard'
import seoRoutes from './routes/seo'
import { getFileUrl } from './lib/r2'

const app = new Hono<AppEnv>()

// ---------------------------------------------------------------
// Headers de seguridad
// ---------------------------------------------------------------
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.header(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.whatsapp.com https://wa.me",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  )
  await next()
})

// ---------------------------------------------------------------
// Manejo de errores consistente
// ---------------------------------------------------------------
app.onError((err, c) => {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = { success: false, message: err.message, code: err.code }
    if (err.details) body.errors = err.details
    return c.json(body, err.status as ContentfulStatusCode)
  }
  console.error('[mencanta:error]', err)
  return c.json(
    { success: false, message: 'Error interno del servidor.', code: 'INTERNAL' },
    500,
  )
})

// ---------------------------------------------------------------
// API pública
// ---------------------------------------------------------------
app.route('/api', publicApi)
app.route('/api/auth', authRoutes)

// ---------------------------------------------------------------
// API administrativa (protegida)
// ---------------------------------------------------------------
const admin = new Hono<AppEnv>()
admin.use('*', requireAuth)
admin.route('/categories', categoriesRoutes)
admin.route('/products', productsRoutes)
admin.route('/uploads', uploadsRoutes)
admin.route('/orders', ordersRoutes)
admin.route('/sales', salesRoutes)
admin.route('/inventory', inventoryRoutes)
admin.route('/cash', cashRoutes)
admin.route('/expenses', expensesRoutes)
admin.route('/customers', customersRoutes)
admin.route('/settings', settingsRoutes)
admin.route('/dashboard', dashboardRoutes)
app.route('/api/admin', admin)

// ---------------------------------------------------------------
// SEO estático
// ---------------------------------------------------------------
app.route('/', seoRoutes)

// ---------------------------------------------------------------
// Archivos de R2 (imágenes subidas)
// ---------------------------------------------------------------
app.get('/files/*', async (c: Context<AppEnv>) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/files\//, ''))
  if (!key) return c.json({ success: false, message: 'Falta la clave del archivo.', code: 'BAD_REQUEST' }, 400)
  return getFileUrl(c.env, key)
})

// ---------------------------------------------------------------
// Frontend estático (Síntesis PWA / SPA)
// ---------------------------------------------------------------
app.all('*', async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ success: false, message: 'No existe el recurso.', code: 'NOT_FOUND' }, 404)
  }
  return (await c.env.ASSETS.fetch(c.req.raw)) as Response
})

export default { fetch: app.fetch } satisfies ExportedHandler<AppEnv>