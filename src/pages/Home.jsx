import { useNavigate } from 'react-router-dom'
import Hero from '../components/Hero'
import CategoryPills from '../components/CategoryPills'
import ProductGrid from '../components/ProductGrid'
import FeaturedBook from '../components/FeaturedBook'
import LibraryBanner from '../components/LibraryBanner'
import Newsletter from '../components/Newsletter'
import PackageCard from '../components/PackageCard'
import useProducts from '../hooks/useProducts'
import usePackages from '../hooks/usePackages'
import { useStoreConfig } from '../hooks/useStoreConfig'
import { useBanners } from '../hooks/useBanners'
import { useLanguage } from '../context/LanguageContext'
import { Megaphone, ArrowLeft, ArrowRight, Package as PackageIcon } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const { books } = useProducts()
  const { config } = useStoreConfig()
  const { banners } = useBanners('promotional')

  const popularBooks = books.filter((b) => b.isPopular)
  const featuredId = config?.homepage?.featuredBookId || 3
  const featuredBook = books.find((b) => b.id === featuredId) || books[0]

  return (
    <>
      <Hero
        heroConfig={config?.hero}
        onExplore={() => navigate('/shop')}
        onBestsellers={() => navigate('/shop?sort=popular')}
      />

      {/* Promotional Banners Carousel / Grid (if active) */}
      {banners && banners.length > 0 && (
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 mt-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900 to-ink-900 border border-brand-800/40 p-5 text-white flex flex-col sm:flex-row items-center gap-4 justify-between shadow-sm"
              >
                {banner.image && (
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="h-20 w-32 object-cover rounded-xl shrink-0"
                  />
                )}
                <div className="flex-1 text-right">
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-300 bg-brand-800/60 px-2 py-0.5 rounded-md mb-1.5">
                    <Megaphone className="h-3 w-3" />
                    عرض خاص
                  </div>
                  <h3 className="font-bold text-sm text-white">{banner.title}</h3>
                  {banner.description && (
                    <p className="text-xs text-white/80 mt-1 line-clamp-2">
                      {banner.description}
                    </p>
                  )}
                </div>
                {banner.link && (
                  <button
                    onClick={() => {
                      if (banner.link.startsWith('http')) {
                        window.open(banner.link, '_blank')
                      } else {
                        navigate(banner.link)
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-brand-900 hover:bg-brand-50 text-xs font-bold rounded-xl transition-colors shrink-0"
                  >
                    <span>استفد من العرض</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category pills */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 mt-6 mb-10">
        <CategoryPills
          includeAll
          onSelect={(slug) =>
            navigate(slug === 'all' ? '/shop' : `/shop?category=${slug}`)
          }
        />
      </div>

      {/* Popular Books */}
      <div className="mb-16">
        <ProductGrid
          books={popularBooks}
          title="الكتب الأكثر طلباً"
          subtitle="الأكثر مبيعاً واستحساناً من قرائنا"
        />
      </div>

      {/* Category Section */}
      <CategorySection />

      {/* Curated Packages */}
      <CuratedPackagesSection />

      {/* Featured Book */}
      {featuredBook && (
        <div className="mb-16">
          <FeaturedBook book={featuredBook} />
        </div>
      )}

      {/* Virtual Library Banner */}
      <div className="mb-16">
        <LibraryBanner />
      </div>

      {/* Newsletter */}
      <div className="mb-16">
        <Newsletter />
      </div>
    </>
  )
}

function CategorySection() {
  const navigate = useNavigate()
  const categoryThemes = [
    { name: 'القرآن وعلومه', gradient: 'from-emerald-600 to-emerald-800', icon: '📖' },
    { name: 'الحديث', gradient: 'from-blue-600 to-blue-800', icon: '📜' },
    { name: 'الفقه', gradient: 'from-amber-600 to-amber-800', icon: '⚖️' },
    { name: 'العقيدة', gradient: 'from-brand-600 to-brand-800', icon: '🛡️' },
  ]

  return (
    <section className="max-w-[1440px] mx-auto px-4 lg:px-8 mb-16">
      <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-6">تصفّح التصنيفات</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {categoryThemes.map((cat) => (
          <button
            key={cat.name}
            onClick={() => navigate(`/shop?category=${encodeURIComponent(cat.name)}`)}
            className={`group relative overflow-hidden bg-gradient-to-br ${cat.gradient} text-white rounded-2xl p-5 lg:p-6 text-right hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5`}
          >
            <div className="absolute top-3 left-3 text-3xl lg:text-4xl opacity-80 transition-transform group-hover:scale-110">
              {cat.icon}
            </div>
            <h3 className="text-[0.95rem] lg:text-lg font-bold relative">{cat.name}</h3>
            <p className="text-[0.72rem] text-white/75 mt-1 relative">
              استكشف الكتب
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}

function CuratedPackagesSection() {
  const navigate = useNavigate()
  const { t, isRTL } = useLanguage()
  const { packages, loading } = usePackages()

  if (loading || !packages || packages.length === 0) return null

  const displayedPackages = packages.slice(0, 4)

  return (
    <section className="max-w-[1440px] mx-auto px-4 lg:px-8 mb-16">
      <div className="flex items-end justify-between mb-8 border-b border-border pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-2">
            <PackageIcon className="w-3.5 h-3.5" />
            <span>{t('curatedPackages') || 'باقات مختارة'}</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-foreground">
            {t('packagesTitle') || 'باقات الكتب'}
          </h2>
          <p className="text-muted text-xs lg:text-sm mt-1">
            {t('packagesSubtitle') || 'باقات مختارة تجمع لك مجموعة متميزة من أمهات الكتب بتخفيضات حصرية'}
          </p>
        </div>
        <button
          onClick={() => navigate('/packages')}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800 transition-colors"
        >
          <span>{t('viewAllPackages') || 'عرض جميع الباقات'}</span>
          {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedPackages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>

      <div className="sm:hidden text-center mt-6">
        <button
          onClick={() => navigate('/packages')}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 text-xs font-bold rounded-xl transition-colors"
        >
          <span>{t('viewAllPackages') || 'عرض جميع الباقات'}</span>
          {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </section>
  )
}

