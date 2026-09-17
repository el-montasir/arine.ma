import { createContext, useContext, useEffect, useCallback, useMemo, useState } from 'react'
import { api } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, ask the server who we are. The session cookie does the real work;
  // this just hydrates the UI. 401 -> not logged in.
  useEffect(() => {
    let active = true
    api
      .get('/auth/me')
      .then((json) => {
        if (active) setAdmin(json.admin)
      })
      .catch(() => {
        if (active) setAdmin(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (username, password) => {
    const json = await api.post('/auth/login', { username, password })
    setAdmin(json.admin)
    return json.admin
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Session is cleared client-side regardless; nothing else to do.
    }
    setAdmin(null)
  }, [])

  const value = useMemo(() => ({ admin, loading, login, logout }), [admin, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}