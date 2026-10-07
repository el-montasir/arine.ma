import { createContext, useContext, useEffect, useCallback, useMemo, useState, useRef } from 'react'
import { api } from '../lib/api.js'
import { clearAppBadge } from '../hooks/useAdminAppBadge.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const sessionEpochRef = useRef(0)

  const fetchCurrentUser = useCallback(async () => {
    try {
      const json = await api.get('/auth/me')
      if (json?.admin) {
        setAdmin(json.admin)
        return json.admin
      }
      setAdmin(null)
      return null
    } catch {
      setAdmin(null)
      return null
    }
  }, [])

  // On mount, ask the server who we are. The session cookie does the real work;
  // this hydrates the UI. 401 -> not logged in.
  useEffect(() => {
    let active = true
    fetchCurrentUser().finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [fetchCurrentUser])

  // Reconcile push subscription at the authentication boundary when admin account changes
  useEffect(() => {
    const currentAdminId = admin?.id
    if (!currentAdminId) return

    const currentEpoch = ++sessionEpochRef.current
    let active = true

    async function reconcilePushSubscription() {
      try {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
          return
        }

        // Use getRegistration() to prevent hanging when no service worker is active
        const reg = await navigator.serviceWorker.getRegistration().catch(() => null)
        if (!reg?.pushManager || !active || sessionEpochRef.current !== currentEpoch) return

        const sub = await reg.pushManager.getSubscription().catch(() => null)
        if (!sub || !active || sessionEpochRef.current !== currentEpoch) return

        // Verify if the local subscription belongs to the currently authenticated admin
        let isOwner = false
        try {
          const statusRes = await Promise.race([
            api.post('/push/status', { endpoint: sub.endpoint }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Push status timeout')), 3500)),
          ])
          if (statusRes?.success && statusRes?.data && statusRes.data.isOwner === true) {
            isOwner = true
          }
        } catch (err) {
          console.warn('[Auth] Push ownership check failed or timed out:', err.message)
          isOwner = false
        }

        if (!active || sessionEpochRef.current !== currentEpoch) return

        // Fail-closed privacy strategy: If ownership cannot be verified as belonging to the current admin,
        // unsubscribe locally from the browser to prevent cross-admin notification leaks on shared devices.
        if (!isOwner) {
          try {
            const currentSub = await reg.pushManager.getSubscription().catch(() => null)
            if (currentSub && currentSub.endpoint === sub.endpoint && sessionEpochRef.current === currentEpoch) {
              await currentSub.unsubscribe().catch((unsubErr) => {
                console.warn('[Auth] Browser PushManager unsubscribe failed:', unsubErr)
              })
            }
          } catch (cleanupErr) {
            console.warn('[Auth] Local foreign subscription cleanup failed:', cleanupErr)
          }
        }
      } catch (err) {
        console.warn('[Auth] Push subscription reconciliation failed:', err)
      }
    }

    reconcilePushSubscription()

    return () => {
      active = false
    }
  }, [admin?.id])

  const login = useCallback(async (identifier, password) => {
    const json = await api.post('/auth/login', { identifier, password })
    setAdmin(json.admin)
    return json.admin
  }, [])

  const logout = useCallback(async () => {
    // Capture current session context & invalidate current session epoch immediately
    const loggingOutEpoch = sessionEpochRef.current
    const loggingOutAdminId = admin?.id
    sessionEpochRef.current++ // Invalidate any running reconciliation or cleanup for next session

    // Non-blocking best-effort cleanup of push subscription & badge on logout
    try {
      clearAppBadge()
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && loggingOutAdminId) {
        const cleanupPush = async () => {
          try {
            if (sessionEpochRef.current !== loggingOutEpoch + 1) return

            const reg = await navigator.serviceWorker.getRegistration().catch(() => null)
            if (!reg?.pushManager || sessionEpochRef.current !== loggingOutEpoch + 1) return

            const sub = await reg.pushManager.getSubscription().catch(() => null)
            if (!sub || sessionEpochRef.current !== loggingOutEpoch + 1) return

            const endpoint = sub.endpoint

            // Inform backend while session is still active
            await api.post('/push/unsubscribe', { endpoint }).catch(() => {})

            // Revalidate session epoch after backend call
            if (sessionEpochRef.current !== loggingOutEpoch + 1) return

            const currentSub = await reg.pushManager.getSubscription().catch(() => null)
            if (!currentSub || currentSub.endpoint !== endpoint) return

            // Revalidate captured session epoch immediately after getSubscription() and before calling unsubscribe()
            if (sessionEpochRef.current !== loggingOutEpoch + 1) return

            await currentSub.unsubscribe().catch(() => {})
          } catch (err) {
            console.warn('[Auth] Push cleanup error during logout:', err)
          }
        }

        // Bound push cleanup with a strict timeout so logout is never blocked or delayed
        await Promise.race([
          cleanupPush(),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ]).catch(() => {})
      }
    } catch {
      // Ignore push cleanup failures during logout
    }

    try {
      await api.post('/auth/logout')
    } catch {
      // Session is cleared client-side regardless
    }
    setAdmin(null)
  }, [admin?.id])

  const isOwner = useMemo(() => admin?.role === 'SUPER_ADMIN', [admin])

  const can = useCallback(
    (permission) => {
      if (!admin) return false
      if (admin.role === 'SUPER_ADMIN') return true
      const perms = Array.isArray(admin.permissions) ? admin.permissions : []
      return perms.includes(permission)
    },
    [admin]
  )

  const hasAnyPermission = useCallback(
    (permissions = []) => {
      if (!admin) return false
      if (admin.role === 'SUPER_ADMIN') return true
      if (!permissions.length) return true
      const perms = Array.isArray(admin.permissions) ? admin.permissions : []
      return permissions.some((p) => perms.includes(p))
    },
    [admin]
  )

  const hasAllPermissions = useCallback(
    (permissions = []) => {
      if (!admin) return false
      if (admin.role === 'SUPER_ADMIN') return true
      if (!permissions.length) return true
      const perms = Array.isArray(admin.permissions) ? admin.permissions : []
      return permissions.every((p) => perms.includes(p))
    },
    [admin]
  )

  const value = useMemo(
    () => ({
      admin,
      loading,
      login,
      logout,
      can,
      hasAnyPermission,
      hasAllPermissions,
      isOwner,
      refreshUser: fetchCurrentUser,
    }),
    [admin, loading, login, logout, can, hasAnyPermission, hasAllPermissions, isOwner, fetchCurrentUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
