import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import BookCover from './BookCover'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/format'

export default function CartDrawer() {
  const {
    items,
    count,
    subtotal,
    shipping,
    total,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
  } = useCart()

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (!isCartOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isCartOpen])

  if (!isCartOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm fade-in"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 left-0 z-[90] w-full max-w-[420px] bg-white shadow-2xl flex flex-col drawer-in"
        role="dialog"
        aria-label="سلة المشتريات"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-700" />
            <h2 className="text-lg font-bold text-foreground">سلة المشتريات</h2>
            {count > 0 && (
              <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-[0.72rem] font-semibold rounded-full">
                {count} منتجات
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="إغلاق السلة"
          >
            <X className="w-5 h-5 text-foreground/70" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
                <ShoppingBag className="w-10 h-10 text-brand-300" />
              </div>
              <p className="text-foreground font-semibold mb-1">السلة فارغة</p>
              <p className="text-muted text-[0.82rem]">ابدأ بإضافة الكتب إلى سلتك</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 bg-[#FAFAFA] rounded-xl border border-border/40"
                >
                  <div className="flex-shrink-0 w-16">
                    <BookCover book={item} size="sm" className="w-16" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-[0.85rem] font-semibold text-foreground line-clamp-2 leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-[0.72rem] text-muted mt-0.5">{item.author}</p>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity */}
                      <div className="flex items-center gap-1 bg-white border border-border/60 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-brand-50 rounded-lg transition-colors"
                          aria-label="نقص الكمية"
                        >
                          <Minus className="w-3 h-3 text-foreground/60" />
                        </button>
                        <span className="w-7 text-center text-[0.82rem] font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-brand-50 rounded-lg transition-colors"
                          aria-label="زيادة الكمية"
                        >
                          <Plus className="w-3 h-3 text-foreground/60" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-brand-700 font-bold text-[0.9rem]">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border px-6 py-4 space-y-3 bg-white">
            <div className="flex justify-between text-[0.85rem]">
              <span className="text-muted">المجموع الفرعي</span>
              <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[0.85rem]">
              <span className="text-muted">التوصيل</span>
              <span className={`font-medium ${shipping === 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                {shipping === 0 ? 'مجاني' : formatPrice(shipping)}
              </span>
            </div>
            {shipping === 0 && subtotal > 0 && (
              <p className="text-[0.72rem] text-emerald-600">✓ توصيل مجاني للطلبات فوق {formatPrice(300)}</p>
            )}
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="font-bold text-foreground">الإجمالي</span>
              <span className="font-bold text-brand-700 text-lg">{formatPrice(total)}</span>
            </div>

            <Link
              to="/checkout"
              onClick={() => setIsCartOpen(false)}
              className="block w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-[0.92rem] font-semibold rounded-xl text-center transition-colors shadow-sm mt-2"
            >
              إتمام الشراء
            </Link>
          </div>
        )}
      </div>
    </>
  )
}