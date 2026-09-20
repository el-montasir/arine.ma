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
    <article className="group bg-white rounded-2xl border border-border/70 hover:border-brand-300 transition-all duration-300 hover:shadow-xl hover:shadow-brand-900/5 hover:-translate-y-1 overflow-hidden flex flex-col h-full">
      {/* Visual Header / Cover */}
      <Link to={`/package/${pkg.id}`} className="block relative overflow-hidden bg-gradient-to-br from-brand-900/5 to-brand-700/10 p-6 flex items-center justify-center min-h-[220px]">
        {pkg.image ? (
          <img
            src={pkg.image}
            alt={pkg.title}
            className="w-full h-48 object-cover rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-brand-800/70 p-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-700/10 flex items-center justify-center mb-3 shadow-inner">
              <PackageIcon className="w-8 h-8 text-brand-700" />
            </div>
            <span className="text-xs font-semibold text-brand-800">{t('package') || 'باقة مميزة'}</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          {Number.isFinite(pkg.discount) && pkg.discount > 0 && pkg.discount <= 100 && (
            <span className="bg-brand-700 text-white text-[0.72rem] font-bold px-2.5 py-0.5 rounded-lg shadow-sm">
              {t('saveDiscount', { percent: Math.round(pkg.discount) })}
            </span>
          )}
          {pkg.isNew && (
            <span className="bg-emerald-600 text-white text-[0.72rem] font-bold px-2.5 py-0.5 rounded-lg shadow-sm">
              {t('newBadge')}
            </span>
          )}
          {outOfStock && (
            <span className="bg-zinc-600 text-white text-[0.72rem] font-bold px-2.5 py-0.5 rounded-lg shadow-sm">
              {t('outOfStock')}
            </span>
          )}
        </div>

        {/* Books count tag */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm text-brand-900 text-xs font-semibold px-2.5 py-1 rounded-lg border border-brand-100 shadow-sm flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-brand-700" />
          <span>{formatBookCount(booksCount, language)}</span>
        </div>
      </Link>

      {/* Package Content & Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <Link
            to={`/package/${pkg.id}`}
            className="block font-bold text-lg text-foreground leading-snug hover:text-brand-700 transition-colors line-clamp-2"
          >
            {pkg.title}
          </Link>

          {pkg.description && (
            <p className="mt-2 text-xs text-muted line-clamp-2 leading-relaxed">
              {pkg.description}
            </p>
          )}

          {/* Included Books Preview */}
          {pkg.books && pkg.books.length > 0 && (
            <div className="mt-3.5 pt-3 border-t border-border/50">
              <p className="text-[11px] font-semibold text-foreground/70 mb-1.5 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-brand-600" />
                {t('packageIncludes') || 'تتضمن الباقة:'}
              </p>
              <ul className="space-y-1">
                {pkg.books.slice(0, 3).map((book) => (
                  <li key={book.id} className="text-xs text-muted truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                    <span className="truncate">{book.title}</span>
                  </li>
                ))}
                {pkg.books.length > 3 && (
                  <li className="text-[11px] text-brand-700 font-medium">
                    +{formatBookCount(pkg.books.length - 3, language)} {language === 'ar' ? 'أخرى' : 'more'}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Pricing & CTA */}
        <div className="mt-5 pt-3.5 border-t border-border/60">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-brand-700 font-extrabold text-xl">{formatPrice(pkg.price)}</span>
              {pkg.oldPrice && pkg.oldPrice > pkg.price && (
                <span className="text-muted/60 text-xs line-through">{formatPrice(pkg.oldPrice)}</span>
              )}
            </div>
            {pkg.sumBooksPrice && pkg.sumBooksPrice > pkg.price && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                {t('saving') || 'توفير'} {formatPrice(pkg.sumBooksPrice - pkg.price)}
              </span>
            )}
          </div>

          <button
            onClick={() => addPackageToCart(pkg)}
            disabled={outOfStock}
            className={`w-full py-2.5 rounded-xl transition-all font-medium text-xs flex items-center justify-center gap-2 shadow-sm ${
              outOfStock
                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200'
                : 'bg-brand-700 hover:bg-brand-800 text-white active:scale-[0.98]'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {outOfStock ? (t('outOfStock') || 'غير متوفر') : (t('addPackageToCart') || 'إضافة الباقة للسلة')}
          </button>
        </div>
      </div>
    </article>
  )
}
