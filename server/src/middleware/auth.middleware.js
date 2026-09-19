import { prisma } from '../lib/prisma.js'
import { errorResponse } from '../utils/api-response.js'
import { hasPermission } from '../constants/permissions.js'

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

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        notes: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!admin || !admin.isActive || (admin.status && admin.status !== 'ACTIVE')) {
      // Session still points at a removed/disabled/suspended account — destroy it.
      req.session.destroy(() => {})
      return errorResponse(res, 401, 'UNAUTHORIZED', 'الحساب معطل أو الجلسة غير صالحة')
    }

    req.admin = admin // role & permissions come from the DB, never from the client request
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

/**
 * Middleware that checks if logged-in admin has at least one of the required permissions.
 * SUPER_ADMIN role automatically bypasses and has full access.
 */
export function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.admin) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'يرجى تسجيل الدخول')
    }

    if (req.admin.role === 'SUPER_ADMIN') {
      return next()
    }

    const adminPerms = Array.isArray(req.admin.permissions) ? req.admin.permissions : []
    const hasAny = permissions.some((p) => adminPerms.includes(p))

    if (!hasAny) {
      return errorResponse(
        res,
        403,
        'PERMISSION_DENIED',
        'ليس لديك الصلاحيات الكافية للوصول إلى هذا القسم أو تنفيذ هذا الإجراء'
      )
    }

    next()
  }
}
