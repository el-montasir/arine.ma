import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import BookCover from './BookCover'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice } from '../utils/format'

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
    <article className="group bg-white rounded-2xl border border-border/60 hover:border-brand-200 transition-all duration-300 hover:shadow-lg hover:shadow-brand-100/40 hover:-translate-y-1 overflow-hidden flex flex-col justify-between">
      <div>
        {/* Cover image area */}
        <div className="relative overflow-hidden bg-[#F3F4F6]">
          <Link
            to={`/book/${book.id}`}
            className="block relative aspect-[2/3] w-full overflow-hidden"
          >
            {primaryImage ? (
              <div className="h-full w-full overflow-hidden">
                <img
                  src={primaryImage}
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
              <div className="absolute inset-0 z-[5] bg-white/55 backdrop-blur-[1px]" />
            )}
          </Link>

          {/* Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10 pointer-events-none">
            {book.discount > 0 && (
              <span className="bg-brand-700 text-white text-[0.72rem] font-bold px-2.5 py-0.5 rounded-lg shadow-sm">
                {t('saveDiscount', { percent: book.discount })}
              </span>
            )}
            {book.isNew && (
              <span className="bg-emerald-600 text-white text-[0.72rem] font-bold px-2.5 py-0.5 rounded-lg shadow-sm">
                {t('newBadge')}
              </span>
            )}
            {outOfStock && (
              <span className="bg-zinc-600 text-white text-[0.72rem] font-bold px-2.5 py-0.5 rounded-lg shadow-sm">
                {t('outOfStock')}
              </span>
            )}
            {isPreOrder && (
              <span className="bg-blue-600 text-white text-[0.72rem] font-bold px-2.5 py-0.5 rounded-lg shadow-sm">
                {t('preOrder')}
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
            className={`absolute top-3 left-3 z-20 p-2 rounded-xl backdrop-blur-sm transition-all duration-200 active:scale-75 ${
              fav
                ? 'bg-red-50 text-red-500 shadow-sm border border-red-200'
                : 'bg-white/90 text-muted hover:text-red-500 hover:bg-white shadow-sm'
            }`}
            aria-label={fav ? t('favorites') : t('addToCart')}
          >
            <Heart
              key={fav ? 'fav' : 'not'}
              className={`w-4 h-4 ${fav ? 'pop-in' : ''}`}
              fill={fav ? 'currentColor' : 'none'}
              strokeWidth={fav ? 0 : 2}
            />
          </button>

          {/* Quick add overlay (outside Link) */}
          {outOfStock ? (
            <div className="absolute bottom-3 inset-x-3 z-10 py-2.5 rounded-xl text-[0.82rem] font-medium text-white/80 flex items-center justify-center gap-2 pointer-events-none">
              {t('outOfStockDesc')}
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addToCart(book)
              }}
              className="absolute bottom-3 inset-x-3 z-20 py-2.5 bg-brand-700/95 hover:bg-brand-700 text-white text-[0.82rem] font-medium rounded-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 backdrop-blur-sm shadow-md flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              {t('addToCart')}
            </button>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 text-[0.72rem] text-muted mb-2">
            <span className="text-brand-600 font-medium">{book.category}</span>
            <span className="text-border">•</span>
            <span>{book.author}</span>
          </div>

          <Link
            to={`/book/${book.id}`}
            className="block font-semibold text-[0.95rem] text-foreground leading-snug line-clamp-2 hover:text-brand-700 transition-colors"
          >
            {book.title}
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="w-3.5 h-3.5"
                fill={i < (Number(book.rating) || 5) ? '#F59E0B' : 'none'}
                stroke={i < (Number(book.rating) || 5) ? '#F59E0B' : '#D4D4D8'}
                strokeWidth={1.5}
              />
            ))}
            <span className="text-[0.72rem] text-muted mr-1">({Number(book.rating) || 5})</span>
          </div>

          {/* Price row */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-brand-700 font-bold text-lg">{formatPrice(book.price)}</span>
              {book.oldPrice ? (
                <span className="text-muted/60 text-[0.82rem] line-through">{formatPrice(book.oldPrice)}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Add to cart (visible on mobile) */}
      <div className="p-4 pt-0 sm:hidden">
        <button
          type="button"
          onClick={() => addToCart(book)}
          disabled={outOfStock}
          className={`w-full py-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${
            outOfStock
              ? 'bg-[#F3F4F6] text-muted cursor-not-allowed'
              : 'bg-brand-700 hover:bg-brand-800 text-white text-[0.84rem] font-medium'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          {outOfStock ? t('outOfStock') : t('addToCart')}
        </button>
      </div>
    </article>
  )
}