import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function useAdminPush() {
  const { admin } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  const isBadgingSupported =
    typeof navigator !== 'undefined' && 'setAppBadge' in navigator

  // Register service worker on mount if supported
  useEffect(() => {
    if (!isSupported) {
      setLoading(false)
      return
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('[SW] Registration failed:', err))
  }, [isSupported])

  // Check subscription status and verify ownership against authenticated admin
  const checkSubscription = useCallback(async () => {
    if (!isSupported || !admin) {
      setIsSubscribed(false)
      setLoading(false)
      return
    }

    try {
      setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'default')
      const reg = await navigator.serviceWorker.getRegistration().catch(() => null)

      if (!reg?.pushManager) {
        setIsSubscribed(false)
        return
      }

      const sub = await reg.pushManager.getSubscription()

      if (!sub) {
        setIsSubscribed(false)
        return
      }

      // Verify with backend whether this endpoint belongs to the currently authenticated admin
      const statusRes = await api.post('/push/status', { endpoint: sub.endpoint }).catch(() => null)
      if (statusRes?.success && statusRes?.data?.isOwner === true) {
        setIsSubscribed(true)
      } else {
        // Subscription exists in browser but belongs to another account, is unregistered, or status API failed
        setIsSubscribed(false)
      }
    } catch (err) {
      console.warn('[Push] Failed to check subscription:', err)
      setIsSubscribed(false)
    } finally {
      setLoading(false)
    }
  }, [isSupported, admin])

  useEffect(() => {
    checkSubscription()
  }, [checkSubscription])

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications not supported on this browser')
    }
    setBusy(true)
    setError(null)

    try {
      // 1. Request notification permission
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        throw new Error('Notification permission was not granted')
      }

      // 2. Ensure Service Worker is ready with a bounded timeout
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Service worker readiness timed out')), 4000)
        ),
      ])

      // 3. Fetch server VAPID public key
      const res = await api.get('/push/public-key')
      if (!res?.data?.publicKey) {
        throw new Error('VAPID public key not configured on server')
      }
      const applicationServerKey = urlBase64ToUint8Array(res.data.publicKey)

      // 4. Handle any pre-existing subscription (e.g. from previous admin account)
      let sub = await reg.pushManager.getSubscription()
      if (sub) {
        // Check if current subscription belongs to current admin
        let isOwner = false
        try {
          const statusRes = await api.post('/push/status', { endpoint: sub.endpoint })
          if (statusRes?.success && statusRes?.data?.isOwner === true) {
            isOwner = true
          }
        } catch {
          isOwner = false
        }

        if (!isOwner) {
          // Unsubscribe stale/foreign or unverified subscription locally first
          await sub.unsubscribe().catch(() => {})
          sub = null
        }
      }

      // 5. Create fresh subscription if needed
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })
      }

      // 6. Send subscription to backend
      const rawJson = sub.toJSON()
      await api.post('/push/subscribe', {
        endpoint: sub.endpoint,
        keys: {
          p256dh: rawJson.keys?.p256dh || '',
          auth: rawJson.keys?.auth || '',
        },
      })

      setIsSubscribed(true)
      return true
    } catch (err) {
      console.error('[Push] Subscribe failed:', err)
      setError(err.message || 'Failed to subscribe to push notifications')
      throw err
    } finally {
      setBusy(false)
    }
  }, [isSupported])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!isSupported) return
    setBusy(true)
    setError(null)

    try {
      const reg = await navigator.serviceWorker.getRegistration().catch(() => null)
      if (reg?.pushManager) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          // Inform backend to delete record for current admin
          await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {})
          // Unsubscribe locally from PushManager
          await sub.unsubscribe()
        }
      }
      setIsSubscribed(false)
      return true
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err)
      setError(err.message || 'Failed to unsubscribe')
      throw err
    } finally {
      setBusy(false)
    }
  }, [isSupported])

  return {
    isSupported,
    isBadgingSupported,
    permission,
    isSubscribed,
    loading,
    busy,
    error,
    subscribe,
    unsubscribe,
    checkSubscription,
  }
}

export default useAdminPush
