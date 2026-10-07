import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { setAppBadge, clearAppBadge } from './useAdminAppBadge.js'

const POLLING_INTERVAL_MS = 25000 // 25 seconds

export function useAdminNotifications() {
  const { admin } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [unseenOrderCount, setUnseenOrderCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const currentAdminIdRef = useRef(admin?.id)
  const notifSequenceRef = useRef(0)
  const badgeSequenceRef = useRef(0)

  useEffect(() => {
    currentAdminIdRef.current = admin?.id
  }, [admin?.id])

  const fetchNotifications = useCallback(
    (silent = false) => {
      const fetchAdminId = admin?.id
      if (!fetchAdminId) {
        setNotifications([])
        setUnreadCount(0)
        setTotalCount(0)
        setUnseenOrderCount(0)
        clearAppBadge()
        return
      }

      // 1. Fetch general notifications independently with sequence tracking
      const currentNotifSeq = ++notifSequenceRef.current
      if (!silent) setLoading(true)

      api
        .get('/notifications?limit=25')
        .then((res) => {
          // Discard stale responses if active admin changed or a newer request arrived
          if (currentAdminIdRef.current !== fetchAdminId || currentNotifSeq !== notifSequenceRef.current) {
            return
          }
          if (res?.success && res?.data) {
            setNotifications(res.data.items || [])
            setUnreadCount(typeof res.data.unreadCount === 'number' ? res.data.unreadCount : 0)
            setTotalCount(typeof res.data.totalCount === 'number' ? res.data.totalCount : 0)
          }
        })
        .catch((err) => {
          if (currentAdminIdRef.current === fetchAdminId && currentNotifSeq === notifSequenceRef.current) {
            console.warn('[Notifications] Polling failed:', err)
          }
        })
        .finally(() => {
          if (currentAdminIdRef.current === fetchAdminId && currentNotifSeq === notifSequenceRef.current) {
            if (!silent) setLoading(false)
          }
        })

      // 2. Fetch unread NEW_ORDER count for PWA app icon badge independently with sequence tracking
      const currentBadgeSeq = ++badgeSequenceRef.current

      api
        .get('/push/unseen-order-count')
        .then((res) => {
          // Discard stale responses if active admin changed or a newer request arrived
          if (currentAdminIdRef.current !== fetchAdminId || currentBadgeSeq !== badgeSequenceRef.current) {
            return
          }
          if (res?.success && typeof res?.data?.count === 'number') {
            const orderCount = res.data.count
            setUnseenOrderCount(orderCount)
            setAppBadge(orderCount)
          }
        })
        .catch((err) => {
          if (currentAdminIdRef.current === fetchAdminId && currentBadgeSeq === badgeSequenceRef.current) {
            console.warn('[Badge] Polling unseen count failed:', err)
          }
        })
    },
    [admin]
  )

  // Single polling loop and document visibility listener
  useEffect(() => {
    if (!admin) {
      clearAppBadge()
      return
    }

    fetchNotifications(false)

    const interval = setInterval(() => {
      // Only poll when document is visible to save battery and network
      if (typeof document !== 'undefined' && document.hidden) return
      fetchNotifications(true)
    }, POLLING_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchNotifications(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [admin, fetchNotifications])

  // Mark single notification as read
  const markAsRead = useCallback(
    async (id) => {
      if (!id) return
      // Optimistic UI update for general notification list
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      try {
        await api.patch(`/notifications/${id}/read`)
      } catch {
        // Ignore network errors
      } finally {
        // Re-fetch authoritative notifications and badge state
        fetchNotifications(true)
      }
    },
    [fetchNotifications]
  )

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    setUnseenOrderCount(0)
    clearAppBadge()

    try {
      await api.patch('/notifications/read-all')
    } catch {
      // Ignore network errors
    } finally {
      fetchNotifications(true)
    }
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    totalCount,
    unseenOrderCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}

export default useAdminNotifications
