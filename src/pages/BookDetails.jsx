import { useState, useMemo, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Star, ShoppingCart, ArrowRight, Minus, Plus, BookOpen, Box, Truck, Shield, RotateCcw } from 'lucide-react'
import BookCover from '../components/BookCover'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/format'
import books from '../data/books'
import categories from '../data/categories'
import api from '../utils/api'

export default function BookDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [apiBook, setApiBook] = useState(null)
  const localBook = useMemo(() => books.find((b) => b.id === Number(id)), [id])
  const { addToCart } = useCart()
  const [qty, setQty] = useState(1)

  // Pull the canonical product data from PostgreSQL; fall back to the bundled
  // catalog while the request is in flight or if the API is unreachable.
  useEffect(() => {
    let cancelled = false
    setApiBook(null)
    api
      .get(`/products/${id}`)
      .then((res) => {
        if (!cancelled) setApiBook(res.data || null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id])

  const book = apiBook || localBook

  if (!book) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-4 opacity-30">📚</div>
        <h2 className="text-xl font-bold text-foreground mb-2">الكتاب غير موجود</h2>
        <button
          onClick={() => navigate('/shop')}
          className="mt-4 px-6 py-3 bg-brand-700 text-white rounded-xl font-medium"
        >
          العودة للمكتبة
        </button>
      </div>
    )
  }

  const relatedBooks = books
    .filter((b) => b.category === book.category && b.id !== book.id)
    .slice(0, 4)

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[0.82rem] text-muted mb-8">
        <Link to="/" className="hover:text-brand-700 transition-colors">الرئيسية</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-brand-700 transition-colors">الكتب</Link>
        <span>/</span>
        <span className="text-foreground/70">{book.title}</span>
      </nav>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 overflow-hidden mt-2">
        {/* Cover */}
        <div className="lg:w-[340px] flex-shrink-0 max-w-full">
          <div className="lg:sticky lg:top-28 max-w-[340px] mx-auto lg:mx-0">
            <BookCover book={book} size="lg" className="w-56 lg:w-full mx-auto lg:mx-0" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-brand-100 text-brand-700 text-[0.75rem] font-semibold rounded-full">
              {book.category}
            </span>
            {book.isNew && (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[0.75rem] font-semibold rounded-full">
                جديد
              </span>
            )}
            {book.availability === 'out-of-stock' ? (
              <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[0.75rem] font-semibold rounded-full">
                غير متوفر حالياً
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[0.75rem] font-semibold rounded-full">
                متوفر
              </span>
            )}
          </div>

          <h1 className="text-2xl lg:text-4xl font-bold text-foreground leading-snug">
            {book.title}
          </h1>

          <p className="text-muted mt-2 text-[0.95rem]">
            تأليف: <span className="text-foreground font-medium">{book.author}</span>
          </p>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="w-4.5 h-4.5"
                fill={i < book.rating ? '#F59E0B' : 'none'}
                stroke={i < book.rating ? '#F59E0B' : '#D4D4D8'}
                strokeWidth={1.5}
              />
            ))}
            <span className="text-[0.82rem] text-muted mr-2">({book.rating}/5)</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mt-6">
            <span className="text-brand-700 font-bold text-3xl">{formatPrice(book.price)}</span>
            {book.oldPrice && (
              <span className="text-muted/50 text-xl line-through">{formatPrice(book.oldPrice)}</span>
            )}
            {book.discount > 0 && (
              <span className="px-2.5 py-1 bg-brand-700 text-white text-[0.75rem] font-bold rounded-lg">
                وفر {book.discount}%
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { label: 'الناشر', value: book.publisher },
              { label: 'الصفحات', value: book.pages },
              { label: 'السنة', value: book.year },
            ].map((m) => (
              <div key={m.label} className="bg-[#F3F4F6] rounded-xl px-3 py-3 text-center">
                <div className="text-[0.72rem] text-muted">{m.label}</div>
                <div className="text-[0.85rem] font-semibold text-foreground mt-0.5">{m.value}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="mt-7">
            <h3 className="font-bold text-foreground mb-2">وصف الكتاب</h3>
            <p className="text-muted text-[0.9rem] leading-relaxed">{book.description}</p>
          </div>

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-3 mt-8">
            <div
              className={`flex items-center gap-2 bg-white border border-border rounded-xl px-2 ${
                book.availability === 'out-of-stock' ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-3 hover:bg-brand-50 rounded-lg transition-colors"
              >
                <Minus className="w-4 h-4 text-foreground/60" />
              </button>
              <span className="w-8 text-center font-semibold text-foreground">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="p-3 hover:bg-brand-50 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4 text-foreground/60" />
              </button>
            </div>

            {book.availability === 'out-of-stock' ? (
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#F3F4F6] text-muted text-[0.95rem] font-semibold rounded-xl cursor-not-allowed"
              >
                غير متوفر حالياً
              </button>
            ) : (
              <button
                onClick={() => addToCart(book, qty)}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-brand-700 hover:bg-brand-800 text-white text-[0.95rem] font-semibold rounded-xl transition-all shadow-lg shadow-brand-700/20 hover:shadow-brand-800/25"
              >
                <ShoppingCart className="w-5 h-5" />
                أضف إلى السلة
              </button>
            )}
          </div>

          {/* CTA: Virtual Library */}
          <div className="mt-6">
            <Link
              to="/library"
              className="flex items-center justify-center gap-2 py-4 bg-brand-800/10 border border-brand-200 hover:bg-brand-800/15 text-brand-700 text-[0.92rem] font-semibold rounded-xl transition-all"
            >
              <Box className="w-5 h-5" />
              استكشف هذا الكتاب داخل المكتبة
            </Link>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-border/60">
            {[
              { icon: Truck, label: 'توصيل سريع', sub: '24-48 ساعة' },
              { icon: Shield, label: 'دفع آمن', sub: 'عند الاستلام' },
              { icon: RotateCcw, label: 'إرجاع', sub: 'خلال 14 يوم' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <item.icon className="w-5 h-5 text-brand-700 mx-auto mb-1" />
                <div className="text-[0.78rem] font-semibold text-foreground">{item.label}</div>
                <div className="text-[0.68rem] text-muted">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related Books */}
      {relatedBooks.length > 0 && (
        <div className="mt-20">
          <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-6">كتب ذات صلة</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-5">
            {relatedBooks.map((b) => (
              <ProductCardMini key={b.id} book={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ProductCardMini({ book }) {
  return (
    <Link to={`/book/${book.id}`} className="group block bg-white rounded-xl border border-border/60 hover:border-brand-200 hover:shadow-md transition-all overflow-hidden">
      <div className="bg-[#F3F4F6] p-3">
        <BookCover book={book} size="md" />
      </div>
      <div className="p-3">
        <div className="text-[0.72rem] text-brand-600 mb-1">{book.category}</div>
        <h4 className="text-[0.88rem] font-semibold text-foreground line-clamp-2">{book.title}</h4>
        <div className="mt-2 text-brand-700 font-bold text-[0.85rem]">{formatPrice(book.price)}</div>
      </div>
    </Link>
  )
}