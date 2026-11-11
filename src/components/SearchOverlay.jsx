import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import api from '../utils/api'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice } from '../utils/format'
import { registerImageVariantsFromPayload } from '../lib/image-metadata'
import { getThumbnailImageProps, createVariantFallbackHandler } from '../utils/image-variants'
import { normalizeSearch, rank, FUZZY_THRESHOLD_WITH_EXACT } from '../utils/search'

const POPULAR_TERMS = ['صحيح البخاري', 'تفسير ابن كثير', 'رياض الصالحين', 'باقة طالب العلم']
const MAX_RESULTS = 8

// The catalog is small (tens of items), so it is loaded once per page visit
// and filtered in the browser: results update on every keystroke with no
// request per letter.
let catalogPromise = null
function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = Promise.all([api.get('/products'), api.get('/packages')]).then(([p, k]) => {
      const books = Array.isArray(p?.data) ? p.data : []
      const packages = Array.isArray(k?.data) ? k.data : []
      registerImageVariantsFromPayload(books)
      registerImageVariantsFromPayload(packages)
      return [
        ...books.map((b) => ({
          kind: 'book',
          id: b.id,
          title: b.title,
          subtitle: b.author,
          price: b.price,
          image: b.image,
          widths: b.imageVariantWidths,
          popular: b.isPopular,
          fields: [b.title, b.author, b.category, b.publisher].map(normalizeSearch),
        })),
        ...packages.map((pkg) => ({
          kind: 'package',
          id: pkg.id,
          title: pkg.title,
          subtitle: null,
          price: pkg.price,
          image: pkg.image,
          widths: pkg.imageVariantWidths,
          popular: pkg.isPopular,
          fields: [pkg.title, ...(pkg.books || []).map((b) => b.title)].map(normalizeSearch),
        })),
      ]
    })
    catalogPromise.catch(() => {
      catalogPromise = null
    })
  }
  return catalogPromise
}

export default function SearchOverlay({ onClose }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState(null)

  useEffect(() => {
    inputRef.current?.focus()
    let alive = true
    loadCatalog()
      .then((items) => alive && setCatalog(items))
      .catch(() => alive && setCatalog([]))
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      alive = false
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const q = normalizeSearch(query)
  const results = useMemo(() => {
    if (!q || !catalog) return []
    const ranked = catalog.map((item) => ({ item, ...rank(item, q) })).filter((x) => x.r >= 0)
    const hasExact = ranked.some((x) => x.r < 4)
    return ranked
      .filter((x) => x.r < 4 || !hasExact || x.score >= FUZZY_THRESHOLD_WITH_EXACT)
      .sort((a, b) => a.r - b.r || b.score - a.score || Number(b.item.popular) - Number(a.item.popular))
      .map((x) => ({ ...x.item, fuzzy: x.r === 4 }))
  }, [q, catalog])

  const goToShop = (term) => {
    onClose()
    navigate(`/shop?q=${encodeURIComponent(term)}`)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) goToShop(query.trim())
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[600px] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-gray-100 px-4">
          <Search className="w-5 h-5 text-gray-400 mx-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            placeholder={t('searchPlaceholder') || 'ابحث عن كتاب، مؤلف، أو باقة...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 py-4 text-[0.95rem] text-foreground placeholder:text-gray-400 outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-purple-800 transition-colors"
            aria-label={t('close') || 'إغلاق'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!q ? (
          <div className="px-5 py-4">
            <p className="text-[0.78rem] text-muted mb-3">{t('popularSearches') || 'عمليات البحث الشائعة'}</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TERMS.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="px-3 py-1.5 bg-purple-50 text-purple-800 text-[0.8rem] rounded-full hover:bg-purple-100 transition-colors font-medium cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : !catalog ? (
          <div className="px-5 py-6 flex justify-center" aria-hidden="true">
            <div className="w-6 h-6 rounded-full border-2 border-[#8b2f9e]/20 border-t-[#8b2f9e] animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <p className="px-5 py-6 text-center text-[0.88rem] text-muted">
            {t('searchNoResults', { q: query.trim() })}
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            {results[0].fuzzy && (
              <p className="px-5 pt-3 text-[0.78rem] text-muted">{t('searchClosest') || 'أقرب النتائج لبحثك'}</p>
            )}
            <ul className="py-1.5">
              {results.slice(0, MAX_RESULTS).map((item) => {
                const img = getThumbnailImageProps(item.image, item.widths)
                return (
                  <li key={`${item.kind}-${item.id}`}>
                    <Link
                      to={item.kind === 'book' ? `/book/${item.id}` : `/package/${item.id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50/70 transition-colors"
                    >
                      <div className="w-11 h-14 flex-shrink-0 rounded-md overflow-hidden bg-[#efe7f3]">
                        {img.src && (
                          <img
                            src={img.src}
                            srcSet={img.srcSet}
                            sizes="44px"
                            alt=""
                            loading="lazy"
                            decoding="async"
                            onError={createVariantFallbackHandler(img.fallbackSrc)}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.9rem] font-semibold text-foreground truncate">{item.title}</p>
                        <p className="text-[0.76rem] text-muted truncate">
                          {item.kind === 'package' ? t('packages') || 'الباقات' : item.subtitle}
                        </p>
                      </div>
                      <span className="text-[0.82rem] font-bold text-purple-800 whitespace-nowrap">
                        {formatPrice(item.price)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            {results.length > MAX_RESULTS && (
              <button
                type="submit"
                className="w-full py-3 border-t border-gray-100 text-[0.85rem] font-semibold text-purple-800 hover:bg-purple-50 transition-colors"
              >
                {t('searchSeeAll') || 'عرض كل النتائج'} ({results.length})
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
