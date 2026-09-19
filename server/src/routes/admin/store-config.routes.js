import { Router } from 'express'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import {
  getStoreConfigHandler,
  updateStoreConfigHandler,
} from '../../controllers/admin/store-config.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.STORE_SETTINGS_VIEW), getStoreConfigHandler)
router.put('/', requirePermission(PERMISSIONS.STORE_SETTINGS_UPDATE), updateStoreConfigHandler)

export default router
