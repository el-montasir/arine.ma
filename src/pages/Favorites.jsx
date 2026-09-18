import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingBag, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useProducts } from '../hooks/useProducts'
import BookCover from '../components/BookCover'
import { formatPrice } from '../utils/format'

export default function Favorites() {
  const { favorites, toggleFavorite, addToCart } = useCart()
  const { t, isRTL } = useLanguage()
  const { products: allBooks } = useProducts()

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  const favoriteBooks = useMemo(
    () => favorites.map((id) => allBooks.find((b) => b.id === id)).filter(Boolean),
    [favorites, allBooks]
  )

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-800 text-[0.8rem] font-medium rounded-full mb-2">
            <Heart className="w-3.5 h-3.5 fill-current" />
            {t('favorites')}
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t('favoritesTitle')}</h1>
          <p className="text-muted text-[0.88rem] mt-1">
            {t('favoritesSubtitle')}
          </p>
        </div>

        {favoriteBooks.length > 0 && (
          <span className="text-[0.88rem] text-muted self-start sm:self-auto bg-white border border-border px-4 py-2 rounded-xl">
            {t('itemsCount', { count: favoriteBooks.length })}
          </span>
        )}
      </div>

      {favoriteBooks.length === 0 ? (
        <div className="bg-white border border-border/60 rounded-3xl p-12 lg:p-16 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <Heart className="w-10 h-10 text-brand-300" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{t('noFavorites')}</h2>
          <p className="text-muted text-[0.88rem] max-w-sm mx-auto mb-6 leading-relaxed">
            {t('favoritesSubtitle')}
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-700 hover:bg-brand-800 text-white font-semibold rounded-xl transition-all shadow-md shadow-brand-700/20 text-[0.92rem]"
          >
            <span>{t('exploreShop')}</span>
            <ArrowIcon className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {favoriteBooks.map((book) => {
            const outOfStock = book.availability === 'out-of-stock'
            return (
              <div
                key={book.id}
                className="group bg-white rounded-2xl border border-border/60 hover:border-brand-200 transition-all duration-200 hover:shadow-lg overflow-hidden flex flex-col"
              >
                {/* Book cover container */}
                <div className="relative bg-[#F3F4F6] p-4 text-center">
                  <Link to={`/book/${book.id}`} className="block">
                    <BookCover book={book} size="md" className="mx-auto" />
                  </Link>

                  <button
                    onClick={() => toggleFavorite(book.id)}
                    className="absolute top-3 left-3 p-2 rounded-xl bg-white/90 text-red-500 hover:bg-white hover:text-red-600 shadow-sm transition-colors"
                    aria-label={t('close')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[0.72rem] font-semibold text-brand-600 mb-1 block">
                      {book.category}
                    </span>
                    <Link
                      to={`/book/${book.id}`}
                      className="font-bold text-[0.92rem] text-foreground hover:text-brand-700 line-clamp-2 leading-snug transition-colors"
                    >
                      {book.title}
                    </Link>
                    <p className="text-[0.78rem] text-muted mt-1">{book.author}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-brand-700 font-bold text-base">
                      {formatPrice(book.price)}
                    </span>

                    <button
                      onClick={() => addToCart(book)}
                      disabled={outOfStock}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[0.8rem] font-semibold transition-colors ${
                        outOfStock
                          ? 'bg-[#F3F4F6] text-muted cursor-not-allowed'
                          : 'bg-brand-700 hover:bg-brand-800 text-white shadow-sm'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {outOfStock ? t('outOfStock') : t('addToCart')}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
