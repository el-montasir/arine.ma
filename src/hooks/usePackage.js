import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export default function usePackage(id) {
  const [pkg, setPkg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      setPkg(null)
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`${API_BASE}/packages/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch package')
        return res.json()
      })
      .then((json) => {
        setPkg(json.data || null)
        setError(null)
      })
      .catch((err) => {
        console.error('Error fetching package:', err)
        setError(err.message)
        setPkg(null)
      })
      .finally(() => setLoading(false))
  }, [id])

  return { pkg, loading, error }
}
