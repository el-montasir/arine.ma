import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse, successResponse } from '../../utils/api-response.js'
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
  deleteUser,
  revokeAdminSessions,
} from '../../services/admin/user.service.js'
import { logActivity } from '../../services/admin/activity-log.service.js'
import { ALL_PERMISSIONS, PERMISSION_GROUPS, ROLE_PRESETS } from '../../constants/permissions.js'

export const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, search, status, role } = req.query
  const result = await listUsers({ page, limit, search, status, role })
  res.json({ success: true, data: result.users, users: result.users, stats: result.stats, pagination: result.pagination })
})

export const getUser = asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id)
  if (!user) {
    return errorResponse(res, 404, 'USER_NOT_FOUND', 'المستخدم غير موجود')
  }
  res.json({ success: true, user })
})

export const createAdminUser = asyncHandler(async (req, res) => {
  try {
    const user = await createUser(req.validated, req.admin)
    await logActivity({
      actor: req.admin,
      action: 'USER_CREATED',
      resourceType: 'ADMIN_USER',
      resourceId: user.id,
      details: {
        createdUserId: user.id,
        createdUserName: user.name,
        createdUserEmail: user.email,
        role: user.role,
        permissionsCount: user.permissions?.length || 0,
      },
      req,
    })
    res.status(201).json({ success: true, user, data: user })
  } catch (err) {
    if (err.code === 'EMAIL_EXISTS' || err.code === 'USERNAME_EXISTS') {
      return errorResponse(res, 409, err.code, err.message)
    }
    throw err
  }
})

export const updateAdminUser = asyncHandler(async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.validated, req.admin)
    await logActivity({
      actor: req.admin,
      action: 'USER_UPDATED',
      resourceType: 'ADMIN_USER',
      resourceId: user.id,
      details: {
        updatedUserId: user.id,
        updatedUserName: user.name,
        updatedUserEmail: user.email,
        role: user.role,
        status: user.status,
      },
      req,
    })
    res.json({ success: true, user, data: user })
  } catch (err) {
    if (err.code === 'USER_NOT_FOUND') {
      return errorResponse(res, 404, err.code, err.message)
    }
    if (err.code === 'EMAIL_EXISTS') {
      return errorResponse(res, 409, err.code, err.message)
    }
    if (err.code === 'LAST_OWNER_PROTECTION' || err.code === 'FORBIDDEN') {
      return errorResponse(res, err.status || 400, err.code, err.message)
    }
    throw err
  }
})

export const changeUserStatus = asyncHandler(async (req, res) => {
  try {
    const { status } = req.validated
    const user = await updateUserStatus(req.params.id, status, req.admin)
    const action = status === 'ACTIVE' ? 'USER_ENABLED' : 'USER_DISABLED'
    await logActivity({
      actor: req.admin,
      action,
      resourceType: 'ADMIN_USER',
      resourceId: user.id,
      details: {
        targetUserId: user.id,
        targetUserEmail: user.email,
        newStatus: status,
      },
      req,
    })
    res.json({ success: true, user, data: user })
  } catch (err) {
    if (err.code === 'USER_NOT_FOUND') {
      return errorResponse(res, 404, err.code, err.message)
    }
    if (err.code === 'LAST_OWNER_PROTECTION') {
      return errorResponse(res, 400, err.code, err.message)
    }
    throw err
  }
})

export const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { newPassword, revokeSessions } = req.validated
    const user = await resetUserPassword(req.params.id, newPassword, revokeSessions)
    await logActivity({
      actor: req.admin,
      action: 'PASSWORD_RESET',
      resourceType: 'ADMIN_USER',
      resourceId: user.id,
      details: {
        targetUserId: user.id,
        targetUserEmail: user.email,
        sessionsRevoked: revokeSessions,
      },
      req,
    })
    res.json({ success: true, message: 'تم إعادة تعيين كلمة المرور بنجاح' })
  } catch (err) {
    if (err.code === 'USER_NOT_FOUND') {
      return errorResponse(res, 404, err.code, err.message)
    }
    throw err
  }
})

export const revokeSessions = asyncHandler(async (req, res) => {
  const adminId = parseInt(req.params.id, 10)
  const user = await getUserById(adminId)
  if (!user) {
    return errorResponse(res, 404, 'USER_NOT_FOUND', 'المستخدم غير موجود')
  }

  await revokeAdminSessions(adminId)
  await logActivity({
    actor: req.admin,
    action: 'SESSIONS_REVOKED',
    resourceType: 'ADMIN_USER',
    resourceId: adminId,
    details: { targetUserId: adminId, targetUserEmail: user.email },
    req,
  })
  res.json({ success: true, message: 'تم إنهاء جميع جلسات المستخدم النشطة' })
})

export const deleteAdminUser = asyncHandler(async (req, res) => {
  try {
    const user = await deleteUser(req.params.id, req.admin)
    await logActivity({
      actor: req.admin,
      action: 'USER_DELETED',
      resourceType: 'ADMIN_USER',
      resourceId: user.id,
      details: { deletedUserId: user.id, deletedUserEmail: user.email },
      req,
    })
    res.json({ success: true, message: 'تم حذف المستخدم بنجاح' })
  } catch (err) {
    if (err.code === 'USER_NOT_FOUND') {
      return errorResponse(res, 404, err.code, err.message)
    }
    if (err.code === 'LAST_OWNER_PROTECTION') {
      return errorResponse(res, 400, err.code, err.message)
    }
    throw err
  }
})

export const getPermissionsList = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    allPermissions: ALL_PERMISSIONS,
    permissionGroups: PERMISSION_GROUPS,
    rolePresets: ROLE_PRESETS,
  })
})
