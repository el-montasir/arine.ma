import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import { authenticate, serializeAdmin, updateAdminPassword } from '../../services/admin/auth.service.js'
import { verifyPassword } from '../../utils/password.js'

export const login = asyncHandler(async (req, res) => {
  const result = await authenticate(req.validated.username, req.validated.password)
  if (!result) {
    return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'اسم المستخدم أو كلمة المرور غير صحيحة')
  }
  if (result.disabled) {
    return errorResponse(res, 403, 'ACCOUNT_DISABLED', 'الحساب معطّل')
  }

  // Regenerate the session id on login to prevent session fixation.
  req.session.regenerate((err) => {
    if (err) return errorResponse(res, 500, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع')
    req.session.adminId = result.admin.id
    res.json({ success: true, admin: serializeAdmin(result.admin) })
  })
})

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, admin: serializeAdmin(req.admin) })
})

export const logout = asyncHandler(async (req, res) => {
  req.session.destroy(() => res.json({ success: true }))
})

export const changePassword = asyncHandler(async (req, res) => {
  const ok = await verifyPassword(req.validated.currentPassword, req.admin.passwordHash)
  if (!ok) {
    return errorResponse(res, 400, 'INVALID_PASSWORD', 'كلمة المرور الحالية غير صحيحة')
  }
  await updateAdminPassword(req.admin.id, req.validated.newPassword)
  res.json({ success: true, message: 'تم تغيير كلمة المرور' })
})