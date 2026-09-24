import { Link } from 'react-router-dom'
import { Heart, ShoppingCart } from 'lucide-react'
import BookCover from './BookCover'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice } from '../utils/format'
import { getImageUrl } from '../utils/images'

export default function ProductCard({ book }) {
  const { addToCart, toggleFavorite, isFavorite } = useCart()
  const { t } = useLanguage()

  if (!book) return null

  const fav = isFavorite(book.id)
  const outOfStock = book.availability === 'out-of-stock'
  const isPreOrder = book.availability === 'pre-order'

  // Extract primary image from book.images array or fallback to book.image
  const primaryImage = (() => {
    if (Array.isArray(book.images) && book.images.length > 0) {
      const imgObj = book.images.find((img) => img.isPrimary) || book.images[0]
      return typeof imgObj === 'string' ? imgObj : imgObj?.url
    }
    return book.image || null
  })()

  return (
    <article className="group bg-white rounded-[18px] border border-[#ece5f2] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_-20px_rgba(76,22,96,0.35)] overflow-hidden flex flex-col justify-between relative">
      <div>
        {/* Cover image area */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#e7dcef] to-[#cfc0dd] aspect-[3/4]">
          <Link
            to={`/book/${book.id}`}
            className="block relative h-full w-full overflow-hidden"
          >
            {primaryImage ? (
              <div className="h-full w-full overflow-hidden">
                <img
                  src={getImageUrl(primaryImage)}
                  alt={book.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
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

          {/* Quick add overlay on hover (outside Link) */}
          {outOfStock ? (
            <div className="absolute bottom-2.5 inset-x-2.5 z-10 py-2 rounded-xl text-[11px] font-medium text-white/90 bg-zinc-800/80 backdrop-blur-sm flex items-center justify-center gap-1.5 pointer-events-none">
              {t('outOfStockDesc') || 'غير متوفر حالياً'}
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addToCart(book)
              }}
              className="absolute bottom-2.5 inset-x-2.5 z-20 py-2.5 bg-gradient-to-r from-[#8b2f9e] to-[#4c1660] hover:from-[#7c288d] hover:to-[#3e1150] text-white text-xs font-bold rounded-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{t('addToCart') || 'أضف للسلة'}</span>
            </button>
          )}
        </div>

        {/* Info Area */}
        <div className="p-3.5 sm:p-4">
          <div className="text-[11px] font-bold text-[#8b2f9e] mb-1 truncate">
            {book.category || 'عام'}
          </div>

          <Link
            to={`/book/${book.id}`}
            className="block text-[13.5px] sm:text-14px font-bold text-[#161616] leading-[1.45] line-clamp-2 min-h-[40px] hover:text-[#8b2f9e] transition-colors"
          >
            {book.title}
          </Link>

          {/* Price row */}
          <div className="flex items-baseline gap-2 mt-2 pt-1">
            <span className="font-tajawal font-extrabold text-[15.5px] sm:text-base text-[#161616]">
              {formatPrice(book.price)}
            </span>
            {book.oldPrice && book.oldPrice > book.price ? (
              <span className="text-[11.5px] sm:text-xs text-[#6b6577] line-through">
                {formatPrice(book.oldPrice)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Add to cart (visible on mobile screens) */}
      <div className="p-3 pt-0 sm:hidden">
        <button
          type="button"
          onClick={() => addToCart(book)}
          disabled={outOfStock}
          className={`w-full py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer ${
            outOfStock
              ? 'bg-[#F3F4F6] text-[#6b6577] cursor-not-allowed'
              : 'bg-gradient-to-r from-[#8b2f9e] to-[#4c1660] text-white active:scale-95 shadow-xs'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>{outOfStock ? (t('outOfStock') || 'غير متوفر') : (t('addToCart') || 'أضف للسلة')}</span>
        </button>
      </div>
    </article>
  )
}