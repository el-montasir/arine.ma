import { useState, useEffect } from 'react'
import api from '../utils/api'
import { registerImageVariantsFromPayload } from '../lib/image-metadata'

export function updateFavicon() {
  if (typeof document === 'undefined') return

  // Enforce consistent title across the storefront
  document.title = 'arine.ma'

  const targetHref = '/logo.png?v=5'

  const rels = ['icon', 'shortcut icon', 'apple-touch-icon']
  rels.forEach((rel) => {
    let link = document.querySelector(`link[rel='${rel}']`)
    if (!link) {
      link = document.createElement('link')
      link.rel = rel
      document.head.appendChild(link)
    }
    link.href = targetHref
    link.type = 'image/png'
  })
}

// Navbar, Footer, AnnouncementBar and the page all use this hook at once; they
// share one request per page load instead of each fetching the same config.
let storeConfigPromise = null

function fetchStoreConfig() {
  if (!storeConfigPromise) {
    storeConfigPromise = api.get('/store-config').then((res) => {
      // BEFORE any setConfig, so the logo's srcset is correct on first paint.
      if (res?.data) registerImageVariantsFromPayload(res.data)
      return res
    })
    // A failed request must not be cached: the next mount retries.
    storeConfigPromise.catch(() => {
      storeConfigPromise = null
    })
  }
  return storeConfigPromise
}

export function useStoreConfig() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    fetchStoreConfig()
      .then((res) => {
        if (mounted && res?.data) {
          setConfig(res.data)
          updateFavicon()
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err)
          updateFavicon()
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
