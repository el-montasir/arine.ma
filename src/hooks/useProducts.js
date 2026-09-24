import { useEffect, useState } from 'react'
import api from '../utils/api'

/**
 * Load products from GET /api/products with search/category/sort params.
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
          setBooks(Array.isArray(res.data) ? res.data : [])
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
