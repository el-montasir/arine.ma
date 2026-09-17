import { Prisma } from '@prisma/client'
import { errorResponse } from '../utils/api-response.js'

// 404 for unknown routes.
export function notFoundHandler(req, res) {
  return errorResponse(res, 404, 'NOT_FOUND', 'المسار غير موجود')
}

// Centralized error handler — never leaks stack traces or internals.
export function errorHandler(err, req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return errorResponse(res, 400, 'INVALID_JSON', 'بيانات JSON غير صحيحة')
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return errorResponse(res, 409, 'CONFLICT', 'تعارض في البيانات')
    }
    return errorResponse(res, 400, 'DATABASE_ERROR', 'تعذر تنفيذ العملية')
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    return errorResponse(res, 500, 'DATABASE_ERROR', 'تعذر الاتصال بقاعدة البيانات')
  }
  // Unexpected — log server-side only.
  console.error('[server] unhandled error:', err)
  return errorResponse(res, 500, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع')
}