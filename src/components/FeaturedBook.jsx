import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Star, BookOpen, Heart } from 'lucide-react'
import BookCover from './BookCover'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice } from '../utils/format'

export default function FeaturedBook({ book }) {
  const { addToCart, toggleFavorite, isFavorite } = useCart()
  const { t, isRTL } = useLanguage()

  if (!book) return null

  const fav = isFavorite(book.id)
  const outOfStock = book.availability === 'out-of-stock'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  // Extract primary image from book.images array or fallback to book.image
  const primaryImage = (() => {
    if (Array.isArray(book.images) && book.images.length > 0) {
      const imgObj = book.images.find((img) => img.isPrimary) || book.images[0]
      return typeof imgObj === 'string' ? imgObj : imgObj?.url
    }
    return book.image || null
  })()

  return (
    <section className="max-w-[1440px] mx-auto px-4 lg:px-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-white to-brand-50/60 rounded-3xl border border-brand-100/60 p-6 lg:p-12">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-brand-100/40 rounded-full blur-2xl" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-brand-200/30 rounded-full blur-2xl" />

        <div className="relative flex flex-col md:flex-row items-center gap-8 lg:gap-14">
          {/* Book cover */}
          <div className="flex-shrink-0 w-48 lg:w-56">
            {primaryImage ? (
              <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-lg border border-border">
                <img
                  src={primaryImage}
                  alt={book.title}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <div className="hidden">
                  <BookCover book={book} size="lg" className="w-full" />
                </div>
              </div>
            ) : (
              <BookCover book={book} size="lg" className="w-full" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-100 text-brand-700 text-[0.78rem] font-semibold rounded-full mb-4">
              <BookOpen className="w-3.5 h-3.5" />
              {t('featured') || 'الكتب المميزة'}
            </span>

            <h3 className="text-2xl lg:text-3xl font-bold text-foreground leading-snug">
              {book.title}
            </h3>

            {book.author && <p className="text-muted text-[0.9rem] mt-2">{book.author}</p>}

            {/* Rating */}
            <div className="flex items-center gap-1 mt-3 justify-center md:justify-start">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="w-4 h-4"
                  fill={i < (Number(book.rating) || 5) ? '#F59E0B' : 'none'}
                  stroke={i < (Number(book.rating) || 5) ? '#F59E0B' : '#D4D4D8'}
                  strokeWidth={1.5}
                />
              ))}
            </div>

            <p className="text-muted text-[0.88rem] leading-relaxed mt-4 max-w-xl">
              {book.description || (t('noDescription') || 'لا يوجد وصف تفصيلي مسجل لهذا الكتاب حالياً.')}
            </p>

            <div className="flex items-center gap-4 mt-6 justify-center md:justify-start">
              <div className="flex items-baseline gap-2">
                <span className="text-brand-700 font-bold text-xl">{formatPrice(book.price)}</span>
                {book.oldPrice ? (
                  <span className="text-muted/50 text-[0.88rem] line-through">{formatPrice(book.oldPrice)}</span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-7 justify-center md:justify-start flex-wrap">
              {outOfStock ? (
                <span className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#F3F4F6] text-muted text-[0.9rem] font-semibold rounded-2xl">
                  {t('outOfStock') || 'غير متوفر حالياً'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => addToCart(book)}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-[0.9rem] font-semibold rounded-2xl transition-all shadow-lg shadow-brand-700/20 hover:shadow-brand-800/25 hover:-translate-y-0.5"
                >
                  {t('addToCart') || 'أضف للسلة'}
                </button>
              )}

              <Link
                to={`/book/${book.id}`}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white border border-border hover:border-brand-300 text-foreground text-[0.9rem] font-semibold rounded-2xl transition-all hover:text-brand-700"
              >
                <span>{t('viewDetails') || 'عرض التفاصيل'}</span>
                <ArrowIcon className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={() => toggleFavorite(book.id)}
                className={`p-3.5 rounded-2xl border transition-all ${
                  fav
                    ? 'bg-red-50 border-red-200 text-red-500 shadow-sm'
                    : 'bg-white border-border text-muted hover:text-red-500 hover:border-red-200'
                }`}
                aria-label={t('favorites') || 'المفضلة'}
              >
                <Heart className="w-5 h-5" fill={fav ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}