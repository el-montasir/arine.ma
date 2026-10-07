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
  const isFetchingRef = useRef(false)
  const currentAdminIdRef = useRef(admin?.id)

  useEffect(() => {
    currentAdminIdRef.current = admin?.id
  }, [admin?.id])

  const fetchNotifications = useCallback(async (silent = false) => {
    const fetchAdminId = admin?.id
    if (!fetchAdminId) {
      setNotifications([])
      setUnreadCount(0)
      setTotalCount(0)
      setUnseenOrderCount(0)
      clearAppBadge()
      return
    }

    if (isFetchingRef.current) return
    isFetchingRef.current = true

    if (!silent) setLoading(true)

    try {
      // Synchronize both general notification list and NEW_ORDER unseen badge count in parallel
      const [notifsRes, badgeRes] = await Promise.allSettled([
        api.get('/notifications?limit=25'),
        api.get('/push/unseen-order-count'),
      ])

      // Discard stale responses if active admin changed mid-flight
      if (currentAdminIdRef.current !== fetchAdminId) {
        return
      }

      if (notifsRes.status === 'fulfilled' && notifsRes.value?.success && notifsRes.value?.data) {
        setNotifications(notifsRes.value.data.items || [])
        setUnreadCount(typeof notifsRes.value.data.unreadCount === 'number' ? notifsRes.value.data.unreadCount : 0)
        setTotalCount(typeof notifsRes.value.data.totalCount === 'number' ? notifsRes.value.data.totalCount : 0)
      }

      if (badgeRes.status === 'fulfilled' && badgeRes.value?.success && typeof badgeRes.value?.data?.count === 'number') {
        const orderCount = badgeRes.value.data.count
        setUnseenOrderCount(orderCount)
        setAppBadge(orderCount)
      }
    } catch {
      // Gracefully ignore notification polling network failures without resetting badge
    } finally {
      isFetchingRef.current = false
      if (!silent) setLoading(false)
    }
  }, [admin])

  // Single polling loop and document visibility listener
  useEffect(() => {
    if (!admin) {
      clearAppBadge()
      return
    }

    fetchNotifications(false)

    const interval = setInterval(() => {
      // Only poll when document is visible
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
  const markAsRead = useCallback(async (id) => {
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
      // Re-fetch authoritative unseen order count and badge
      fetchNotifications(true)
    }
  }, [fetchNotifications])

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
