import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { updateOrderStatusSchema } from '../../validators/admin/order.validator.js'
import {
  getOrders,
  getOrderById,
  patchOrderStatus,
} from '../../controllers/admin/order.controller.js'

const router = Router()

router.get('/', getOrders)
router.get('/:id', getOrderById)
router.patch('/:id/status', validate(updateOrderStatusSchema), patchOrderStatus)

export default router