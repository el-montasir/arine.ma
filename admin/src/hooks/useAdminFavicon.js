import { useEffect } from 'react'

export function applyFavicon() {
  if (typeof document === 'undefined') return

  const href = '/logo.png?v=4'

  // Update or create standard icon link
  let iconLink = document.querySelector("link[rel~='icon']")
  if (!iconLink) {
    iconLink = document.createElement('link')
    iconLink.rel = 'icon'
    document.head.appendChild(iconLink)
  }
  iconLink.href = href
  iconLink.type = 'image/png'

  // Update or create shortcut icon link
  let shortcutLink = document.querySelector("link[rel='shortcut icon']")
  if (!shortcutLink) {
    shortcutLink = document.createElement('link')
    shortcutLink.rel = 'shortcut icon'
    document.head.appendChild(shortcutLink)
  }
  shortcutLink.href = href
  shortcutLink.type = 'image/png'

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
  useEffect(() => {
    applyFavicon()
  }, [])

  return { logoUrl: '/logo.png', updateFromLogo: () => applyFavicon() }
}

export default useAdminFavicon
