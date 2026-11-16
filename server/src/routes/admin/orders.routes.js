import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import { updateOrderStatusSchema, createManualOrderSchema } from '../../validators/admin/order.validator.js'
import { saveOrderProfitSchema } from '../../validators/admin/sadaqa.validator.js'
import {
  getOrders,
  getOrderById,
  patchOrderStatus,
  deleteOrderHandler,
  getPendingOrdersCountHandler,
  createManualOrderHandler,
} from '../../controllers/admin/order.controller.js'
import { getOrderProfitHandler, saveOrderProfitHandler } from '../../controllers/admin/sadaqa.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.ORDERS_VIEW), getOrders)
router.post('/', requirePermission(PERMISSIONS.ORDERS_CREATE), validate(createManualOrderSchema), createManualOrderHandler)
router.get('/pending-count', requirePermission(PERMISSIONS.ORDERS_VIEW), getPendingOrdersCountHandler)
router.get('/:id', requirePermission(PERMISSIONS.ORDERS_VIEW), getOrderById)
router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.ORDERS_STATUS_UPDATE),
  validate(updateOrderStatusSchema),
  patchOrderStatus
)
router.get('/:id/profit', requirePermission(PERMISSIONS.FINANCE_VIEW), getOrderProfitHandler)
router.put(
  '/:id/profit',
  requirePermission(PERMISSIONS.FINANCE_SADAQA_MANAGE),
  validate(saveOrderProfitSchema),
  saveOrderProfitHandler
)
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.ORDERS_DELETE),
  deleteOrderHandler
)

export default router
