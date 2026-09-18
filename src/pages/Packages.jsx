import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package as PackageIcon, Loader2, Info } from 'lucide-react'
import PackageCard from '../components/PackageCard'
import usePackages from '../hooks/usePackages'
import { useLanguage } from '../context/LanguageContext'

export default function Packages() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useLanguage()

  const q = searchParams.get('q') || ''
  const sort = searchParams.get('sort') || 'popular'

  const SORT_OPTIONS = [
    { value: 'popular', label: t('sortPopular') || 'الأكثر طلباً' },
    { value: 'newest', label: t('sortNewest') || 'الأحدث' },
    { value: 'price-asc', label: t('sortPriceAsc') || 'السعر: من الأقل للأعلى' },
    { value: 'price-desc', label: t('sortPriceDesc') || 'السعر: من الأعلى للأقل' },
  ]

  const setFilter = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (!value) {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      return next
    })
  }

  const { packages, loading, error } = usePackages({ search: q, sort })

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-2">
            <PackageIcon className="w-3.5 h-3.5" />
            <span>{t('curatedPackages') || 'مجموعات وباقات مختارة'}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            {q ? `${t('search')}: "${q}"` : (t('packagesTitle') || 'باقات الكتب الشرعية')}
          </h1>
          <p className="text-muted text-sm mt-1">
            {t('packagesSubtitle') || 'مجموعات متميزة من أمهات الكتب بتخفيضات خاصة وشحن ميسر'}
          </p>
        </div>

        {/* Sort & Count */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <span className="text-xs text-muted flex items-center gap-1.5 whitespace-nowrap">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t('packagesCount', { count: packages.length })}
          </span>

          <select
            value={sort}
            onChange={(e) => setFilter('sort', e.target.value)}
            className="px-3 py-2 bg-white border border-border rounded-xl text-xs text-foreground/80 outline-none focus:border-brand-400 transition-colors cursor-pointer shadow-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl">
          <Info className="w-4 h-4 flex-shrink-0" />
          {t('errorOccurred') || 'حدث خطأ أثناء تحميل الباقات'}
        </div>
      )}

      {/* Package Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-96 rounded-2xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-border my-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
            <PackageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            {t('noPackagesFound') || 'لا توجد باقات حالياً'}
          </h3>
          <p className="text-sm text-muted max-w-md mx-auto">
            {t('noPackagesDesc') || 'تابعنا قريباً لإطلاق باقات حصرية ومميزة في شتى العلوم الشرعية.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </div>
  )
}
