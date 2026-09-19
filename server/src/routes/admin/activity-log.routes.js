import { Router } from 'express'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import { getActivityLogs } from '../../controllers/admin/activity-log.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.ACTIVITY_LOG_VIEW), getActivityLogs)

export default router
