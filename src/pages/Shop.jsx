import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Info } from 'lucide-react'
import ProductGrid from '../components/ProductGrid'
import useCategories from '../hooks/useCategories'
import useProducts from '../hooks/useProducts'
import useDelayedFlag from '../hooks/useDelayedFlag'
import { searchBooks } from '../utils/search'
import ShopHeader from '../components/ShopHeader'
import { useLanguage } from '../context/LanguageContext'

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { categories = [], loading: categoriesLoading } = useCategories()
  const { t } = useLanguage()

  const q = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const sort = searchParams.get('sort') || 'popular'

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

  // Search runs in the browser over the (cached) list, with the same typo- and
  // Arabic-spelling-tolerant matching as the search overlay.
  const { books, loading, error } = useProducts({ category, sort })
  const filteredBooks = useMemo(() => (q ? searchBooks(books, q) : books), [books, q])
  const showLoading = useDelayedFlag(loading)

  const pageTitle = category
    ? categories.find((c) => c.slug === category || c.name === category)?.name || t('books')
    : q
      ? `${t('search')}: "${q}"`
      : t('exploreBooks')

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
      <ShopHeader
        title={pageTitle}
        count={filteredBooks.length}
        loading={loading}
        showLoading={showLoading}
        categories={categories}
        categoriesLoading={categoriesLoading}
        category={category}
        onCategory={(slug) => setFilter('category', slug)}
        showTitle={false}
      />

      {error && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-[0.82rem] rounded-xl">
          <Info className="w-4 h-4 flex-shrink-0" />
          {t('errorOccurred')}
        </div>
      )}

      {/* Product grid */}
      <ProductGrid books={filteredBooks} loading={loading} />
    </div>
  )
}
