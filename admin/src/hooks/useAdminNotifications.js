import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const POLLING_INTERVAL_MS = 25000 // 25 seconds

export function useAdminNotifications() {
  const { admin } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const isFetchingRef = useRef(false)

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!admin) {
      setNotifications([])
      setUnreadCount(0)
      setTotalCount(0)
      return
    }

    if (isFetchingRef.current) return
    isFetchingRef.current = true

    if (!silent) setLoading(true)

    try {
      const res = await api.get('/notifications?limit=25')
      if (res?.success && res?.data) {
        setNotifications(res.data.items || [])
        setUnreadCount(typeof res.data.unreadCount === 'number' ? res.data.unreadCount : 0)
        setTotalCount(typeof res.data.totalCount === 'number' ? res.data.totalCount : 0)
      }
    } catch {
      // Gracefully ignore notification polling errors (e.g. temporary network blips)
    } finally {
      isFetchingRef.current = false
      if (!silent) setLoading(false)
    }
  }, [admin])

  // Polling loop
  useEffect(() => {
    if (!admin) return

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
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      await api.patch(`/notifications/${id}/read`)
    } catch {
      // Re-fetch in background on failure to sync actual state
      fetchNotifications(true)
    }
  }, [fetchNotifications])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)

    try {
      await api.patch('/notifications/read-all')
    } catch {
      fetchNotifications(true)
    }
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    totalCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}

export default useAdminNotifications
