import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import { updateOrderStatusSchema } from '../../validators/admin/order.validator.js'
import {
  getOrders,
  getOrderById,
  patchOrderStatus,
  deleteOrderHandler,
  getPendingOrdersCountHandler,
} from '../../controllers/admin/order.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.ORDERS_VIEW), getOrders)
router.get('/pending-count', requirePermission(PERMISSIONS.ORDERS_VIEW), getPendingOrdersCountHandler)
router.get('/:id', requirePermission(PERMISSIONS.ORDERS_VIEW), getOrderById)
router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.ORDERS_STATUS_UPDATE),
  validate(updateOrderStatusSchema),
  patchOrderStatus
)
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.ORDERS_DELETE),
  deleteOrderHandler
)

export default router
