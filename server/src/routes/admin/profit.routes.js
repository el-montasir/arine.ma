import { Router } from 'express'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import { overview, byProduct, byPeriod } from '../../controllers/admin/profit.controller.js'

const router = Router()

router.get('/overview', requirePermission(PERMISSIONS.FINANCE_VIEW), overview)
router.get('/by-product', requirePermission(PERMISSIONS.FINANCE_VIEW), byProduct)
router.get('/by-period', requirePermission(PERMISSIONS.FINANCE_VIEW), byPeriod)

export default router
