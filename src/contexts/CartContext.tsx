import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface CartItem {
  product_id: number
  variant_id?: number | null
  name: string
  variant_name: string
  slug: string
  image: string | null
  price_cents: number
  quantity: number
  max_stock: number
}

interface CartContextValue {
  items: CartItem[]
  count: number
  subtotalCents: number
  open: boolean
  openCart: () => void
  closeCart: () => void
  add: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  remove: (productId: number, variantId?: number | null) => void
  setQuantity: (productId: number, variantId: number | null | undefined, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue>({
  items: [],
  count: 0,
  subtotalCents: 0,
  open: false,
  openCart: () => undefined,
  closeCart: () => undefined,
  add: () => undefined,
  remove: () => undefined,
  setQuantity: () => undefined,
  clear: () => undefined,
})

const STORAGE_KEY = 'mencanta_cart_v2'

function keyFor(item: { product_id: number; variant_id?: number | null }) {
  return `${item.product_id}:${item.variant_id ?? ''}`
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // almacenamiento no disponible
    }
  }, [items])

  const add = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    setItems((prev) => {
      const qty = Math.max(1, item.quantity ?? 1)
      const k = keyFor(item)
      const existing = prev.find((i) => keyFor(i) === k)
      const available = item.max_stock > 0 ? item.max_stock : Number.MAX_SAFE_INTEGER
      const nextQty = Math.min((existing?.quantity ?? 0) + qty, available)
      if (existing) {
        return prev.map((i) => (keyFor(i) === k ? { ...i, quantity: nextQty } : i))
      }
      return [...prev, { ...item, quantity: Math.min(qty, available) }]
    })
    setOpen(true)
  }

  const remove = (productId: number, variantId?: number | null) => {
    setItems((prev) => prev.filter((i) => !(i.product_id === productId && i.variant_id === (variantId ?? null))))
  }

  const setQuantity = (productId: number, variantId: number | null | undefined, quantity: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product_id === productId && i.variant_id === (variantId ?? null)
          ? {
              ...i,
              quantity: Math.max(
                1,
                Math.min(quantity, i.max_stock > 0 ? i.max_stock : Number.MAX_SAFE_INTEGER),
              ),
            }
          : i,
      ),
    )
  }

  const clear = () => setItems([])

  const { count, subtotalCents } = useMemo(() => {
    let count = 0
    let subtotal = 0
    for (const item of items) {
      count += item.quantity
      subtotal += item.price_cents * item.quantity
    }
    return { count, subtotalCents: subtotal }
  }, [items])

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        subtotalCents,
        open,
        openCart: () => setOpen(true),
        closeCart: () => setOpen(false),
        add,
        remove,
        setQuantity,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}