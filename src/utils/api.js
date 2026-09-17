// Lightweight fetch wrapper for the Arine REST API.
// Base URL comes from VITE_API_URL (.env) — never hardcoded per-component.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    // Network-level failure (backend unreachable) — never surface "Failed to fetch".
    const err = new Error('تعذر الاتصال بالخادم، تحقق من اتصالك وحاول مرة أخرى')
    err.code = 'NETWORK_ERROR'
    throw err
  }

  let json = {}
  try {
    json = await res.json()
  } catch {
    json = {}
  }

  if (!res.ok) {
    const err = new Error(json?.error?.message || 'تعذر الاتصال بالخادم')
    err.code = json?.error?.code || 'NETWORK_ERROR'
    err.status = res.status
    throw err
  }

  return json
}

const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
}

export default api