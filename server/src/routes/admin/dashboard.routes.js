import { Router } from 'express'
import { asyncHandler } from '../../utils/async-handler.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import { getDashboard } from '../../controllers/admin/dashboard.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.DASHBOARD_VIEW), asyncHandler(getDashboard))

export default router
