import { useState, useEffect } from 'react'
import api from '../utils/api'
import { getImageUrl } from '../utils/images'

export function updateFavicon(logoPath) {
  if (typeof document === 'undefined') return

  // Enforce consistent title across the storefront
  document.title = 'arine.ma'

  const targetHref = logoPath ? getImageUrl(logoPath) : '/favicon.svg'

  const rels = ['icon', 'shortcut icon', 'apple-touch-icon']
  rels.forEach((rel) => {
    let link = document.querySelector(`link[rel='${rel}']`)
    if (!link) {
      link = document.createElement('link')
      link.rel = rel
      document.head.appendChild(link)
    }
    link.href = targetHref
  })
}

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
          if (res.data.store?.logo) {
            updateFavicon(res.data.store.logo)
          } else {
            updateFavicon(null)
          }
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err)
          updateFavicon(null)
        }
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
