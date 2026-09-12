# M' encanta — Tienda y gestión

E-commerce + panel de administración para **M' encanta**, blanquería y acero quirúrgico en Paraná, Entre Ríos. Todo el stack corre en Cloudflare: Hono en Workers, D1 (SQLite), R2 (imágenes) y el frontend de React/Vite servido por el mismo Worker.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + TanStack Query + React Router |
| Backend | Cloudflare Workers + Hono + Zod |
| Datos | Cloudflare D1 (SQLite) con migraciones versionadas |
| Archivos | Cloudflare R2 (imágenes de productos, categorías, banners) |
| PWA | `manifest.webmanifest` + Service Worker (`public/sw.js`) |

## Estructura

```
worker/            API (Hono) — rutas, lib, validadores, migraciones
  migrations/      0001_init.sql, 0002_seed.sql
  routes/          auth, public, products, categories, orders, sales,
                   inventory, cash, expenses, customers, settings, dashboard, uploads, seo
  lib/             auth (sessions PBKDF2), errors, db, dates (America/Argentina/Cordoba), r2, rate-limit
migrations/        D1 migrations del Worker
src/               Frontend React
  pages/shop/      Home, Products, ProductDetail, CartPage, Ofertas, Nosotros, Contacto
  pages/admin/     Login, Dashboard, NewSale, Sales, Orders, OrderDetail, ProductsAdmin,
                   ProductForm, Categories, Inventory, Cash, CashClose, Expenses, Customers, Settings
  components/ui/   Button, Input, Select, Textarea, Modal, Table, Badge, Card, Toggle, …
  lib/             api, money, whatsapp, utils
public/            manifest.webmanifest, sw.js, icon.svg
wrangler.toml      Config del Worker + D1 + R2 + assets
```

## Puesta en marcha local

Requisitos: Node 20+ y una cuenta de Cloudflare (para D1/R2 remotas y deploys).

```bash
npm install
cp .dev.vars.example .dev.vars   # credenciales del admin local (crear el archivo)
npm run db:migrate:local         # aplica migraciones a la D1 local
npm run dev                      # levanta Worker (wrangler) y frontend (vite) juntos
```

- Tienda: `http://localhost:5173` (Vite, con proxy a la API).
- API del Worker: `http://localhost:8787`.
- El admin se crea automáticamente al loguear por primera vez usando `ADMIN_EMAIL` / `ADMIN_PASSWORD` de `.dev.vars`. Sin esos valores, podés crearlo con `POST /api/auth/setup` usando `ADMIN_SETUP_KEY`.

## Comandos útiles

```bash
npm run dev            # Worker + frontend (concurrently)
npm run typecheck      # tsc app + worker
npm run build          # vite build + typecheck del worker
npm run db:migrate     # migraciones remotas (producción)
npm run db:migrate:local
npm run deploy         # build + wrangler deploy
```

## Deploy a Cloudflare

1. Crear los recursos:
   ```bash
   npx wrangler d1 create opa
   npx wrangler r2 bucket create opa-bucket
   ```
2. En `wrangler.toml` reemplazar `REEMPLAZAR_CON_DATABASE_ID` por el `database_id` que devuelve el paso anterior.
3. Configurar secretos:
   ```bash
   npx wrangler secret put ADMIN_SETUP_KEY
   npx wrangler secret put ADMIN_EMAIL
   npx wrangler secret put ADMIN_PASSWORD
   ```
   - `ADMIN_EMAIL`/`ADMIN_PASSWORD` crean el administrador inicial automáticamente en el primer login.
   - `ADMIN_SETUP_KEY` habilita `POST /api/auth/setup` (usar una vez o ninguna).
4. Aplicar migraciones remotas:
   ```bash
   npm run db:migrate
   ```
5. Desplegar:
   ```bash
   npm run deploy
   ```
6. (Opcional) Dominio custom: descomentar las `routes` en `wrangler.toml` y apuntar los DNS, o usar la pestaña "Custom Domains" del Worker.

## Configuración del negocio

Todo se edita desde **Configuración** en el panel (`/admin/configuracion`): datos del negocio, WhatsApp, contacto/ubicación, envíos, horarios, textos de la home e imagen hero. Los montos se guardan como enteros en centavos (`*_cents`).

## Convenciones

- Montos siempre en **centavos** en la API; la UI usa `formatMoney`/`parseAmountToCents` (`src/lib/money.ts`).
- Horarios en **Argentina** (`America/Argentina/Cordoba`); fechas a la API en ISO UTC.
- El front consume la API con `api.get/post/put/delete` (`src/lib/api.ts`), que desempaqueta `{ success, data }` y dispara `mencanta:unauthorized` en 401.
- Pedidos web no cobran online: guardan el pedido y abren un link de WhatsApp para confirmar la compra.