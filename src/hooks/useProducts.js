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
export function useProducts({ q = '', category = '', sort = 'popular' } = {}) {
  const [books, setBooks] = useState([])
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
        if (!cancelled) {
          const list = Array.isArray(res.data) ? res.data : []
          // BEFORE setBooks: the registry is a module singleton, so the render
          // this triggers must not be able to run before the widths are in it.
          registerImageVariantsFromPayload(list)
          setBooks(list)
          setError(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load products:', err)
          setBooks([])
          setError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [q, category, sort])

  return { books, products: books, loading, error }
}

export default useProducts
