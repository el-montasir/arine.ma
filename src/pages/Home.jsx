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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-[#4c1660] to-[#8b2f9e] border border-[#8b2f9e]/30 p-5 text-white flex flex-col sm:flex-row items-center gap-4 justify-between shadow-md"
              >
                {banner.image && (
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="h-20 w-32 object-cover rounded-xl shrink-0 border border-white/20"
                  />
                )}
                <div className="flex-1 text-right">
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-full mb-1.5">
                    <Megaphone className="h-3 w-3" />
                    عرض خاص
                  </div>
                  <h3 className="font-tajawal font-bold text-base text-white">{banner.title}</h3>
                  {banner.description && (
                    <p className="text-xs text-white/85 mt-1 line-clamp-2 leading-relaxed">
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#4c1660] hover:bg-[#FAF9F7] text-xs font-bold rounded-xl transition-all shrink-0 shadow-sm"
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
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-10">
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
          viewAllLink="/shop"
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
    { name: 'القرآن وعلومه', gradient: 'from-[#1f9d84] to-[#126353]', icon: '📖' },
    { name: 'الحديث', gradient: 'from-[#3b82f6] to-[#1d4ed8]', icon: '📜' },
    { name: 'الفقه', gradient: 'from-[#c9932f] to-[#926417]', icon: '⚖️' },
    { name: 'العقيدة', gradient: 'from-[#8b2f9e] to-[#4c1660]', icon: '🛡️' },
  ]

  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
      <div className="mb-6">
        <h2 className="font-tajawal font-extrabold text-2xl sm:text-[26px] text-[#161616] tracking-tight m-0">
          تصفّح التصنيفات
        </h2>
        <p className="text-[#6b6577] text-[13px] mt-1 m-0">
          استكشف مختلف الفنون والعلوم الشرعية والمعرفية
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4">
        {categoryThemes.map((cat) => (
          <button
            key={cat.name}
            type="button"
            onClick={() => navigate(`/shop?category=${encodeURIComponent(cat.name)}`)}
            className={`group relative overflow-hidden bg-gradient-to-br ${cat.gradient} text-white rounded-[18px] p-5 sm:p-6 text-right transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 cursor-pointer border border-white/10`}
          >
            <div className="absolute top-3 left-3 text-3xl sm:text-4xl opacity-75 transition-transform group-hover:scale-110">
              {cat.icon}
            </div>
            <h3 className="font-tajawal font-bold text-base sm:text-lg text-white relative">
              {cat.name}
            </h3>
            <p className="text-xs text-white/80 mt-1 relative font-medium">
              استكشف الكتب ←
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
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mb-16">
      <div className="flex items-end justify-between mb-8 border-b border-[#ece5f2] pb-4 flex-wrap gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3ebfa] border border-[#8b2f9e]/20 text-[#8b2f9e] text-xs font-bold mb-2">
            <PackageIcon className="w-3.5 h-3.5" />
            <span>{t('curatedPackages') || 'باقات مختارة'}</span>
          </div>
          <h2 className="font-tajawal font-extrabold text-2xl sm:text-[26px] text-[#161616]">
            {t('packagesTitle') || 'باقات الكتب'}
          </h2>
          <p className="text-[#6b6577] text-xs sm:text-[13.5px] mt-1">
            {t('packagesSubtitle') || 'باقات مختارة تجمع لك مجموعة متميزة من أمهات الكتب بتخفيضات حصرية'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/packages')}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#8b2f9e] hover:text-[#4c1660] transition-colors cursor-pointer"
        >
          <span>{t('viewAllPackages') || 'عرض جميع الباقات'}</span>
          {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
        {displayedPackages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>

      <div className="sm:hidden text-center mt-6">
        <button
          type="button"
          onClick={() => navigate('/packages')}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#f3ebfa] border border-[#8b2f9e]/20 text-[#8b2f9e] hover:bg-[#8b2f9e]/10 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          <span>{t('viewAllPackages') || 'عرض جميع الباقات'}</span>
          {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </section>
  )
}

