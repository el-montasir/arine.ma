import { useState, useEffect } from 'react'
import api from '../utils/api'

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
          setCategories(list)
          setError(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to fetch categories from API:', err)
          setCategories([])
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
