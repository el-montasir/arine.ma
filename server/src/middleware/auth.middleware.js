import { prisma } from '../lib/prisma.js'
import { errorResponse } from '../utils/api-response.js'

// Server-side authorization gate for every /api/admin route.
// The browser can never mark itself authenticated — the session id is a random
// server-generated token (httpOnly cookie), and the admin row is re-read from
// the database on every request so role/deactivation changes apply immediately.
export async function requireAuth(req, res, next) {
  try {
    const adminId = req.session?.adminId
    if (!adminId) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'يرجى تسجيل الدخول')
    }

    const admin = await prisma.admin.findUnique({ where: { id: adminId } })
    if (!admin || !admin.isActive) {
      // Session still points at a removed/disabled account — destroy it.
      req.session.destroy(() => {})
      return errorResponse(res, 401, 'UNAUTHORIZED', 'الجلسة غير صالحة')
    }

    req.admin = admin // role comes from the DB, never from the request body
    next()
  } catch (err) {
    next(err)
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return errorResponse(res, 403, 'FORBIDDEN', 'لا تملك صلاحية هذه العملية')
    }
    next()
  }
}