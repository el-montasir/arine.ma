import { useEffect, useMemo, useState } from 'react'
import api from '../utils/api'
import localBooks from '../data/books'
import localCategories from '../data/categories'

// Client-side copy of the server filter/sort logic — used ONLY as a fallback
// while the API is unreachable, so the store never shows a blank screen and
// search/filtering keeps working offline (the permitted transitional state).
function filterLocal(books, { q, category, sort }) {
  let result = [...books]
  if (q) {
    const term = q.toLowerCase()
    result = result.filter(
      (b) =>
        (b.title || '').toLowerCase().includes(term) ||
        (b.author || '').toLowerCase().includes(term) ||
        (b.category || '').toLowerCase().includes(term)
    )
  }
  if (category) {
    const cat = localCategories.find((c) => c.slug === category || c.name === category)
    if (cat) result = result.filter((b) => b.category === cat.name)
  }
  switch (sort) {
    case 'newest':
      result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0))
      break
    case 'price-asc':
      result.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      result.sort((a, b) => b.price - a.price)
      break
    default:
      result.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0))
  }
  return result
}

/**
 * Load products from GET /api/products with search/category/sort params.
 *
 * Returns:
 *   books   – API results once loaded; otherwise the locally-filtered catalog.
 *   loading – true while the API request is in flight.
 *   error   – true when the request failed (books is then the local fallback).
 */
export function useProducts({ q = '', category = '', sort = 'popular' } = {}) {
  const [apiBooks, setApiBooks] = useState(null) // null = not fetched (use fallback)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (q) params.set('search', q)
    if (category) params.set('category', category)
    if (sort && sort !== 'popular') params.set('sort', sort)
    const qs = params.toString()

    setLoading(true)
    setError(false)

    api
      .get(`/products${qs ? `?${qs}` : ''}`)
      .then((res) => {
        if (!cancelled) setApiBooks(res.data || [])
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [q, category, sort])

  const books = useMemo(() => {
    // CRITICAL: API data ALWAYS takes priority when available.
    // Only use local fallback during loading or when API genuinely failed.
    if (Array.isArray(apiBooks)) return apiBooks

    // If loading or error with no API data yet, use filtered local catalog
    // so the store never shows a blank screen.
    if (loading || error) {
      return filterLocal(localBooks, { q, category, sort })
    }

    // API returned successfully but empty array - respect that
    return []
  }, [apiBooks, q, category, sort, loading, error])

  return { books, products: books, loading, error, useFallback: !Array.isArray(apiBooks) }
}

export default useProducts