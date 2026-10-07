// Arine Admin PWA - Service Worker for Background Push Notifications & App Icon Badging

self.addEventListener('install', () => {
  // Activate immediately without waiting for old clients to close
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Take control of all open clients immediately
  event.waitUntil(self.clients.claim())
})

// Validate and sanitize notification navigation target URLs strictly to Admin order routes
function getSafeTargetUrl(rawUrl) {
  const fallback = '/orders'
  if (!rawUrl || typeof rawUrl !== 'string') {
    return fallback
  }

  const trimmed = rawUrl.trim()

  // Reject dangerous schemes, protocol-relative URLs, and path traversal
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('\\\\') ||
    trimmed.toLowerCase().includes('javascript:') ||
    trimmed.toLowerCase().includes('data:') ||
    trimmed.includes('..')
  ) {
    return fallback
  }

  // Relative path validation
  if (trimmed.startsWith('/')) {
    // Only permit safe admin order routes: /orders or /orders/:id (alphanumeric/hyphen/underscore)
    if (/^\/orders(\/[a-zA-Z0-9_-]+)?$/.test(trimmed)) {
      return trimmed
    }
    return fallback
  }

  // Absolute URL validation against self origin
  try {
    const parsed = new URL(trimmed, self.location.origin)
    if (parsed.origin === self.location.origin) {
      if (/^\/orders(\/[a-zA-Z0-9_-]+)?$/.test(parsed.pathname)) {
        return parsed.pathname + parsed.search
      }
    }
  } catch {
    // Ignore URL parse failures
  }

  return fallback
}

// Synchronize numeric app icon badge with safe feature detection
async function syncAppBadge(count) {
  if (typeof self.navigator === 'undefined' || !('setAppBadge' in self.navigator)) return
  try {
    const numericCount = Number(count)
    if (!isNaN(numericCount) && numericCount > 0) {
      await self.navigator.setAppBadge(Math.floor(numericCount))
    } else if ('clearAppBadge' in self.navigator) {
      await self.navigator.clearAppBadge()
    }
  } catch (err) {
    console.warn('[SW] App badge sync failed:', err)
  }
}

// Background Push Event Handler
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'طلب جديد', body: 'وصل طلب جديد إلى أرين' }
  }

  const {
    title = 'طلب جديد',
    body = 'وصل طلب جديد إلى أرين',
    icon = '/logo.png',
    badge = '/logo.png',
    tag = 'arine-order-notification',
    data = {},
  } = payload

  const safeUrl = getSafeTargetUrl(data.url)

  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    data: {
      ...data,
      url: safeUrl,
    },
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'ar',
  }

  const promiseChain = Promise.all([
    self.registration.showNotification(title, notificationOptions),
    syncAppBadge(data.badgeCount),
  ])

  event.waitUntil(promiseChain)
})

// Notification Click Handler - Safely focus existing admin window or navigate to /orders
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const safePath = getSafeTargetUrl(event.notification.data?.url)
  const fullTargetUrl = new URL(safePath, self.location.origin).href

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clientList) => {
        // Find existing open admin window on same origin
        for (const client of clientList) {
          try {
            const clientUrl = new URL(client.url, self.location.origin)
            if (clientUrl.origin === self.location.origin && 'focus' in client) {
              await client.focus()
              if ('navigate' in client) {
                await client.navigate(safePath)
              }
              return
            }
          } catch {
            // Ignore client inspection errors and continue loop
          }
        }
        // If no matching window is open, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullTargetUrl)
        }
      })
      .catch((err) => {
        console.warn('[SW] notificationclick error:', err)
      })
  )
})

// Foreground Message Listener for dynamic badge synchronization
self.addEventListener('message', (event) => {
  if (!event.data) return

  if (event.data.type === 'SET_BADGE') {
    event.waitUntil(syncAppBadge(event.data.count))
  } else if (event.data.type === 'CLEAR_BADGE') {
    event.waitUntil(syncAppBadge(0))
  }
})
