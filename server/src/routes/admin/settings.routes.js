import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import { upsertSettingSchema } from '../../validators/admin/settings.validator.js'
import { getSettings, updateSetting } from '../../controllers/admin/setting.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.STORE_SETTINGS_VIEW, PERMISSIONS.SECURITY_VIEW), getSettings)
router.post(
  '/',
  requirePermission(PERMISSIONS.STORE_SETTINGS_UPDATE, PERMISSIONS.SECURITY_UPDATE),
  validate(upsertSettingSchema),
  updateSetting
)

export default router
