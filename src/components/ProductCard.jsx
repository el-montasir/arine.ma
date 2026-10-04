import { Link } from 'react-router-dom'
import { Heart, ShoppingCart } from 'lucide-react'
import BookCover from './BookCover'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice } from '../utils/format'
import { hexToRgba } from '../utils/color'
import { getCardImageProps, createVariantFallbackHandler } from '../utils/image-variants'

export default function ProductCard({ book, isPriority = false }) {
  const { addToCart, toggleFavorite, isFavorite } = useCart()
  const { t } = useLanguage()

  if (!book) return null

  const fav = isFavorite(book.id)
  const outOfStock = book.availability === 'out-of-stock' || book.canPurchase === false
  const isPreOrder = book.availability === 'pre-order'
  const categoryColor = book.categoryColor || '#8b2f9e'
  const categoryName = book.category || 'عام'

  // Extract primary image from book.images array or fallback to book.image
  const primaryImage = (() => {
    if (Array.isArray(book.images) && book.images.length > 0) {
      const imgObj = book.images.find((img) => img.isPrimary) || book.images[0]
      return typeof imgObj === 'string' ? imgObj : imgObj?.url
    }
    return book.image || null
  })()

  return (
    <article className="group bg-white rounded-[18px] border border-[#ece5f2] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_-20px_rgba(76,22,96,0.35)] overflow-hidden flex flex-col justify-between relative h-full">
      <div>
        {/* Cover image area */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#e7dcef] to-[#cfc0dd] aspect-[3/4]">
          <Link
            to={`/book/${book.id}`}
            className="block relative h-full w-full overflow-hidden"
          >
            {primaryImage ? (
              <div className="h-full w-full overflow-hidden">
                {(() => {
                  const imgProps = getCardImageProps(primaryImage, undefined, { isPriority })
                  const retryWithOriginal = createVariantFallbackHandler(imgProps.fallbackSrc)
                  return (
                    <img
                      src={imgProps.src}
                      srcSet={imgProps.srcSet}
                      sizes={imgProps.sizes}
                      alt={book.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading={imgProps.loading}
                      decoding={imgProps.decoding}
                      fetchPriority={imgProps.fetchPriority}
                      onError={(e) => {
                        // First failure: a variant srcset URL 404s. Retry with the
                        // original, which is always valid. If that also fails,
                        // fall through to the generated BookCover placeholder.
                        if (e.currentTarget.dataset.variantFallbackApplied !== '1') {
                          retryWithOriginal(e)
                          return
                        }
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  )
                })()}
                <div className="hidden h-full w-full">
                  <BookCover book={book} size="lg" />
                </div>
              </div>
            ) : (
              <BookCover book={book} size="lg" />
            )}

            {/* Dim cover when unavailable */}
            {outOfStock && (
              <div className="absolute inset-0 z-[5] bg-white/60 backdrop-blur-[1px]" />
            )}
          </Link>

          {/* Badges */}
          <div
            className="absolute top-2.5 flex flex-col gap-1.5 z-10 pointer-events-none"
            style={{ insetInlineStart: '10px' }}
          >
            {book.discount > 0 && (
              <span className="bg-gradient-to-r from-[#8b2f9e] to-[#4c1660] text-white text-[10.5px] font-extrabold px-2.5 py-1 rounded-[20px] shadow-xs">
                {t('saveDiscount', { percent: book.discount }) || `وفر %${book.discount}`}
              </span>
            )}
            {book.isNew && (
              <span className="bg-[#1f9d84] text-white text-[10.5px] font-extrabold px-2.5 py-1 rounded-[20px] shadow-xs">
                {t('newBadge') || 'جديد'}
              </span>
            )}
            {outOfStock && (
              <span className="bg-zinc-600 text-white text-[10.5px] font-extrabold px-2.5 py-1 rounded-[20px] shadow-xs">
                {t('outOfStock') || 'غير متوفر'}
              </span>
            )}
            {isPreOrder && (
              <span className="bg-blue-600 text-white text-[10.5px] font-extrabold px-2.5 py-1 rounded-[20px] shadow-xs">
                {t('preOrder') || 'طلب مسبق'}
              </span>
            )}
          </div>

          {/* Favorite button (outside Link to prevent navigation) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleFavorite(book.id)
            }}
            style={{ insetInlineEnd: '10px' }}
            className={`absolute top-2.5 z-20 w-8 h-8 rounded-full bg-white/92 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.08)] flex items-center justify-center transition-all duration-200 active:scale-75 cursor-pointer ${
              fav
                ? 'text-[#d6467f]'
                : 'text-[#6b6577] hover:text-[#d6467f] hover:bg-white'
            }`}
            aria-label={fav ? t('favorites') : t('addToCart')}
          >
            <Heart
              key={fav ? 'fav' : 'not'}
              className={`w-3.5 h-3.5 ${fav ? 'pop-in' : ''}`}
              fill={fav ? '#d6467f' : 'none'}
              stroke={fav ? '#d6467f' : 'currentColor'}
              strokeWidth={fav ? 0 : 1.8}
            />
          </button>
        </div>

        {/* Info Area */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div>
            {/* Curved Glass Category Pill Badge */}
            <div className="mb-1.5 flex items-center">
              <span
                style={{
                  backgroundColor: hexToRgba(categoryColor, 0.14),
                  borderColor: hexToRgba(categoryColor, 0.35),
                  color: categoryColor,
                  boxShadow: `0 2px 8px -2px ${hexToRgba(categoryColor, 0.18)}`,
                }}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-tight border backdrop-blur-sm max-w-full truncate"
              >
                {categoryName}
              </span>
            </div>

            {/* Title */}
            <Link
              to={`/book/${book.id}`}
              className="block text-[13px] sm:text-[13.5px] font-bold text-[#161616] leading-[1.35] line-clamp-2 min-h-[36px] hover:text-[#8b2f9e] transition-colors"
            >
              {book.title}
            </Link>

            {/* Author */}
            {book.author && book.author.trim() ? (
              <p className="text-[11.5px] text-[#6b6577] mt-0.5 line-clamp-1 truncate font-medium">
                {book.author.trim()}
              </p>
            ) : null}
          </div>

          {/* Bottom Row: Price & Persistent Cart Button */}
          <div className="flex items-center justify-between gap-2 mt-2.5 pt-1">
            <div className="flex flex-col">
              <span className="font-tajawal font-extrabold text-[15px] sm:text-base text-[#161616] leading-tight">
                {formatPrice(book.price)}
              </span>
              {book.oldPrice && book.oldPrice > book.price ? (
                <span className="text-[11px] text-[#6b6577] line-through leading-tight">
                  {formatPrice(book.oldPrice)}
                </span>
              ) : null}
            </div>

            <button
              type="button"
              disabled={outOfStock}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addToCart(book)
              }}
              aria-label={t('addToCart') || 'أضف للسلة'}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90 shadow-2xs cursor-pointer ${
                outOfStock
                  ? 'bg-[#F3F4F6] text-[#9ca3af] cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#8b2f9e] to-[#4c1660] hover:from-[#7c288d] hover:to-[#3e1150] text-white hover:shadow-md hover:scale-105'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}