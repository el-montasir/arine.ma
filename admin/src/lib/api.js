// Fetch wrapper for the Arine Admin API. Sessions travel in an httpOnly cookie
// (Set-Cookie), so we just send credentials with every request — no tokens in
// localStorage, nothing readable by JavaScript beyond the /auth/me payload.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/admin'

async function request(path, { method = 'GET', body: payload } = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    })
  } catch {
    const err = new Error('تعذر الاتصال بالخادم')
    err.code = 'NETWORK_ERROR'
    err.status = 0
    throw err
  }

  let json = {}
  try {
    json = await res.json()
  } catch {
    json = {}
  }

  if (!res.ok) {
    const err = new Error(json?.error?.message || 'فشل الطلب')
    err.code = json?.error?.code || 'NETWORK_ERROR'
    err.status = res.status
    throw err
  }
  return json
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
}