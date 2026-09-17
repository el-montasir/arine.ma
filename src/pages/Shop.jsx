import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, Grid3X3, LayoutList, Loader2, Info } from 'lucide-react'
import ProductGrid from '../components/ProductGrid'
import categories from '../data/categories'
import useProducts from '../hooks/useProducts'

const SORT_OPTIONS = [
  { value: 'popular', label: 'الأكثر شعبية' },
  { value: 'newest', label: 'الأحدث' },
  { value: 'price-asc', label: 'السعر: من الأقل' },
  { value: 'price-desc', label: 'السعر: من الأعلى' },
]

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileFilters, setMobileFilters] = useState(false)
  const [gridCols, setGridCols] = useState('4')

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

  const { books: filteredBooks, loading, error } = useProducts({ q, category, sort })

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          {category
            ? categories.find((c) => c.slug === category || c.name === category)?.name || 'الكتب'
            : q
              ? `نتائج البحث عن "${q}"`
              : 'جميع الكتب'}
        </h1>
        <p className="text-muted text-[0.85rem] mt-1 flex items-center gap-1.5">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {filteredBooks.length} كتاب
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-[0.82rem] rounded-xl">
          <Info className="w-4 h-4 flex-shrink-0" />
          تعذر الاتصال بالخادم — يتم عرض نسخة محلية من الكتالوج
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Filter toggle (mobile) */}
          <button
            onClick={() => setMobileFilters(!mobileFilters)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-xl text-[0.85rem] text-foreground/70 hover:border-brand-300 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            تصفية
          </button>

          {/* Category chips (desktop) */}
          <div className="hidden lg:flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('category', '')}
              className={`px-3.5 py-1.5 text-[0.82rem] font-medium rounded-full border transition-all ${
                !category
                  ? 'bg-brand-700 text-white border-brand-700'
                  : 'bg-white text-foreground/65 border-border hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              الكل
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter('category', cat.slug)}
                className={`px-3.5 py-1.5 text-[0.82rem] font-medium rounded-full border transition-all ${
                  category === cat.slug
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-foreground/65 border-border hover:border-brand-300 hover:text-brand-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setFilter('sort', e.target.value)}
            className="px-3 py-2.5 bg-white border border-border rounded-xl text-[0.85rem] text-foreground/80 outline-none focus:border-brand-400 transition-colors cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Grid toggle (desktop) */}
          <div className="hidden lg:flex items-center bg-white border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setGridCols('3')}
              className={`p-2.5 transition-colors ${gridCols === '3' ? 'bg-brand-100 text-brand-700' : 'text-muted hover:text-foreground'}`}
              aria-label="شبكة 3"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridCols('4')}
              className={`p-2.5 transition-colors ${gridCols === '4' ? 'bg-brand-100 text-brand-700' : 'text-muted hover:text-foreground'}`}
              aria-label="شبكة 4"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile filter panel */}
      {mobileFilters && (
        <div className="lg:hidden mb-6 p-4 bg-white border border-border rounded-xl">
          <h4 className="font-semibold text-[0.88rem] text-foreground mb-3">التصنيفات</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('category', '')}
              className={`px-3.5 py-2 text-[0.82rem] font-medium rounded-full border transition-all ${
                !category
                  ? 'bg-brand-700 text-white border-brand-700'
                  : 'bg-white text-foreground/65 border-border'
              }`}
            >
              الكل
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter('category', cat.slug)}
                className={`px-3.5 py-2 text-[0.82rem] font-medium rounded-full border transition-all ${
                  category === cat.slug
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-foreground/65 border-border'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product grid */}
      <ProductGrid books={filteredBooks} />
    </div>
  )
}