// Fetch wrapper for the Arine Admin API. Sessions travel in an httpOnly cookie
// (Set-Cookie), so we just send credentials with every request — no tokens in
// localStorage, nothing readable by JavaScript beyond the /auth/me payload.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/admin'

function getErrorMessage(key) {
  const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('arine_admin_lang')) || 'ar'
  const messages = {
    NETWORK_ERROR: {
      ar: 'تعذر الاتصال بالخادم',
      fr: 'Impossible de se connecter au serveur',
      en: 'Unable to connect to server',
    },
    UNAUTHORIZED: {
      ar: 'جلسة غير مصادق عليها / بيانات الدخول غير صحيحة',
      fr: 'Session non authentifiée / identifiants invalides',
      en: 'Unauthorized session / Invalid credentials',
    },
    FORBIDDEN: {
      ar: 'ليس لديك صلاحية للدخول',
      fr: 'Accès refusé / permissions insuffisantes',
      en: 'Access denied / Insufficient permissions',
    },
    NOT_FOUND: {
      ar: 'المسار المطلوب غير موجود',
      fr: 'Ressource demandée non trouvée',
      en: 'Requested resource not found',
    },
    SERVER_ERROR: {
      ar: 'حدث خطأ في الخادم',
      fr: 'Erreur interne du serveur',
      en: 'Internal server error',
    },
    FAILED: {
      ar: 'تعذر تنفيذ العملية',
      fr: 'Impossible d\'exécuter l\'opération',
      en: 'Failed to process request',
    },
  }
  return messages[key]?.[lang] || messages[key]?.en || 'An error occurred'
}

async function request(path, { method = 'GET', body: payload } = {}) {
  let res
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData

  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: isFormData ? undefined : (payload ? { 'Content-Type': 'application/json' } : undefined),
      body: isFormData ? payload : (payload ? JSON.stringify(payload) : undefined),
    })
  } catch {
    const err = new Error(getErrorMessage('NETWORK_ERROR'))
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
    let message = json?.error?.message || json?.message
    if (!message) {
      if (res.status === 401) {
        message = getErrorMessage('UNAUTHORIZED')
      } else if (res.status === 403) {
        message = getErrorMessage('FORBIDDEN')
      } else if (res.status === 404) {
        message = getErrorMessage('NOT_FOUND')
      } else if (res.status >= 500) {
        message = getErrorMessage('SERVER_ERROR')
      } else {
        message = getErrorMessage('FAILED')
      }
    }
    const err = new Error(message)
    err.code = json?.error?.code || (res.status >= 500 ? 'SERVER_ERROR' : 'REQUEST_FAILED')
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
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),
}
