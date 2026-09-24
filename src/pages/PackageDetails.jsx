import { useState, useMemo, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Minus, Plus, Package as PackageIcon, BookOpen, Truck, Shield, RotateCcw, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
import usePackage from '../hooks/usePackage'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice, formatBookCount, formatPackageContains } from '../utils/format'
import { trackViewContent } from '../utils/tracking'
import { getImageUrl } from '../utils/images'
import BookCover from '../components/BookCover'

export default function PackageDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pkg, loading, error } = usePackage(id)
  const { addPackageToCart } = useCart()
  const { t, language, isRTL } = useLanguage()
  const [qty, setQty] = useState(1)
  const [selectedImageIdx, setSelectedImageIdx] = useState(0)

  useEffect(() => {
    if (pkg && pkg.id) {
      trackViewContent({ ...pkg, isPackage: true })
    }
  }, [pkg?.id])

  const imagesList = useMemo(() => {
    if (!pkg) return []
    if (Array.isArray(pkg.images) && pkg.images.length > 0) {
      return pkg.images.map((img) => (typeof img === 'string' ? img : img.url)).filter(Boolean)
    }
    if (pkg.image) return [pkg.image]
    return []
  }, [pkg])

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <PackageIcon className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
        <p className="text-sm text-muted">{t('loading') || 'جاري تحميل تفاصيل الباقة...'}</p>
      </div>
    )
  }

  if (error || !pkg) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <PackageIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t('packageNotFound') || 'الباقة غير موجودة'}</h2>
        <button
          onClick={() => navigate('/packages')}
          className="mt-4 px-6 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-medium transition-colors"
        >
          {t('backToPackages') || 'العودة إلى الباقات'}
        </button>
      </div>
    )
  }

  const currentImageUrl = imagesList[selectedImageIdx] || imagesList[0] || null
  const outOfStock = pkg.availability === 'out-of-stock'
  const isFreeShipping = pkg.shippingMode === 'free' || pkg.shippingMode === 'FREE'

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[0.82rem] text-muted mb-8">
        <Link to="/" className="hover:text-brand-700 transition-colors">{t('home') || 'الرئيسية'}</Link>
        <span>/</span>
        <Link to="/packages" className="hover:text-brand-700 transition-colors">{t('packages') || 'الباقات'}</Link>
        <span>/</span>
        <span className="text-foreground/70 truncate max-w-xs">{pkg.title}</span>
      </nav>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 overflow-hidden mt-2">
        {/* Cover / Gallery */}
        <div className="lg:w-[380px] flex-shrink-0 max-w-full">
          <div className="lg:sticky lg:top-28 max-w-[380px] mx-auto lg:mx-0 space-y-3">
            <div className="relative aspect-[4/3] sm:aspect-square w-full mx-auto lg:mx-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900/5 to-brand-700/10 border border-border shadow-md flex items-center justify-center">
              {currentImageUrl ? (
                <img
                  src={getImageUrl(currentImageUrl)}
                  alt={pkg.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-brand-800/60 p-6 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-brand-700/10 flex items-center justify-center mb-3">
                    <PackageIcon className="w-10 h-10 text-brand-700" />
                  </div>
                  <span className="text-sm font-semibold">{t('curatedPackage') || 'باقة كتب شرعية'}</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {imagesList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 max-w-[380px] mx-auto lg:mx-0">
                {imagesList.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      selectedImageIdx === idx
                        ? 'border-brand-600 shadow-sm scale-105'
                        : 'border-border/80 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={getImageUrl(url)} alt={`صورة ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info & Details */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="px-3 py-1 bg-brand-100 text-brand-800 text-xs font-bold rounded-full flex items-center gap-1.5">
              <PackageIcon className="w-3.5 h-3.5" />
              {t('package') || 'باقة مميزة'}
            </span>
            <span className="px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 text-xs font-semibold rounded-full flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {formatBookCount(pkg.booksCount || pkg.books?.length || 0, language)}
            </span>
            {pkg.isNew && (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                {t('newBadge') || 'جديد'}
              </span>
            )}
            {isFreeShipping && (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                {t('freeShipping') || 'توصيل مجاني'}
              </span>
            )}
            {outOfStock ? (
              <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full">
                {t('outOfStock') || 'غير متوفر حالياً'}
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">
                {t('inStock') || 'متوفر'}
              </span>
            )}
          </div>

          <h1 className="text-2xl lg:text-4xl font-bold text-foreground leading-snug">
            {pkg.title}
          </h1>

          {/* Pricing */}
          <div className="flex items-baseline gap-3 mt-6 flex-wrap">
            <span className="text-brand-700 font-extrabold text-3xl lg:text-4xl">{formatPrice(pkg.price)}</span>
            {pkg.oldPrice && pkg.oldPrice > pkg.price && (
              <span className="text-muted/60 text-xl line-through">{formatPrice(pkg.oldPrice)}</span>
            )}
            {Number.isFinite(pkg.discount) && pkg.discount > 0 && pkg.discount <= 100 && (
              <span className="px-3 py-1 bg-brand-700 text-white text-xs font-bold rounded-lg shadow-sm">
                {t('saveDiscount', { percent: Math.round(pkg.discount) })}
              </span>
            )}
          </div>

          {/* Description */}
          {pkg.description && (
            <div className="mt-6">
              <h3 className="font-bold text-foreground mb-2 text-sm">{t('packageDescription') || 'عن الباقة'}</h3>
              <p className="text-muted text-sm leading-relaxed whitespace-pre-line">{pkg.description}</p>
            </div>
          )}

          {/* Included Books List */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-700" />
                <span>{formatPackageContains(pkg.books?.length || 0, language)}</span>
                <span className="text-xs text-muted font-normal">({formatBookCount(pkg.books?.length || 0, language)})</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(pkg.books || []).map((book, idx) => (
                <Link
                  key={book.id || idx}
                  to={`/book/${book.id}`}
                  className="group flex items-start gap-3.5 p-3.5 rounded-2xl border border-border/80 hover:border-brand-300 bg-white hover:bg-brand-50/20 transition-all shadow-sm"
                >
                  <div className="w-14 h-18 shrink-0 rounded-lg overflow-hidden bg-zinc-100 border border-border">
                    {book.image ? (
                      <img src={getImageUrl(book.image)} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookCover book={book} size="sm" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-brand-600 block">{book.category}</span>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-brand-700 transition-colors line-clamp-2 leading-snug">
                      {book.title}
                    </h4>
                    <p className="text-[11px] text-muted truncate mt-0.5">{book.author}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-700">{formatPrice(book.price)}</span>
                      <span className="text-[10px] text-brand-600 font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t('viewBook') || 'عرض الكتاب'}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-3 mt-8">
            <div
              className={`flex items-center gap-2 bg-white border border-border rounded-xl px-2 ${
                outOfStock ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-3 hover:bg-brand-50 rounded-lg transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4 text-foreground/60" />
              </button>
              <span className="w-8 text-center font-semibold text-foreground">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="p-3 hover:bg-brand-50 rounded-xl transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4 text-foreground/60" />
              </button>
            </div>

            {outOfStock ? (
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-zinc-100 text-muted text-sm font-semibold rounded-xl cursor-not-allowed border border-zinc-200"
              >
                {t('outOfStock') || 'غير متوفر حالياً'}
              </button>
            ) : (
              <button
                onClick={() => addPackageToCart(pkg, qty)}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-brand-700/20 active:scale-[0.99]"
              >
                <ShoppingCart className="w-5 h-5" />
                {t('addPackageToCart') || 'أضف الباقة إلى السلة'}
              </button>
            )}
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-border/60">
            {[
              { icon: Truck, label: t('fastShipping') || 'توصيل سريع', sub: '24-48 ساعة' },
              { icon: Shield, label: t('securePayment') || 'دفع آمن', sub: 'عند الاستلام' },
              { icon: RotateCcw, label: t('guarantee') || 'ضمان الجودة', sub: 'تغليف متين ومحكم' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <item.icon className="w-5 h-5 text-brand-700 mx-auto mb-1" />
                <div className="text-xs font-semibold text-foreground">{item.label}</div>
                <div className="text-[10px] text-muted">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
