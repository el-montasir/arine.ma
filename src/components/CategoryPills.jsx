import { useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import useCategories from '../hooks/useCategories'

// Deterministic 2D color palettes matching the design reference tokens
const CATEGORY_PALETTES = [
  {
    border: 'border-[rgba(31,157,132,0.4)]',
    text: 'text-[#1f9d84]',
    hover: 'hover:border-[#1f9d84] hover:bg-[#e4f6f1]/40',
    activeBg: 'bg-[#1f9d84]',
    activeBorder: 'border-[#1f9d84]',
  },
  {
    border: 'border-[rgba(214,70,127,0.35)]',
    text: 'text-[#d6467f]',
    hover: 'hover:border-[#d6467f] hover:bg-[#fbe7ef]/40',
    activeBg: 'bg-[#d6467f]',
    activeBorder: 'border-[#d6467f]',
  },
  {
    border: 'border-[rgba(139,47,158,0.3)]',
    text: 'text-[#8b2f9e]',
    hover: 'hover:border-[#8b2f9e] hover:bg-[#f3ebfa]/60',
    activeBg: 'bg-[#8b2f9e]',
    activeBorder: 'border-[#8b2f9e]',
  },
  {
    border: 'border-[rgba(201,147,47,0.4)]',
    text: 'text-[#c9932f]',
    hover: 'hover:border-[#c9932f] hover:bg-[#faf0da]/40',
    activeBg: 'bg-[#c9932f]',
    activeBorder: 'border-[#c9932f]',
  },
  {
    border: 'border-[rgba(76,22,96,0.35)]',
    text: 'text-[#4c1660]',
    hover: 'hover:border-[#4c1660] hover:bg-[#f3ebfa]/40',
    activeBg: 'bg-[#4c1660]',
    activeBorder: 'border-[#4c1660]',
  },
]

function getCategoryPalette(key) {
  const str = String(key || '')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % CATEGORY_PALETTES.length
  return CATEGORY_PALETTES[index]
}

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
          const palette = getCategoryPalette(cat.slug || cat.id || cat.name)
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelect(cat.slug)}
              className={`flex-none px-5 py-2.5 rounded-[20px] text-[13px] font-bold border-[1.5px] cursor-pointer whitespace-nowrap transition-all duration-150 active:scale-95 ${
                isSelected
                  ? `${palette.activeBg} text-white ${palette.activeBorder} shadow-sm`
                  : `bg-white ${palette.text} ${palette.border} ${palette.hover}`
              }`}
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