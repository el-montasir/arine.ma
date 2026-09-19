import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingBag, ArrowLeft, ArrowRight, Trash2, Loader2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useProducts } from '../hooks/useProducts'
import BookCover from '../components/BookCover'
import { formatPrice } from '../utils/format'

export default function Favorites() {
  const { favorites, toggleFavorite, addToCart } = useCart()
  const { t, isRTL } = useLanguage()
  const { books: allBooks = [], loading } = useProducts()

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  const favoriteBooks = useMemo(() => {
    if (!Array.isArray(allBooks) || allBooks.length === 0) return []
    return favorites
      .map((id) => allBooks.find((b) => Number(b.id) === Number(id)))
      .filter(Boolean)
  }, [favorites, allBooks])

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-800 text-[0.8rem] font-medium rounded-full mb-2">
            <Heart className="w-3.5 h-3.5 fill-current" />
            {t('favorites') || 'المفضلة'}
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t('favoritesTitle') || 'قائمة المفضلة'}</h1>
          <p className="text-muted text-[0.88rem] mt-1">
            {t('favoritesSubtitle') || 'الكتب التي قمت بحفظها للرجوع إليها لاحقاً'}
          </p>
        </div>

        {favoriteBooks.length > 0 && (
          <span className="text-[0.88rem] text-muted self-start sm:self-auto bg-white border border-border px-4 py-2 rounded-xl">
            {t('itemsCount', { count: favoriteBooks.length }) || `${favoriteBooks.length} كتب`}
          </span>
        )}
      </div>

      {loading && favorites.length > 0 && favoriteBooks.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-sm font-medium">{t('loading') || 'جاري تحميل الكتب المفضلة…'}</p>
        </div>
      ) : favoriteBooks.length === 0 ? (
        <div className="bg-white border border-border/60 rounded-3xl p-12 lg:p-16 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <Heart className="w-10 h-10 text-brand-300" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{t('noFavorites') || 'قائمة المفضلة فارغة'}</h2>
          <p className="text-muted text-[0.88rem] max-w-sm mx-auto mb-6 leading-relaxed">
            {t('favoritesSubtitle') || 'لم تقم بإضافة أي كتب إلى المفضلة بعد. تصفح المتجر واضغط على زر القلب لحفظ كتبك المفضلة.'}
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-700 hover:bg-brand-800 text-white font-semibold rounded-xl transition-all shadow-md shadow-brand-700/20 text-[0.92rem]"
          >
            <span>{t('exploreShop') || 'تصفح المتجر'}</span>
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
                    {(() => {
                      const primaryImg = (() => {
                        if (Array.isArray(book.images) && book.images.length > 0) {
                          const obj = book.images.find(i => i.isPrimary) || book.images[0]
                          return typeof obj === 'string' ? obj : obj?.url
                        }
                        return book.image || null
                      })()

                      if (primaryImg) {
                        return (
                          <div className="aspect-[3/4] w-32 mx-auto overflow-hidden rounded-lg bg-surface-900 shadow-sm">
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
                              <BookCover book={book} size="md" className="mx-auto" />
                            </div>
                          </div>
                        )
                      }
                      return <BookCover book={book} size="md" className="mx-auto" />
                    })()}
                  </Link>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(book.id)}
                    className="absolute top-3 left-3 p-2 rounded-xl bg-white/90 text-red-500 hover:bg-white hover:text-red-600 shadow-sm transition-colors"
                    aria-label={t('close') || 'حذف'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {book.category && (
                      <span className="text-[0.72rem] font-semibold text-brand-600 mb-1 block">
                        {book.category}
                      </span>
                    )}
                    <Link
                      to={`/book/${book.id}`}
                      className="font-bold text-[0.92rem] text-foreground hover:text-brand-700 line-clamp-2 leading-snug transition-colors"
                    >
                      {book.title}
                    </Link>
                    {book.author && (
                      <p className="text-[0.78rem] text-muted mt-1">{book.author}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-brand-700 font-bold text-base">
                      {formatPrice(book.price)}
                    </span>

                    <button
                      type="button"
                      onClick={() => addToCart(book)}
                      disabled={outOfStock}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[0.8rem] font-semibold transition-colors ${
                        outOfStock
                          ? 'bg-[#F3F4F6] text-muted cursor-not-allowed'
                          : 'bg-brand-700 hover:bg-brand-800 text-white shadow-sm'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {outOfStock ? t('outOfStock') || 'غير متوفر' : t('addToCart') || 'أضف للسلة'}
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
