import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  authenticate,
  serializeAdmin,
  updateAdminPassword,
  updateAdminProfile,
  getAdminPasswordHash,
  getAdminActiveSessionsCount,
  revokeOtherSessions,
} from '../../services/admin/auth.service.js'
import { verifyPassword } from '../../utils/password.js'
import { logActivity } from '../../services/admin/activity-log.service.js'

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.validated
  const result = await authenticate(identifier, password)

  if (!result) {
    await logActivity({
      actor: { username: identifier },
      action: 'LOGIN_FAILED',
      resourceType: 'AUTH',
      details: { identifier, reason: 'INVALID_CREDENTIALS' },
      req,
    })
    return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'اسم المستخدم أو البريد الإلكتروني أو كلمة المرور غير صحيحة')
  }

  if (result.locked) {
    const minutesLeft = Math.ceil((result.lockoutUntil - new Date()) / 60000)
    await logActivity({
      actor: result.admin,
      action: 'LOGIN_BLOCKED',
      resourceType: 'AUTH',
      details: { identifier, reason: 'ACCOUNT_LOCKED', lockoutUntil: result.lockoutUntil },
      req,
    })
    return errorResponse(
      res,
      423,
      'ACCOUNT_LOCKED',
      `تم قفل الحساب بسبب محاولات تسجيل دخول فاشلة متعددة. يرجى المحاولة بعد ${minutesLeft} دقيقة`
    )
  }

  if (result.disabled) {
    await logActivity({
      actor: result.admin,
      action: 'LOGIN_BLOCKED',
      resourceType: 'AUTH',
      details: { identifier, reason: 'ACCOUNT_DISABLED', status: result.admin.status },
      req,
    })
    return errorResponse(res, 403, 'ACCOUNT_DISABLED', 'الحساب معطّل أو موقوف، يرجى مراجعة إدارة المتجر')
  }

  // Regenerate the session id on login to prevent session fixation.
  req.session.regenerate(async (err) => {
    if (err) return errorResponse(res, 500, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع')
    req.session.adminId = result.admin.id

    await logActivity({
      actor: result.admin,
      action: 'LOGIN_SUCCESS',
      resourceType: 'AUTH',
      details: { role: result.admin.role, status: result.admin.status },
      req,
    })

    res.json({ success: true, admin: serializeAdmin(result.admin) })
  })
})

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, admin: serializeAdmin(req.admin) })
})

export const logout = asyncHandler(async (req, res) => {
  if (req.admin) {
    await logActivity({
      actor: req.admin,
      action: 'LOGOUT',
      resourceType: 'AUTH',
      details: {},
      req,
    })
  }
  req.session.destroy(() => res.json({ success: true }))
})

export const changePassword = asyncHandler(async (req, res) => {
  const currentPasswordHash = await getAdminPasswordHash(req.admin.id)
  if (!currentPasswordHash) {
    return errorResponse(res, 404, 'USER_NOT_FOUND', 'المستخدم غير موجود')
  }

  const ok = await verifyPassword(req.validated.currentPassword, currentPasswordHash)
  if (!ok) {
    return errorResponse(res, 400, 'INVALID_PASSWORD', 'كلمة المرور الحالية غير صحيحة')
  }

  await updateAdminPassword(req.admin.id, req.validated.newPassword)

  // Optionally revoke other sessions
  if (req.validated.revokeOtherSessions) {
    await revokeOtherSessions(req.admin.id, req.sessionID)
  }

  await logActivity({
    actor: req.admin,
    action: 'PASSWORD_CHANGED',
    resourceType: 'AUTH',
    resourceId: req.admin.id,
    details: { selfChanged: true },
    req,
  })

  res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' })
})

export const getSessionsInfo = asyncHandler(async (req, res) => {
  const count = await getAdminActiveSessionsCount(req.admin.id)
  res.json({
    success: true,
    sessionsCount: count,
    currentSession: {
      id: req.sessionID,
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      createdAt: req.session.cookie?.expires || null,
    },
  })
})

export const revokeMyOtherSessions = asyncHandler(async (req, res) => {
  await revokeOtherSessions(req.admin.id, req.sessionID)
  await logActivity({
    actor: req.admin,
    action: 'OTHER_SESSIONS_REVOKED',
    resourceType: 'AUTH',
    resourceId: req.admin.id,
    details: { selfRevoked: true },
    req,
  })
  res.json({ success: true, message: 'تم إنهاء جميع الجلسات الأخرى بنجاح' })
})

export const updateProfile = asyncHandler(async (req, res) => {
  const { username, email, currentPassword } = req.validated

  try {
    const updatedAdmin = await updateAdminProfile(req.admin.id, {
      username,
      email,
      currentPassword,
    })

    await logActivity({
      actor: req.admin,
      action: 'PROFILE_UPDATED',
      resourceType: 'ADMIN',
      resourceId: req.admin.id,
      details: {
        changedFields: {
          username: username !== req.admin.username,
          email: email !== req.admin.email,
        }
      },
      req,
    })

    res.json({
      success: true,
      message: 'تم تحديث بيانات الحساب بنجاح',
      admin: serializeAdmin(updatedAdmin)
    })
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') {
      return errorResponse(res, 404, 'USER_NOT_FOUND', 'المستخدم غير موجود')
    }
    if (err.message === 'INVALID_PASSWORD') {
      return errorResponse(res, 400, 'INVALID_PASSWORD', 'كلمة المرور الحالية غير صحيحة')
    }
    if (err.message === 'USERNAME_TAKEN') {
      return errorResponse(res, 409, 'USERNAME_TAKEN', 'اسم المستخدم مستخدم بالفعل')
    }
    if (err.message === 'EMAIL_TAKEN') {
      return errorResponse(res, 409, 'EMAIL_TAKEN', 'البريد الإلكتروني مستخدم بالفعل')
    }
    throw err
  }
})
