// Arine Admin PWA - Service Worker for Background Push Notifications & App Badge Synchronization

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for old clients to close
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Take control of all open clients immediately
  event.waitUntil(self.clients.claim())
})

// Synchronize numeric app icon badge with safe fallback
async function syncAppBadge(count) {
  if (!('setAppBadge' in self.navigator)) return
  try {
    const numericCount = Number(count)
    if (!isNaN(numericCount) && numericCount > 0) {
      await self.navigator.setAppBadge(numericCount)
    } else {
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
  } catch (e) {
    try {
      payload = { title: 'إشعار جديد', body: event.data.text() }
    } catch {
      payload = { title: 'طلب جديد', body: 'طلب جديد تم إنشاؤه في المتجر' }
    }
  }

  const {
    title = 'طلب جديد',
    body = 'طلب جديد تم إنشاؤه في المتجر',
    icon = '/logo.png',
    badge = '/logo.png',
    tag = 'arine-order-notification',
    data = {},
  } = payload

  const actions = []
  const orderUrl = data.url || '/orders'

  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    data: {
      url: orderUrl,
      ...data,
    },
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'ar',
    actions,
  }

  const promiseChain = Promise.all([
    self.registration.showNotification(title, notificationOptions),
    syncAppBadge(data.badgeCount),
  ])

  event.waitUntil(promiseChain)
})

// Notification Click Handler - Focus existing admin window or open order view
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/orders'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Look for an existing open window under admin domain
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus()
            if ('navigate' in client && targetUrl) {
              client.navigate(targetUrl)
            }
            return
          }
        }
        // If no open window found, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
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
