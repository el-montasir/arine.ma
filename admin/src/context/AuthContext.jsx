import { createContext, useContext, useEffect, useCallback, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { clearAppBadge } from '../hooks/useAdminAppBadge.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

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
    if (!admin?.id) return
    let active = true

    async function reconcilePushSubscription() {
      try {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
          return
        }

        // Use getRegistration() to prevent hanging when no service worker is active
        const reg = await navigator.serviceWorker.getRegistration().catch(() => null)
        if (!reg?.pushManager || !active) return

        const sub = await reg.pushManager.getSubscription().catch(() => null)
        if (!sub || !active) return

        // Verify if the local subscription belongs to the currently authenticated admin
        const statusRes = await api.post('/push/status', { endpoint: sub.endpoint }).catch(() => null)
        if (!active) return

        // If subscription exists in browser but belongs to another admin account,
        // unsubscribe locally to prevent cross-admin notification leaks on shared devices.
        if (statusRes?.success && statusRes?.data && statusRes.data.isOwner === false) {
          await sub.unsubscribe().catch(() => {})
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
    // Non-blocking best-effort cleanup of push subscription & badge on logout
    try {
      clearAppBadge()
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const cleanupPush = async () => {
          const reg = await navigator.serviceWorker.getRegistration().catch(() => null)
          if (reg?.pushManager) {
            const sub = await reg.pushManager.getSubscription().catch(() => null)
            if (sub) {
              await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {})
              await sub.unsubscribe().catch(() => {})
            }
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
  }, [])

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
