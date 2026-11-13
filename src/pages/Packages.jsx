import { useSearchParams } from 'react-router-dom'
import { Package as PackageIcon, Info } from 'lucide-react'
import PackageCard from '../components/PackageCard'
import usePackages from '../hooks/usePackages'
import { useLanguage } from '../context/LanguageContext'
import useDelayedFlag from '../hooks/useDelayedFlag'
import useAmiriFont, { AMIRI } from '../hooks/useAmiriFont'

// Arabic count agreement: باقة واحدة، باقتان، 3–10 باقات، 11+ باقةً.
function packagesCountLabel(n) {
  if (n === 0) return 'لا توجد باقات'
  if (n === 1) return 'باقة واحدة'
  if (n === 2) return 'باقتان'
  if (n >= 3 && n <= 10) return `${n} باقات`
  return `${n} باقةً`
}

export default function Packages() {
  const [searchParams] = useSearchParams()
  const { t } = useLanguage()

  const q = searchParams.get('q') || ''
  const sort = searchParams.get('sort') || 'popular'

  const { packages, loading, error } = usePackages({ search: q, sort })
  const showLoading = useDelayedFlag(loading)
  useAmiriFont()

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
      {/* Header: same Amiri treatment as the Home books section */}
      <div className="mb-8 text-center">
        <h1 className="text-[2.2rem] sm:text-[2.9rem] font-bold leading-[1.2] text-[#1C1220]" style={AMIRI}>
          {q ? `${t('search')}: "${q}"` : t('packagesTitle') || 'باقات الكتب'}
        </h1>
        <div className="mt-0.5 min-h-[1.6rem] text-[1.05rem] text-[#6B2178]" style={AMIRI}>
          {loading ? (
            <span
              className={`skeleton-shimmer inline-block h-3.5 w-24 rounded bg-[#efe7f4] align-middle transition-opacity duration-300 ${showLoading ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden="true"
            />
          ) : (
            `${packagesCountLabel(packages.length)} بين يديك`
          )}
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
