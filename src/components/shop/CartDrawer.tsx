import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { useCart } from '@/contexts/CartContext'
import { EmptyState } from '@/components/ui/EmptyState'

export function CartDrawer() {
  const { items, open, closeCart, setQuantity, remove, subtotalCents } = useCart()
  const navigate = useNavigate()

  return (
    <Drawer open={open} onClose={closeCart} title="Tu carrito">
      {items.length === 0 ? (
        <div className="px-5 py-10">
          <EmptyState
            title="Tu carrito está vacío"
            description="Explorá la colección y agregá productos para armar tu pedido."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  closeCart()
                  navigate('/productos')
                }}
              >
                Ver catálogo
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="flex-1 divide-y divide-line px-5">
            {items.map((item) => {
              const lineKey = `${item.product_id}:${item.variant_id ?? ''}`
              return (
                <li key={lineKey} className="flex gap-3 py-4">
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-beige/40">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-xl text-sand/60">
                        {item.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                    {item.variant_name && <p className="text-xs text-gray-500">{item.variant_name}</p>}
                    <MoneyDisplay cents={item.price_cents} className="text-sm" />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => setQuantity(item.product_id, item.variant_id, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-beige/50"
                        aria-label="Restar cantidad"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => setQuantity(item.product_id, item.variant_id, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-beige/50"
                        aria-label="Sumar cantidad"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => remove(item.product_id, item.variant_id)}
                        className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Quitar del carrito"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-line bg-white px-5 py-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-gray-600">Subtotal</span>
              <MoneyDisplay cents={subtotalCents} className="font-display text-lg" />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                closeCart()
                navigate('/carrito')
              }}
            >
              <ShoppingBag className="h-4 w-4" />
              Continuar pedido
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  )
}