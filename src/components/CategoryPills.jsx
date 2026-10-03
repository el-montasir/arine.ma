import { useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import useCategories from '../hooks/useCategories'
import { hexToRgba, getContrastTextColor } from '../utils/color'

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
    <div className="relative group/pills">
      <div
        id="category-scroll"
        className="category-scroll flex gap-2.5 overflow-x-auto pb-2 px-1 scroll-smooth"
        onScroll={(e) => setScrollPos(e.target.scrollLeft)}
      >
        {includeAll && (
          <button
            type="button"
            onClick={() => handleSelect('all')}
            className={`flex-none px-5 py-2.5 rounded-[20px] text-[13px] font-bold border-[1.5px] cursor-pointer whitespace-nowrap transition-all duration-150 active:scale-95 ${
              active === 'all'
                ? 'bg-[#8b2f9e] text-white border-[#8b2f9e] shadow-sm'
                : 'bg-white text-[#6b6577] border-[#ece5f2] hover:border-[#8b2f9e]/40 hover:text-[#161616]'
            }`}
          >
            الكل
          </button>
        )}
        {categories.map((cat) => {
          const isSelected = active === cat.slug
          const color = cat.color || '#8b2f9e'
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelect(cat.slug)}
              style={
                isSelected
                  ? {
                      backgroundColor: color,
                      borderColor: color,
                      color: getContrastTextColor(color),
                      boxShadow: `0 2px 10px -2px ${hexToRgba(color, 0.4)}`,
                    }
                  : {
                      backgroundColor: hexToRgba(color, 0.08),
                      borderColor: hexToRgba(color, 0.35),
                      color: color,
                    }
              }
              className="flex-none px-5 py-2.5 rounded-[20px] text-[13px] font-bold border-[1.5px] cursor-pointer whitespace-nowrap transition-all duration-150 active:scale-95 hover:opacity-90"
            >
              {cat.name}
            </button>
          )
        })}
      </div>
      {scrollPos > 0 && (
        <button
          type="button"
          onClick={() => handleScroll('prev')}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-md border border-[#ece5f2] hover:bg-white transition-all text-[#4c1660] z-10"
          aria-label="السابق"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => handleScroll('next')}
        className="absolute left-0 top-1/2 -translate-y-1/2 p-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-md border border-[#ece5f2] hover:bg-white transition-all text-[#4c1660] z-10"
        aria-label="التالي"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    </div>
  )
}