import { Router } from 'express'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import { getCustomers } from '../../controllers/admin/customer.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getCustomers)

export default router
