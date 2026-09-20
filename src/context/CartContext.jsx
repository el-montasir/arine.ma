import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../utils/api'
import { trackAddToCart } from '../utils/tracking'

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
  // IMPORTANT: Cart items are cached in localStorage for persistence across sessions.
  // Prices and shippingMode stored here reflect the product state AT THE TIME OF ADDING.
  // The backend (POST /api/orders) ALWAYS recalculates final prices, shipping, and totals
  // from the current PostgreSQL product/package records — the cart values are for display only.
  const [items, setItems] = useState(() => safeParse(CART_KEY, []))
  const [favorites, setFavorites] = useState(() => safeParse(FAVORITES_KEY, []))
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [shippingConfig, setShippingConfig] = useState({
    enabled: true,
    freeThreshold: 300,
    flatFee: 25,
    freeEnabled: false,
  })

  const showToast = (message) => setToast({ id: Date.now(), message })
  const clearToast = () => setToast(null)

  // Fetch shipping config from backend on mount
  useEffect(() => {
    api
      .get('/shipping/config')
      .then((res) => {
        if (res.data) {
          setShippingConfig({
            enabled: res.data.enabled ?? true,
            freeThreshold: res.data.freeThreshold ?? 300,
            flatFee: res.data.flatFee ?? 25,
            freeEnabled: res.data.freeEnabled ?? true,
          })
        }
      })
      .catch(() => {
        // Keep defaults on error
      })
  }, [])

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
    const key = `book-${book.id}`
    setItems((prev) => {
      const existing = prev.find((i) => (i.key ? i.key === key : i.id === book.id && !i.isPackage))
      if (existing) {
        return prev.map((i) =>
          (i.key ? i.key === key : i.id === book.id && !i.isPackage)
            ? { ...i, quantity: i.quantity + qty }
            : i
        )
      }
      return [
        ...prev,
        {
          ...book,
          key,
          id: book.id,
          isPackage: false,
          quantity: qty,
        },
      ]
    })
    setIsCartOpen(true)
    showToast(`تمت إضافة «${book.title}» إلى السلة`)
    trackAddToCart(book, qty)
  }

  const addPackageToCart = (pkg, qty = 1) => {
    const key = `pkg-${pkg.id}`
    setItems((prev) => {
      const existing = prev.find((i) => (i.key ? i.key === key : i.packageId === pkg.id && i.isPackage))
      if (existing) {
        return prev.map((i) =>
          (i.key ? i.key === key : i.packageId === pkg.id && i.isPackage)
            ? { ...i, quantity: i.quantity + qty }
            : i
        )
      }
      return [
        ...prev,
        {
          ...pkg,
          key,
          id: `pkg-${pkg.id}`,
          packageId: pkg.id,
          isPackage: true,
          quantity: qty,
        },
      ]
    })
    setIsCartOpen(true)
    showToast(`تمت إضافة الباقة «${pkg.title}» إلى السلة`)
    trackAddToCart({ ...pkg, isPackage: true }, qty)
  }

  const updateQuantity = (keyOrId, qty) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.key !== keyOrId && i.id !== keyOrId))
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.key === keyOrId || i.id === keyOrId ? { ...i, quantity: qty } : i))
    )
  }

  const removeFromCart = (keyOrId) => {
    setItems((prev) => prev.filter((i) => i.key !== keyOrId && i.id !== keyOrId))
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

  const shipping = useMemo(() => {
    if (items.length === 0) return 0

    // RULE 1: If shipping is globally disabled → 0 DH
    if (shippingConfig.enabled === false) return 0

    // RULE 2: If ANY item in cart has 'free' shipping → 0 DH (entire order)
    const hasFree = items.some(
      (item) => item.shippingMode === 'free' || item.shippingMode === 'FREE'
    )
    if (hasFree) return 0

    // RULE 3: If order-value free shipping is ENABLED AND subtotal >= configured threshold → 0 DH
    if (shippingConfig.freeEnabled && subtotal >= shippingConfig.freeThreshold) {
      return 0
    }

    // RULE 4: If one or more items have 'custom' shipping → max(customShipping) ONCE
    const customItems = items.filter(
      (item) =>
        (item.shippingMode === 'custom' || item.shippingMode === 'CUSTOM') &&
        typeof item.customShipping === 'number' &&
        item.customShipping >= 0
    )
    if (customItems.length > 0) {
      return Math.max(...customItems.map((item) => item.customShipping))
    }

    // RULE 5: Apply global default shipping price (flatFee) ONCE
    return shippingConfig.flatFee
  }, [items, subtotal, shippingConfig])

  const total = subtotal + shipping

  const value = {
    items,
    count,
    subtotal,
    shipping,
    total,
    shippingConfig,
    isCartOpen,
    isMenuOpen,
    favorites,
    toast,
    addToCart,
    addPackageToCart,
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