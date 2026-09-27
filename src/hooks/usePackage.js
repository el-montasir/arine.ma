import { useState, useEffect } from 'react'
import api from '../utils/api'
import { registerImageVariantsFromPayload } from '../lib/image-metadata'

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
        const data = json.data || null
        // BEFORE setPkg: the detail hero's srcset is correct on first paint.
        registerImageVariantsFromPayload(data)
        setPkg(data)
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
