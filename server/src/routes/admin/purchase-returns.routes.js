import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import { createPurchaseReturnSchema } from '../../validators/admin/purchase-return.validator.js'
import {
  listPurchaseReturnsHandler,
  getPurchaseReturnByIdHandler,
  createPurchaseReturnHandler,
  confirmPurchaseReturnHandler,
} from '../../controllers/admin/purchase-return.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.RETURNS_VIEW), listPurchaseReturnsHandler)
router.get('/:id', requirePermission(PERMISSIONS.RETURNS_VIEW), getPurchaseReturnByIdHandler)
router.post('/', requirePermission(PERMISSIONS.RETURNS_MANAGE), validate(createPurchaseReturnSchema), createPurchaseReturnHandler)
router.post('/:id/confirm', requirePermission(PERMISSIONS.RETURNS_MANAGE), confirmPurchaseReturnHandler)

export default router
