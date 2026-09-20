import { useState, useEffect } from 'react'
import api from '../utils/api'

export default function usePackages({ search = '', sort = 'popular' } = {}) {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (sort) params.append('sort', sort)

    setLoading(true)
    api.get(`/packages?${params.toString()}`)
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
