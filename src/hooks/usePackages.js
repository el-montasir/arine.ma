import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export default function usePackages({ search = '', sort = 'popular' } = {}) {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (sort) params.append('sort', sort)

    setLoading(true)
    fetch(`${API_BASE}/packages?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch packages')
        return res.json()
      })
      .then((json) => {
        setPackages(json.data || [])
        setError(null)
      })
      .catch((err) => {
        console.error('Error fetching packages:', err)
        setError(err.message)
        setPackages([])
      })
      .finally(() => setLoading(false))
  }, [search, sort])

  return { packages, loading, error }
}
