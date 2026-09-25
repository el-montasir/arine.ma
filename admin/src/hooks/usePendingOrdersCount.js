import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const POLLING_INTERVAL_MS = 25000 // 25 seconds

export function usePendingOrdersCount() {
  const { admin } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const isFetchingRef = useRef(false)

  const fetchPendingCount = useCallback(async () => {
    if (!admin) {
      setPendingCount(0)
      return
    }

    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const res = await api.get('/orders/pending-count')
      if (res?.success && typeof res?.data?.pendingCount === 'number') {
        setPendingCount(res.data.pendingCount)
      }
    } catch {
      // Gracefully ignore polling errors
    } finally {
      isFetchingRef.current = false
    }
  }, [admin])

  useEffect(() => {
    if (!admin) return

    fetchPendingCount()

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      fetchPendingCount()
    }, POLLING_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchPendingCount()
      }
    }

    const handleOrderUpdate = () => {
      fetchPendingCount()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('order-status-updated', handleOrderUpdate)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('order-status-updated', handleOrderUpdate)
    }
  }, [admin, fetchPendingCount])

  return {
    pendingCount,
    refresh: fetchPendingCount,
  }
}

export default usePendingOrdersCount
