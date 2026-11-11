import { useEffect, useState } from 'react'
import api from '../utils/api'
import { registerImageVariantsFromPayload } from '../lib/image-metadata'

/**
 * Load products from GET /api/products with search/category/sort params.
 *
 * The payload carries, per image, the variant widths the server actually
 * generated. `registerImageVariantsFromPayload` records them synchronously
 * BEFORE `setBooks`, so the render that follows already has them and the first
 * paint carries the correct srcset (see the existence invariant in
 * `utils/image-variants.js`). No image is downloaded to work this out.
 *
 * Returns:
 *   books   – API results (array of products from DB, empty array on error or when none match).
 *   loading – true while the API request is in flight.
 *   error   – true when the request failed.
 */
// Last response per query, kept for the page visit. Revisiting a list (Home ->
// Books -> back, or re-selecting a category) shows it instantly while a fresh
// copy loads in the background, instead of flashing a loading state.
const listCache = new Map()

export function useProducts({ q = '', category = '', sort = 'popular' } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('search', q)
  if (category) params.set('category', category)
  if (sort && sort !== 'popular') params.set('sort', sort)
  const qs = params.toString()

  const cached = listCache.get(qs)
  const [books, setBooks] = useState(cached || [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const hit = listCache.get(qs)

    if (hit) {
      registerImageVariantsFromPayload(hit)
      setBooks(hit)
      setLoading(false)
    } else {
      setLoading(true)
    }
    setError(false)

    api
      .get(`/products${qs ? `?${qs}` : ''}`)
      .then((res) => {
        if (!cancelled) {
          const list = Array.isArray(res.data) ? res.data : []
          // BEFORE setBooks: the registry is a module singleton, so the render
          // this triggers must not be able to run before the widths are in it.
          registerImageVariantsFromPayload(list)
          listCache.set(qs, list)
          setBooks(list)
          setError(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load products:', err)
          // Keep showing the cached list if there is one; only an empty page errors.
          if (!hit) setBooks([])
          setError(!hit)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [qs])

  return { books, products: books, loading, error }
}

export default useProducts
