import { useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import useCategories from '../hooks/useCategories'

const DEFAULT_COLOR = '#6366f1'

export default function CategoryPills({ onSelect, includeAll = false }) {
  const [active, setActive] = useState(includeAll ? 'all' : null)
  const [scrollPos, setScrollPos] = useState(0)
  const { categories = [] } = useCategories()

  const handleSelect = (slug) => {
    if (onSelect) {
      onSelect(slug)
    }
    setActive((prev) => (prev === slug ? null : slug))
  }

  const handleScroll = (dir) => {
    const el = document.getElementById('category-scroll')
    if (!el) return
    const amount = 260
    el.scrollBy({ left: dir === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        id="category-scroll"
        className="category-scroll flex gap-2 overflow-x-auto pb-1 px-1"
        onScroll={(e) => setScrollPos(e.target.scrollLeft)}
      >
        {includeAll && (
          <button
            onClick={() => handleSelect('all')}
            style={
              active === 'all'
                ? { backgroundColor: DEFAULT_COLOR, color: '#ffffff', borderColor: DEFAULT_COLOR }
                : { color: DEFAULT_COLOR, borderColor: DEFAULT_COLOR, backgroundColor: 'transparent' }
            }
            className={`flex-shrink-0 px-4.5 py-2 text-[0.84rem] font-medium rounded-full border transition-all duration-300 hover:opacity-90 ${
              active === 'all' ? 'shadow-sm' : ''
            }`}
          >
            الكل
          </button>
        )}
        {categories.map((cat) => {
          const color = cat.color || DEFAULT_COLOR
          const isSelected = active === cat.slug
          return (
            <button
              key={cat.id}
              onClick={() => handleSelect(cat.slug)}
              style={
                isSelected
                  ? { backgroundColor: color, color: '#ffffff', borderColor: color }
                  : { color: color, borderColor: color, backgroundColor: 'transparent' }
              }
              className={`flex-shrink-0 px-4.5 py-2 text-[0.84rem] font-medium rounded-full border transition-all duration-300 hover:opacity-90 ${
                isSelected ? 'shadow-sm' : ''
              }`}
            >
              {cat.name}
            </button>
          )
        })}
      </div>
      {scrollPos > 0 && (
        <button
          onClick={() => handleScroll('prev')}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 bg-white rounded-full shadow-md"
          aria-label="السابق"
        >
          <ChevronRight className="w-4 h-4 text-brand-700" />
        </button>
      )}
      <button
        onClick={() => handleScroll('next')}
        className="absolute left-0 top-1/2 -translate-y-1/2 p-1 bg-white rounded-full shadow-md"
        aria-label="التالي"
      >
        <ChevronLeft className="w-4 h-4 text-brand-700" />
      </button>
    </div>
  )
}