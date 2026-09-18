import { useState, useEffect } from 'react'
import api from '../utils/api'

export function useStoreConfig() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    api
      .get('/store-config')
      .then((res) => {
        if (mounted && res?.data) {
          setConfig(res.data)
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
  }, [])

  return { config, loading, error }
}
