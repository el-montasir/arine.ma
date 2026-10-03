import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Package as PackageIcon } from 'lucide-react'
import PromoBanner from '../components/PromoBanner'
import CategoryPills from '../components/CategoryPills'
import ProductCard from '../components/ProductCard'
import FeaturedBook from '../components/FeaturedBook'
import LibraryBanner from '../components/LibraryBanner'
import Newsletter from '../components/Newsletter'
import PackageCard from '../components/PackageCard'
import useProducts from '../hooks/useProducts'
import usePackages from '../hooks/usePackages'
import { useStoreConfig } from '../hooks/useStoreConfig'
import { useBanners } from '../hooks/useBanners'
import { useLanguage } from '../context/LanguageContext'

export default function Home() {
  const navigate = useNavigate()
  const { books = [], loading: productsLoading } = useProducts()
  const { config } = useStoreConfig()
  const { banners } = useBanners('promotional')
  const { t } = useLanguage()

  const [showAllBooks, setShowAllBooks] = useState(false)
  const booksSectionRef = useRef(null)

  const popularBooks = books.filter((b) => b.isPopular)
  const initialBooks = popularBooks.length > 0 ? popularBooks : books.slice(0, 8)
  const remainingBooks = books.filter((b) => !initialBooks.some((ib) => ib.id === b.id))
  const hasMoreBooks = remainingBooks.length > 0
  const displayedBooks = showAllBooks ? [...initialBooks, ...remainingBooks] : initialBooks

  const featuredId = config?.homepage?.featuredBookId || 3
  const featuredBook = books.find((b) => b.id === featuredId) || books[0]

  const handleShowMore = () => {
    setShowAllBooks(true)
  }

  const handleShowLess = () => {
    setShowAllBooks(false)
    if (booksSectionRef.current) {
      booksSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <>
      {/*
        Compact promotional banner, in the space the old large hero occupied.

        The old hero also carried the page's only <h1>. Removing it would leave
        this document with no top-level heading, so the store's own name is
        rendered here as a visually-hidden <h1> — it keeps the heading structure
        intact at zero visual cost, and avoids promoting rotating marketing copy
        to be the site's identity.
      */}
      <h1 className="sr-only">{config?.store?.name || 'arine'}</h1>

      {/* Existing promotional banners (type: promotional), presented as one compact band */}
      {banners && banners.length > 0 && (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((banner) => (
              <PromoBanner key={banner.id} banner={banner} onNavigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {/* Category pills */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-10">
        <CategoryPills
          includeAll
          onSelect={(slug) =>
            navigate(slug === 'all' ? '/shop' : `/shop?category=${encodeURIComponent(slug)}`)
          }
        />
      </div>

      {/* Books Grid with Inline Expand / Collapse */}
      <section ref={booksSectionRef} className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mb-16 scroll-mt-20">
        <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
          <div>
            <h2 className="font-tajawal font-extrabold text-2xl sm:text-[26px] text-[#161616] tracking-tight m-0">
              {t('popularBooks') || 'الكتب الأكثر طلباً'}
            </h2>
            <p className="text-[#6b6577] text-[13px] mt-1 m-0">
              {t('popularBooksSubtitle') || 'الأكثر مبيعاً واستحساناً من قرائنا'}
            </p>
          </div>
        </div>

        {displayedBooks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {displayedBooks.map((book, index) => {
              const isNewlyRevealed = showAllBooks && index >= initialBooks.length
              return (
                <div
                  key={book.id}
                  className={
                    isNewlyRevealed
                      ? 'animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none'
                      : ''
                  }
                >
                  <ProductCard book={book} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-[#6b6577] text-sm">
              {productsLoading ? (t('loading') || 'جارِ التحميل...') : (t('noBooksFound') || 'لا توجد كتب متاحة حالياً')}
            </p>
          </div>
        )}

        {/* Initial Centered Show All button - disappears upon expansion */}
        {!showAllBooks && hasMoreBooks && (
          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={handleShowMore}
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-white border border-[#8b2f9e]/25 text-[#8b2f9e] hover:bg-[#8b2f9e] hover:text-white font-bold text-sm shadow-xs hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer group"
            >
              <span>{t('viewAll') || 'عرض الكل'}</span>
              <ChevronDown className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
            </button>
          </div>
        )}

        {/* Show Less button - appears only after the final book when expanded */}
        {showAllBooks && hasMoreBooks && (
          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={handleShowLess}
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-white border border-[#8b2f9e]/25 text-[#8b2f9e] hover:bg-[#8b2f9e] hover:text-white font-bold text-sm shadow-xs hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer group"
            >
              <span>{t('viewLess') || 'عرض أقل'}</span>
              <ChevronUp className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
            </button>
          </div>
        )}
      </section>

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
