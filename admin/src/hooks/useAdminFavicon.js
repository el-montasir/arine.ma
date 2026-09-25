import { useEffect, useState } from 'react'
import { getImageUrl } from '../lib/images.js'

function applyFavicon(iconUrl) {
  if (typeof document === 'undefined') return

  const href = iconUrl || '/favicon.svg'

  // Update or create standard icon link
  let iconLink = document.querySelector("link[rel~='icon']")
  if (!iconLink) {
    iconLink = document.createElement('link')
    iconLink.rel = 'icon'
    document.head.appendChild(iconLink)
  }
  iconLink.href = href

  // Update or create shortcut icon link
  let shortcutLink = document.querySelector("link[rel='shortcut icon']")
  if (!shortcutLink) {
    shortcutLink = document.createElement('link')
    shortcutLink.rel = 'shortcut icon'
    document.head.appendChild(shortcutLink)
  }
  shortcutLink.href = href

  // Update or create apple-touch-icon link
  let appleLink = document.querySelector("link[rel='apple-touch-icon']")
  if (!appleLink) {
    appleLink = document.createElement('link')
    appleLink.rel = 'apple-touch-icon'
    document.head.appendChild(appleLink)
  }
  appleLink.href = href
}

export function useAdminFavicon() {
  const [logoUrl, setLogoUrl] = useState('')

  const updateFromLogo = (rawLogo) => {
    if (rawLogo && typeof rawLogo === 'string' && rawLogo.trim()) {
      const fullUrl = getImageUrl(rawLogo.trim())
      setLogoUrl(fullUrl)
      applyFavicon(fullUrl)
    } else {
      setLogoUrl('')
      applyFavicon('/favicon.svg')
    }
  }

  useEffect(() => {
    let mounted = true

    async function loadLogo() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/admin'
        let serverOrigin = 'http://localhost:4000'
        try {
          const parsed = new URL(apiUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000')
          serverOrigin = parsed.origin
        } catch {
          serverOrigin = 'http://localhost:4000'
        }

        const res = await fetch(`${serverOrigin}/api/store-config`)
        if (!res.ok) return
        const json = await res.json()
        if (mounted && json?.data?.store?.logo) {
          updateFromLogo(json.data.store.logo)
        }
      } catch {
        // Fallback gracefully to default favicon on network or config errors
        if (mounted) {
          applyFavicon('/favicon.svg')
        }
      }
    }

    loadLogo()

    const handleConfigEvent = (e) => {
      const updatedLogo = e?.detail?.logo !== undefined ? e.detail.logo : null
      updateFromLogo(updatedLogo)
    }

    window.addEventListener('store-config-updated', handleConfigEvent)
    return () => {
      mounted = false
      window.removeEventListener('store-config-updated', handleConfigEvent)
    }
  }, [])

  return { logoUrl, updateFromLogo }
}

export default useAdminFavicon
