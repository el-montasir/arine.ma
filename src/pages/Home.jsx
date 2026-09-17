import { useNavigate } from 'react-router-dom'
import Hero from '../components/Hero'
import CategoryPills from '../components/CategoryPills'
import ProductGrid from '../components/ProductGrid'
import FeaturedBook from '../components/FeaturedBook'
import LibraryBanner from '../components/LibraryBanner'
import Newsletter from '../components/Newsletter'
import useProducts from '../hooks/useProducts'

export default function Home() {
  const navigate = useNavigate()
  const { books } = useProducts()
  const popularBooks = books.filter((b) => b.isPopular)
  const featuredBook = books.find((b) => b.id === 3) // Tafsir Ibn Kathir

  return (
    <>
      <Hero
        onExplore={() => navigate('/shop')}
        onBestsellers={() => navigate('/shop?sort=popular')}
      />

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

      {/* Featured Book */}
      <div className="mb-16">
        <FeaturedBook book={featuredBook} />
      </div>

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