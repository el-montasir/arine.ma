import { hexToRgba, getContrastTextColor } from '../utils/color'
import useAmiriFont, { AMIRI } from '../hooks/useAmiriFont'

// Books header (Home page): title in Amiri (classic Naskh), live book count and the
// category chips.

// Arabic count agreement: كتاب واحد، كتابان، 3–10 كتب، 11+ كتاباً.
function booksCountLabel(n) {
  if (n === 0) return 'لا توجد كتب'
  if (n === 1) return 'كتاب واحد'
  if (n === 2) return 'كتابان'
  if (n >= 3 && n <= 10) return `${n} كتب`
  return `${n} كتاباً`
}

function Chips({ categories, category, onSelect, loading }) {
  const base =
    'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[0.8rem] font-bold transition-all hover:opacity-90'
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:justify-center sm:overflow-visible">
      <button
        type="button"
        onClick={() => onSelect('')}
        className={base}
        style={
          !category
            ? { backgroundColor: '#8b2f9e', borderColor: '#8b2f9e', color: '#fff' }
            : { color: '#6b6577', borderColor: '#e2d8ea', backgroundColor: '#fff' }
        }
      >
        الكل
      </button>
      {loading && categories.length === 0
        ? [76, 92, 64, 84].map((w) => (
            <span
              key={w}
              className="skeleton-shimmer h-[32px] shrink-0 rounded-full bg-[#efe7f4]"
              style={{ width: w }}
              aria-hidden="true"
            />
          ))
        : categories.map((cat) => {
            const color = cat.color || '#8b2f9e'
            const on = category === cat.slug
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat.slug)}
                className={base}
                style={
                  on
                    ? { backgroundColor: color, borderColor: color, color: getContrastTextColor(color) }
                    : { backgroundColor: hexToRgba(color, 0.08), borderColor: hexToRgba(color, 0.35), color }
                }
              >
                {cat.name}
              </button>
            )
          })}
    </div>
  )
}

// `showTitle` false: only the chips show (Books page). `headingTag` lets Home
// use an h2 under its own page h1.
export default function ShopHeader({
  title,
  count,
  loading,
  showLoading,
  categories,
  categoriesLoading,
  category,
  onCategory,
  showTitle = true,
  headingTag: Heading = 'h1',
}) {
  useAmiriFont()

  return (
    <div className="mb-7 text-center">
      {showTitle ? (
        <>
          <Heading className="text-[2.2rem] sm:text-[2.9rem] font-bold leading-[1.2] text-[#1C1220]" style={AMIRI}>
            {title}
          </Heading>
          <div className="mt-0.5 min-h-[1.6rem] text-[1.05rem] text-[#6B2178]" style={AMIRI}>
            {loading ? (
              <span
                className={`skeleton-shimmer inline-block h-3.5 w-24 rounded bg-[#efe7f4] align-middle transition-opacity duration-300 ${showLoading ? 'opacity-100' : 'opacity-0'}`}
                aria-hidden="true"
              />
            ) : (
              `${booksCountLabel(count)} بين يديك`
            )}
          </div>
        </>
      ) : (
        <Heading className="sr-only">{title}</Heading>
      )}
      <div className={showTitle ? 'mt-4' : ''}>
        <Chips categories={categories} category={category} onSelect={onCategory} loading={categoriesLoading} />
      </div>
    </div>
  )
}
