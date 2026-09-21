import { Link } from 'react-router-dom'
import { ShoppingCart, Package as PackageIcon, BookOpen } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice, formatBookCount } from '../utils/format'

export default function PackageCard({ pkg }) {
  const { addPackageToCart } = useCart()
  const { t, language } = useLanguage()
  const outOfStock = pkg.availability === 'out-of-stock'
  const booksCount = pkg.booksCount || pkg.books?.length || 0

  return (
    <article className="group bg-white rounded-[18px] border border-[#ece5f2] hover:border-[#8b2f9e]/30 transition-all duration-200 hover:shadow-[0_18px_34px_-20px_rgba(76,22,96,0.25)] hover:-translate-y-1 overflow-hidden flex flex-col h-full">
      {/* Visual Header / Cover */}
      <Link to={`/package/${pkg.id}`} className="block relative overflow-hidden bg-gradient-to-br from-[#e7dcef] to-[#cfc0dd] p-5 flex items-center justify-center min-h-[200px]">
        {pkg.image ? (
          <img
            src={pkg.image}
            alt={pkg.title}
            className="w-full h-44 object-cover rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-[#4c1660] p-4">
            <div className="w-14 h-14 rounded-2xl bg-white/40 backdrop-blur-sm flex items-center justify-center mb-2.5 shadow-xs">
              <PackageIcon className="w-7 h-7 text-[#8b2f9e]" />
            </div>
            <span className="text-xs font-bold text-[#4c1660]">{t('package') || 'باقة مميزة'}</span>
          </div>
        )}

        {/* Badges */}
        <div
          className="absolute top-2.5 flex flex-col gap-1.5 z-10"
          style={{ insetInlineEnd: '10px' }}
        >
          {Number.isFinite(pkg.discount) && pkg.discount > 0 && pkg.discount <= 100 && (
            <span className="bg-gradient-to-r from-[#8b2f9e] to-[#4c1660] text-white text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-[20px] shadow-xs">
              {t('saveDiscount', { percent: Math.round(pkg.discount) })}
            </span>
          )}
          {pkg.isNew && (
            <span className="bg-[#1f9d84] text-white text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-[20px] shadow-xs">
              {t('newBadge')}
            </span>
          )}
          {outOfStock && (
            <span className="bg-zinc-600 text-white text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-[20px] shadow-xs">
              {t('outOfStock')}
            </span>
          )}
        </div>

        {/* Books count tag */}
        <div
          className="absolute bottom-2.5 bg-white/95 backdrop-blur-sm text-[#4c1660] text-xs font-bold px-2.5 py-1 rounded-lg border border-[#ece5f2] shadow-xs flex items-center gap-1.5"
          style={{ insetInlineStart: '10px' }}
        >
          <BookOpen className="w-3.5 h-3.5 text-[#8b2f9e]" />
          <span>{formatBookCount(booksCount, language)}</span>
        </div>
      </Link>

      {/* Package Content & Details */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <Link
            to={`/package/${pkg.id}`}
            className="block font-bold text-base sm:text-[17px] text-[#161616] leading-snug hover:text-[#8b2f9e] transition-colors line-clamp-2"
          >
            {pkg.title}
          </Link>

          {pkg.description && (
            <p className="mt-1.5 text-xs text-[#6b6577] line-clamp-2 leading-relaxed">
              {pkg.description}
            </p>
          )}

          {/* Included Books Preview */}
          {pkg.books && pkg.books.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#ece5f2]">
              <p className="text-[11px] font-bold text-[#161616]/70 mb-1.5 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-[#8b2f9e]" />
                {t('packageIncludes') || 'تتضمن الباقة:'}
              </p>
              <ul className="space-y-1">
                {pkg.books.slice(0, 3).map((book) => (
                  <li key={book.id} className="text-xs text-[#6b6577] truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8b2f9e] shrink-0" />
                    <span className="truncate">{book.title}</span>
                  </li>
                ))}
                {pkg.books.length > 3 && (
                  <li className="text-[11px] text-[#8b2f9e] font-bold">
                    +{formatBookCount(pkg.books.length - 3, language)} {language === 'ar' ? 'أخرى' : 'more'}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Pricing & CTA */}
        <div className="mt-4 pt-3 border-t border-[#ece5f2]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-baseline gap-2">
              <span className="font-tajawal font-extrabold text-lg sm:text-xl text-[#161616]">
                {formatPrice(pkg.price)}
              </span>
              {pkg.oldPrice && pkg.oldPrice > pkg.price && (
                <span className="text-[#6b6577] text-xs line-through">{formatPrice(pkg.oldPrice)}</span>
              )}
            </div>
            {pkg.sumBooksPrice && pkg.sumBooksPrice > pkg.price && (
              <span className="text-[11px] font-bold text-[#1f9d84] bg-[#e4f6f1] border border-[#1f9d84]/30 px-2 py-0.5 rounded-md">
                {t('saving') || 'توفير'} {formatPrice(pkg.sumBooksPrice - pkg.price)}
              </span>
            )}
          </div>

          <button
            onClick={() => addPackageToCart(pkg)}
            disabled={outOfStock}
            className={`w-full py-2.5 rounded-xl transition-all font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
              outOfStock
                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200'
                : 'bg-gradient-to-r from-[#8b2f9e] to-[#4c1660] hover:from-[#7c288d] hover:to-[#3e1150] text-white active:scale-[0.98]'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{outOfStock ? (t('outOfStock') || 'غير متوفر') : (t('addPackageToCart') || 'إضافة الباقة للسلة')}</span>
          </button>
        </div>
      </div>
    </article>
  )
}
