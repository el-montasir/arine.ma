import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import { createPaymentSchema } from '../../validators/admin/payment.validator.js'
import {
  listPaymentsHandler,
  createPaymentHandler,
} from '../../controllers/admin/payment.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.PAYMENTS_VIEW), listPaymentsHandler)
router.post('/', requirePermission(PERMISSIONS.PAYMENTS_MANAGE), validate(createPaymentSchema), createPaymentHandler)

export default router
