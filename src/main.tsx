import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { CartProvider } from '@/contexts/CartContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { LoadingState } from '@/components/ui/LoadingState'
import { Navbar } from '@/components/shop/Navbar'
import { Footer } from '@/components/shop/Footer'
import { CartDrawer } from '@/components/shop/CartDrawer'
import { WhatsAppFloat } from '@/components/shop/WhatsAppFloat'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { useAuth } from '@/contexts/AuthContext'
import '@/index.css'

const Home = lazy(() => import('@/pages/shop/Home'))
const Products = lazy(() => import('@/pages/shop/Products'))
const ProductDetail = lazy(() => import('@/pages/shop/ProductDetail'))
const CartPage = lazy(() => import('@/pages/shop/CartPage'))
const Ofertas = lazy(() => import('@/pages/shop/Ofertas'))
const Nosotros = lazy(() => import('@/pages/shop/Nosotros'))
const Contacto = lazy(() => import('@/pages/shop/Contacto'))

const Login = lazy(() => import('@/pages/admin/Login'))
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'))
const NewSale = lazy(() => import('@/pages/admin/NewSale'))
const Sales = lazy(() => import('@/pages/admin/Sales'))
const Orders = lazy(() => import('@/pages/admin/Orders'))
const OrderDetail = lazy(() => import('@/pages/admin/OrderDetail'))
const ProductsAdmin = lazy(() => import('@/pages/admin/ProductsAdmin'))
const ProductForm = lazy(() => import('@/pages/admin/ProductForm'))
const Categories = lazy(() => import('@/pages/admin/Categories'))
const Inventory = lazy(() => import('@/pages/admin/Inventory'))
const Cash = lazy(() => import('@/pages/admin/Cash'))
const CashClose = lazy(() => import('@/pages/admin/CashClose'))
const Expenses = lazy(() => import('@/pages/admin/Expenses'))
const Customers = lazy(() => import('@/pages/admin/Customers'))
const SettingsPage = lazy(() => import('@/pages/admin/Settings'))
const SaleInvoice = lazy(() => import('@/pages/admin/SaleInvoice'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function Loading() {
  return <LoadingState />
}

function ShopLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppFloat />
    </div>
  )
}

function RequireAdmin() {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/admin/login" replace />
  return <Outlet />
}

const router = createBrowserRouter([
  {
    element: <ShopLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/productos', element: <Products /> },
      { path: '/producto/:slug', element: <ProductDetail /> },
      { path: '/ofertas', element: <Ofertas /> },
      { path: '/nosotros', element: <Nosotros /> },
      { path: '/contacto', element: <Contacto /> },
      { path: '/carrito', element: <CartPage /> },
    ],
  },
  {
    path: '/admin/login',
    element: <Login />,
  },
  {
    element: <RequireAdmin />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'ventas', element: <Sales /> },
          { path: 'nueva-venta', element: <NewSale /> },
          { path: 'pedidos', element: <Orders /> },
          { path: 'pedidos/:id', element: <OrderDetail /> },
          { path: 'productos', element: <ProductsAdmin /> },
          { path: 'productos/nuevo', element: <ProductForm /> },
          { path: 'productos/:id/editar', element: <ProductForm /> },
          { path: 'categorias', element: <Categories /> },
          { path: 'inventario', element: <Inventory /> },
          { path: 'caja', element: <Cash /> },
          { path: 'caja/cierre', element: <CashClose /> },
          { path: 'gastos', element: <Expenses /> },
          { path: 'clientes', element: <Customers /> },
          { path: 'configuracion', element: <SettingsPage /> },
        ],
      },
      { path: '/admin/ventas/:id/factura', element: <SaleInvoice /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </SettingsProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)

// PWA: service worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}