import { createContext, useContext, useEffect, useCallback, useMemo, useState } from 'react'
import { api } from '../lib/api.js'

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

  const login = useCallback(async (identifier, password) => {
    const json = await api.post('/auth/login', { identifier, password })
    setAdmin(json.admin)
    return json.admin
  }, [])

  const logout = useCallback(async () => {
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
