import { useState, useEffect } from 'react'
import api from '../utils/api'

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
    api.get(`/packages/${id}`)
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
