import { useState, useEffect } from 'react'
import api from '../utils/api'
import staticCategories from '../data/categories'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api.get('/categories')
      .then((res) => {
        if (!cancelled) {
          const list = Array.isArray(res.data) ? res.data : []
          // CRITICAL: API data successfully loaded - use it exclusively
          setCategories(list)
          setError(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Failed to fetch categories from API, using static fallback:', err)
          // Only use static fallback when API is genuinely unreachable
          setCategories(staticCategories)
          setError(err)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { categories, loading, error }
}

export default useCategories
