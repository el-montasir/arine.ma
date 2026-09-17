import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)

const CART_KEY = 'arine-cart'
const FAVORITES_KEY = 'arine-favorites'

function safeParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => safeParse(CART_KEY, []))
  const [favorites, setFavorites] = useState(() => safeParse(FAVORITES_KEY, []))
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message) => setToast({ id: Date.now(), message })
  const clearToast = () => setToast(null)

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items))
    } catch {
      /* storage unavailable */
    }
  }, [items])

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
    } catch {
      /* storage unavailable */
    }
  }, [favorites])

  const addToCart = (book, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === book.id)
      if (existing) {
        return prev.map((i) =>
          i.id === book.id ? { ...i, quantity: i.quantity + qty } : i
        )
      }
      return [...prev, { ...book, quantity: qty }]
    })
    setIsCartOpen(true)
    showToast(`تمت إضافة «${book.title}» إلى السلة`)
  }

  const updateQuantity = (id, qty) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id))
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
    )
  }

  const removeFromCart = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const clearCart = () => setItems([])

  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const isFavorite = (id) => favorites.includes(id)

  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  )

  const shipping = items.length === 0 ? 0 : subtotal >= 300 ? 0 : 25

  const total = subtotal + shipping

  const value = {
    items,
    count,
    subtotal,
    shipping,
    total,
    isCartOpen,
    isMenuOpen,
    favorites,
    toast,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    toggleFavorite,
    isFavorite,
    setIsCartOpen,
    setIsMenuOpen,
    showToast,
    clearToast,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}