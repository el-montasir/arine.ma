import { useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import categories from '../data/categories'

export default function CategoryPills({ onSelect, includeAll = false }) {
  const [active, setActive] = useState(includeAll ? 'all' : null)
  const [scrollPos, setScrollPos] = useState(0)

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
            className={`flex-shrink-0 px-4.5 py-2 text-[0.84rem] font-medium rounded-full border transition-all duration-300 ${
              active === 'all'
                ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                : 'bg-white text-foreground/70 border-border hover:border-brand-300 hover:text-brand-700'
            }`}
          >
            الكل
          </button>
        )}
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat.slug)}
            className={`flex-shrink-0 px-4.5 py-2 text-[0.84rem] font-medium rounded-full border transition-all duration-300 ${
              active === cat.slug
                ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                : 'bg-white text-foreground/70 border-border hover:border-brand-300 hover:text-brand-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
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