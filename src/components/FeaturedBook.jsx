import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Star, BookOpen, Heart } from 'lucide-react'
import BookCover from './BookCover'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice } from '../utils/format'
import { getImageUrl } from '../utils/images'

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
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden bg-white rounded-[22px] border border-[#ece5f2] p-6 sm:p-8 lg:p-12 shadow-[0_12px_26px_-18px_rgba(76,22,96,0.2)]">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#f3ebfa] rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#f3ebfa]/80 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center gap-8 lg:gap-12">
          {/* Book cover */}
          <div className="flex-shrink-0 w-44 sm:w-52 lg:w-56">
            {primaryImage ? (
              <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-md border border-[#ece5f2] bg-gradient-to-br from-[#e7dcef] to-[#cfc0dd]">
                <img
                  src={getImageUrl(primaryImage)}
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
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#f3ebfa] text-[#8b2f9e] text-xs font-bold rounded-full mb-3.5">
              <BookOpen className="w-3.5 h-3.5 text-[#8b2f9e]" />
              {t('featured') || 'كتاب مميز'}
            </span>

            <h3 className="font-tajawal font-extrabold text-2xl lg:text-3xl text-[#161616] leading-snug">
              {book.title}
            </h3>

            {book.author && <p className="text-[#6b6577] text-sm mt-1.5 font-medium">{book.author}</p>}

            {/* Rating */}
            <div className="flex items-center gap-1 mt-2.5 justify-center md:justify-start">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="w-3.5 h-3.5"
                  fill={i < (Number(book.rating) || 5) ? '#c9932f' : 'none'}
                  stroke={i < (Number(book.rating) || 5) ? '#c9932f' : '#D4D4D8'}
                  strokeWidth={1.5}
                />
              ))}
            </div>

            <p className="text-[#6b6577] text-sm leading-relaxed mt-3.5 max-w-xl">
              {book.description || (t('noDescription') || 'لا يوجد وصف تفصيلي مسجل لهذا الكتاب حالياً.')}
            </p>

            <div className="flex items-center gap-4 mt-5 justify-center md:justify-start">
              <div className="flex items-baseline gap-2">
                <span className="font-tajawal font-extrabold text-[#161616] text-xl sm:text-2xl">
                  {formatPrice(book.price)}
                </span>
                {book.oldPrice && book.oldPrice > book.price ? (
                  <span className="text-[#6b6577] text-sm line-through">
                    {formatPrice(book.oldPrice)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 justify-center md:justify-start flex-wrap">
              {outOfStock ? (
                <span className="inline-flex items-center gap-2 px-6 py-3 bg-[#F3F4F6] text-[#6b6577] text-sm font-bold rounded-xl">
                  {t('outOfStock') || 'غير متوفر حالياً'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => addToCart(book)}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#8b2f9e] to-[#4c1660] hover:from-[#7c288d] hover:to-[#3e1150] text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {t('addToCart') || 'أضف للسلة'}
                </button>
              )}

              <Link
                to={`/book/${book.id}`}
                className="inline-flex items-center gap-2 px-5 py-3.5 bg-white border border-[#ece5f2] hover:border-[#8b2f9e]/40 text-[#161616] text-sm font-bold rounded-xl transition-all hover:text-[#8b2f9e] cursor-pointer"
              >
                <span>{t('viewDetails') || 'عرض التفاصيل'}</span>
                <ArrowIcon className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={() => toggleFavorite(book.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  fav
                    ? 'bg-red-50 border-red-200 text-[#d6467f] shadow-xs'
                    : 'bg-white border-[#ece5f2] text-[#6b6577] hover:text-[#d6467f] hover:border-red-200'
                }`}
                aria-label={t('favorites') || 'المفضلة'}
              >
                <Heart
                  className="w-4 h-4"
                  fill={fav ? '#d6467f' : 'none'}
                  stroke={fav ? '#d6467f' : 'currentColor'}
                  strokeWidth={fav ? 0 : 1.8}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}