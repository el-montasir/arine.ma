import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import {
  createPurchaseSchema,
  updatePurchaseSchema,
  updatePurchaseStatusSchema,
  receivePurchaseItemsSchema,
} from '../../validators/admin/purchase.validator.js'
import {
  listPurchasesHandler,
  getPurchasesSummaryHandler,
  getPurchaseByIdHandler,
  createPurchaseHandler,
  updatePurchaseHandler,
  updatePurchaseStatusHandler,
  receivePurchaseItemsHandler,
} from '../../controllers/admin/purchase.controller.js'

const router = Router()

router.get('/summary', requirePermission(PERMISSIONS.PURCHASES_VIEW), getPurchasesSummaryHandler)
router.get('/', requirePermission(PERMISSIONS.PURCHASES_VIEW), listPurchasesHandler)
router.get('/:id', requirePermission(PERMISSIONS.PURCHASES_VIEW), getPurchaseByIdHandler)
router.post('/', requirePermission(PERMISSIONS.PURCHASES_MANAGE), validate(createPurchaseSchema), createPurchaseHandler)
router.put('/:id', requirePermission(PERMISSIONS.PURCHASES_MANAGE), validate(updatePurchaseSchema), updatePurchaseHandler)
router.patch('/:id', requirePermission(PERMISSIONS.PURCHASES_MANAGE), validate(updatePurchaseSchema), updatePurchaseHandler)
router.patch('/:id/status', requirePermission(PERMISSIONS.PURCHASES_MANAGE), validate(updatePurchaseStatusSchema), updatePurchaseStatusHandler)
router.post('/:id/receive', requirePermission(PERMISSIONS.PURCHASES_RECEIVE), validate(receivePurchaseItemsSchema), receivePurchaseItemsHandler)

export default router
