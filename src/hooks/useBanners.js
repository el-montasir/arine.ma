import { useState, useEffect } from 'react'
import api from '../utils/api'
import { registerImageVariantsFromPayload } from '../lib/image-metadata'

export function useBanners(type = '') {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const path = type ? `/banners?type=${encodeURIComponent(type)}` : '/banners'

    api
      .get(path)
      .then((res) => {
        if (mounted && Array.isArray(res?.data)) {
          // BEFORE setBanners, so the first render already sees the widths.
          registerImageVariantsFromPayload(res.data)
          setBanners(res.data)
        }
      })
      .catch((err) => {
        if (mounted) setError(err)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [type])

  return { banners, loading, error }
}
