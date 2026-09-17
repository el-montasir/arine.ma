import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react'
import BookCover from '../components/BookCover'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/format'

export default function CartPage() {
  const { items, subtotal, shipping, total, updateQuantity, removeFromCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-16 text-center">
        <div className="w-24 h-24 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
          <ShoppingBag className="w-12 h-12 text-brand-300" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">سلتك فارغة</h2>
        <p className="text-muted mb-6">ابدأ بإضافة الكتب إلى سلتك</p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand-700 hover:bg-brand-800 text-white font-semibold rounded-xl transition-colors"
        >
          استكشف الكتب
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-8">سلة المشتريات</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Items */}
        <div className="flex-1">
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-4 bg-white border border-border/60 rounded-2xl"
              >
                <div className="flex-shrink-0 w-20">
                  <BookCover book={item} size="sm" className="w-20" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        to={`/book/${item.id}`}
                        className="font-semibold text-foreground hover:text-brand-700 transition-colors"
                      >
                        {item.title}
                      </Link>
                      <p className="text-[0.82rem] text-muted mt-0.5">{item.author}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-xl px-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="font-bold text-brand-700 text-lg">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:w-[340px]">
          <div className="bg-white border border-border/60 rounded-2xl p-6 sticky top-28">
            <h3 className="font-bold text-foreground mb-4">ملخص الطلب</h3>
            <div className="space-y-3 text-[0.88rem]">
              <div className="flex justify-between">
                <span className="text-muted">المجموع الفرعي</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">التوصيل</span>
                <span className={`font-medium ${shipping === 0 ? 'text-emerald-600' : ''}`}>
                  {shipping === 0 ? 'مجاني' : formatPrice(shipping)}
                </span>
              </div>
              {shipping === 0 && (
                <p className="text-[0.75rem] text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                  ✓ توصيل مجاني للطلبات فوق {formatPrice(300)}
                </p>
              )}
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-bold">الإجمالي</span>
                <span className="font-bold text-brand-700 text-xl">{formatPrice(total)}</span>
              </div>
            </div>

            <Link
              to="/checkout"
              className="block w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-[0.92rem] font-semibold rounded-xl text-center transition-colors mt-6"
            >
              إتمام الشراء
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}