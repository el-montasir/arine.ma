import { Router } from 'express'
import { createOrderHandler, getOrderByNumber } from '../controllers/order.controller.js'
import { validate } from '../middleware/validate.middleware.js'
import { orderLimiter } from '../middleware/rate-limit.middleware.js'
import { createOrderSchema } from '../validators/order.validator.js'

const router = Router()

router.post('/', orderLimiter, validate(createOrderSchema), createOrderHandler)
router.get('/:orderNumber', getOrderByNumber)

export default router