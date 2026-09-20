import { useState, useMemo, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Minus, Plus, Box, Truck, Shield, Loader2, Heart, ArrowLeft, ArrowRight } from 'lucide-react'
import BookCover from '../components/BookCover'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice } from '../utils/format'
import books from '../data/books'
import api from '../utils/api'
import { trackViewContent } from '../utils/tracking'

export default function BookDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, isRTL } = useLanguage()
  const [apiBook, setApiBook] = useState(null)
  const localBook = useMemo(() => books.find((b) => b.id === Number(id)), [id])
  const { addToCart, toggleFavorite, isFavorite } = useCart()
  const [qty, setQty] = useState(1)
  const [selectedImageIdx, setSelectedImageIdx] = useState(0)

  // Pull the canonical product data from PostgreSQL; fall back to the bundled
  // catalog ONLY while the request is in flight or if the API is unreachable.
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setApiBook(null)
    setLoading(true)
    setApiError(false)
    setSelectedImageIdx(0)
    api
      .get(`/products/${id}`)
      .then((res) => {
        if (!cancelled) {
          setApiBook(res.data || null)
          setLoading(false)
          setApiError(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiError(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // CRITICAL: API data takes absolute priority when loaded successfully.
  // Only use local book during loading or when API genuinely failed.
  const book = apiBook || (loading || apiError ? localBook : null)

  useEffect(() => {
    if (book && book.id) {
      trackViewContent(book)
    }
  }, [book?.id])

  const imagesList = useMemo(() => {
    if (!book) return []
    if (Array.isArray(book.images) && book.images.length > 0) {
      return book.images
        .map((img) => (typeof img === 'string' ? img.trim() : img?.url?.trim()))
        .filter(Boolean)
    }
    if (book.image) {
      return [book.image.trim()]
    }
    return []
  }, [book])

  const [apiRelated, setApiRelated] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (book?.category) {
      api
        .get(`/products?category=${encodeURIComponent(book.category)}`)
        .then((res) => {
          if (!cancelled && Array.isArray(res.data)) {
            setApiRelated(res.data.filter((b) => b.id !== book.id).slice(0, 4))
          }
        })
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [book?.category, book?.id])

  const relatedBooks = useMemo(() => {
    if (Array.isArray(apiRelated) && apiRelated.length > 0) {
      return apiRelated
    }
    return books
      .filter((b) => b.category === book?.category && b.id !== book?.id)
      .slice(0, 4)
  }, [apiRelated, book?.category, book?.id])

  if (loading && !book) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-24 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3 text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-sm font-medium">{t('loading') || 'جاري تحميل بيانات الكتاب…'}</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-4 opacity-30">📚</div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t('bookNotFound') || 'الكتاب غير موجود'}</h2>
        <button
          onClick={() => navigate('/shop')}
          className="mt-4 px-6 py-3 bg-brand-700 text-white rounded-xl font-medium"
        >
          {t('backToStore') || 'العودة للمكتبة'}
        </button>
      </div>
    )
  }

  const currentImageUrl = imagesList[selectedImageIdx] || imagesList[0] || null
  const isFreeShipping = book.shippingMode === 'free' || book.shippingMode === 'FREE'

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[0.82rem] text-muted mb-8">
        <Link to="/" className="hover:text-brand-700 transition-colors">{t('home') || 'الرئيسية'}</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-brand-700 transition-colors">{t('books') || 'الكتب'}</Link>
        <span>/</span>
        <span className="text-foreground/70">{book.title}</span>
      </nav>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 overflow-hidden mt-2">
        {/* Cover / Image Gallery */}
        <div className="lg:w-[340px] flex-shrink-0 max-w-full">
          <div className="lg:sticky lg:top-28 max-w-[340px] mx-auto lg:mx-0 space-y-3">
            {currentImageUrl ? (
              <div className="relative aspect-[3/4] w-56 lg:w-full mx-auto lg:mx-0 overflow-hidden rounded-2xl bg-[#F3F4F6] border border-border shadow-md">
                <img
                  src={currentImageUrl}
                  alt={book.title}
                  className="h-full w-full object-cover transition-all"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <div className="hidden h-full w-full">
                  <BookCover book={book} size="lg" className="w-56 lg:w-full mx-auto lg:mx-0" />
                </div>
              </div>
            ) : (
              <BookCover book={book} size="lg" className="w-56 lg:w-full mx-auto lg:mx-0" />
            )}

            {/* Thumbnails list if multiple images exist */}
            {imagesList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 max-w-[340px] mx-auto lg:mx-0">
                {imagesList.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`h-16 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      selectedImageIdx === idx
                        ? 'border-brand-600 shadow-sm scale-105'
                        : 'border-border/80 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`صورة ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {book.category && (
              <span className="px-2.5 py-1 bg-brand-100 text-brand-700 text-[0.75rem] font-semibold rounded-full">
                {book.category}
              </span>
            )}
            {book.availability === 'out-of-stock' ? (
              <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[0.75rem] font-semibold rounded-full">
                {t('outOfStock') || 'غير متوفر حالياً'}
              </span>
            ) : book.availability === 'pre-order' ? (
              <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[0.75rem] font-semibold rounded-full">
                {t('preOrder') || 'طلب مسبق'}
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[0.75rem] font-semibold rounded-full">
                {t('inStock') || 'متوفر'}
              </span>
            )}
            {book.author && book.author.trim() ? (
              <span className="px-3 py-1 bg-brand-50 text-brand-800 border border-brand-200/70 text-[0.75rem] font-medium rounded-full">
                {book.author.trim()}
              </span>
            ) : null}
            {book.isNew && (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[0.75rem] font-semibold rounded-full">
                {t('newBadge') || 'جديد'}
              </span>
            )}
            {isFreeShipping && (
              <span className="px-2.5 py-1 bg-ok-50 text-ok-600 border border-ok-200 text-[0.75rem] font-semibold rounded-full flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {t('freeShipping') || 'توصيل مجاني'}
              </span>
            )}
          </div>

          <h1 className="text-2xl lg:text-4xl font-bold text-foreground leading-snug">
            {book.title}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-3 mt-5">
            <span className="text-brand-700 font-bold text-3xl">{formatPrice(book.price)}</span>
            {book.oldPrice ? (
              <span className="text-muted/50 text-xl line-through">{formatPrice(book.oldPrice)}</span>
            ) : null}
            {book.discount > 0 && (
              <span className="px-2.5 py-1 bg-brand-700 text-white text-[0.75rem] font-bold rounded-lg">
                وفر {book.discount}%
              </span>
            )}
          </div>

          {/* Publisher (دار النشر) - rendered dynamically only when available */}
          {book.publisher && book.publisher.trim() ? (
            <div className="mt-5 inline-flex items-center gap-2 bg-[#F9FAFB] border border-border/70 rounded-xl px-3.5 py-2">
              <span className="text-xs text-muted font-medium">{t('publisher') || 'دار النشر'}:</span>
              <span className="text-xs font-semibold text-foreground">{book.publisher.trim()}</span>
            </div>
          ) : null}

          {/* Description */}
          <div className="mt-7">
            <h3 className="font-bold text-foreground mb-2">{t('description') || 'الوصف'}</h3>
            <p className="text-muted text-[0.9rem] leading-relaxed">
              {book.description || (t('noDescription') || 'لا يوجد وصف متاح لهذا الكتاب.')}
            </p>
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
                {t('outOfStock') || 'غير متوفر حالياً'}
              </button>
            ) : (
              <button
                onClick={() => addToCart(book, qty)}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-brand-700 hover:bg-brand-800 text-white text-[0.95rem] font-semibold rounded-xl transition-all shadow-lg shadow-brand-700/20 hover:shadow-brand-800/25"
              >
                <ShoppingCart className="w-5 h-5" />
                {t('addToCart') || 'أضف إلى السلة'}
              </button>
            )}

            <button
              type="button"
              onClick={() => toggleFavorite(book.id)}
              className={`p-4 rounded-xl border transition-all ${
                isFavorite(book.id)
                  ? 'bg-red-50 border-red-200 text-red-500 shadow-sm'
                  : 'bg-white border-border text-muted hover:text-red-500 hover:border-red-200'
              }`}
              aria-label={t('favorites') || 'المفضلة'}
            >
              <Heart
                className="w-5 h-5"
                fill={isFavorite(book.id) ? 'currentColor' : 'none'}
              />
            </button>
          </div>

          {/* CTA: Virtual Library */}
          <div className="mt-6">
            <Link
              to="/library"
              className="flex items-center justify-center gap-2 py-4 bg-brand-800/10 border border-brand-200 hover:bg-brand-800/15 text-brand-700 text-[0.92rem] font-semibold rounded-xl transition-all"
            >
              <Box className="w-5 h-5" />
              {t('exploreInLibrary') || 'استكشف هذا الكتاب داخل المكتبة'}
            </Link>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-border/60">
            {[
              { icon: Truck, label: t('fastDelivery') || 'توصيل سريع', sub: t('fastDeliverySub') || '24-48 ساعة لجميع المدن' },
              { icon: Shield, label: t('securePayment') || 'دفع آمن', sub: t('cashOnDelivery') || 'عند الاستلام' },
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
          <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-6">
            {t('relatedBooks') || 'كتب ذات صلة'}
          </h2>
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
  if (!book) return null

  const primaryImg = (() => {
    if (Array.isArray(book.images) && book.images.length > 0) {
      const obj = book.images.find((i) => i.isPrimary) || book.images[0]
      return typeof obj === 'string' ? obj : obj?.url
    }
    return book.image || null
  })()

  return (
    <Link
      to={`/book/${book.id}`}
      className="group block bg-white rounded-xl border border-border/60 hover:border-brand-200 hover:shadow-md transition-all overflow-hidden"
    >
      <div className="bg-[#F3F4F6] p-3">
        {primaryImg ? (
          <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-surface-900">
            <img
              src={primaryImg}
              alt={book.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
            <div className="hidden">
              <BookCover book={book} size="md" />
            </div>
          </div>
        ) : (
          <BookCover book={book} size="md" />
        )}
      </div>
      <div className="p-3">
        {book.category && (
          <div className="text-[0.72rem] text-brand-600 mb-1">{book.category}</div>
        )}
        <h4 className="text-[0.88rem] font-semibold text-foreground line-clamp-2">{book.title}</h4>
        <div className="mt-2 text-brand-700 font-bold text-[0.85rem]">{formatPrice(book.price)}</div>
      </div>
    </Link>
  )
}
