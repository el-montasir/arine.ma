import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
  resetUserPasswordSchema,
} from '../../validators/admin/user.validator.js'
import {
  getUsers,
  getUser,
  createAdminUser,
  updateAdminUser,
  changeUserStatus,
  resetPassword,
  revokeSessions,
  deleteAdminUser,
  getPermissionsList,
} from '../../controllers/admin/user.controller.js'

const router = Router()

router.get('/permissions', requirePermission(PERMISSIONS.ADMIN_USERS_VIEW), getPermissionsList)
router.get('/', requirePermission(PERMISSIONS.ADMIN_USERS_VIEW), getUsers)
router.post('/', requirePermission(PERMISSIONS.ADMIN_USERS_CREATE), validate(createUserSchema), createAdminUser)
router.get('/:id', requirePermission(PERMISSIONS.ADMIN_USERS_VIEW), getUser)
router.put('/:id', requirePermission(PERMISSIONS.ADMIN_USERS_UPDATE), validate(updateUserSchema), updateAdminUser)
router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.ADMIN_USERS_DISABLE),
  validate(updateStatusSchema),
  changeUserStatus
)
router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.ADMIN_USERS_DISABLE),
  validate(updateStatusSchema),
  changeUserStatus
)
router.post(
  '/:id/reset-password',
  requirePermission(PERMISSIONS.ADMIN_USERS_UPDATE),
  validate(resetUserPasswordSchema),
  resetPassword
)
router.post(
  '/:id/revoke-sessions',
  requirePermission(PERMISSIONS.ADMIN_USERS_UPDATE, PERMISSIONS.SECURITY_UPDATE),
  revokeSessions
)
router.delete('/:id', requirePermission(PERMISSIONS.ADMIN_USERS_DELETE), deleteAdminUser)

export default router
