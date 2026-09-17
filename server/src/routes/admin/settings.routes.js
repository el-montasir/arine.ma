import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { upsertSettingSchema } from '../../validators/admin/settings.validator.js'
import { getSettings, updateSetting } from '../../controllers/admin/setting.controller.js'

const router = Router()

router.get('/', getSettings)
router.post('/', validate(upsertSettingSchema), updateSetting)

export default router