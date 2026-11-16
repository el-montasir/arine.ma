import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import {
  createSadaqaPaymentSchema,
  voidSadaqaPaymentSchema,
  setSadaqaRateSchema,
} from '../../validators/admin/sadaqa.validator.js'
import {
  getSummaryHandler,
  getMonthHandler,
  createPaymentHandler,
  voidPaymentHandler,
  getRatesHandler,
  setRateHandler,
} from '../../controllers/admin/sadaqa.controller.js'

const router = Router()

router.get('/summary', requirePermission(PERMISSIONS.FINANCE_VIEW), getSummaryHandler)
router.get('/months/:month', requirePermission(PERMISSIONS.FINANCE_VIEW), getMonthHandler)
router.get('/rate', requirePermission(PERMISSIONS.FINANCE_VIEW), getRatesHandler)
router.put(
  '/rate',
  requirePermission(PERMISSIONS.FINANCE_SADAQA_MANAGE),
  validate(setSadaqaRateSchema),
  setRateHandler
)
router.post(
  '/payments',
  requirePermission(PERMISSIONS.FINANCE_SADAQA_MANAGE),
  validate(createSadaqaPaymentSchema),
  createPaymentHandler
)
router.post(
  '/payments/:id/void',
  requirePermission(PERMISSIONS.FINANCE_SADAQA_MANAGE),
  validate(voidSadaqaPaymentSchema),
  voidPaymentHandler
)

export default router
