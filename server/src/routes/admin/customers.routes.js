import { Router } from 'express'
import { getCustomers } from '../../controllers/admin/customer.controller.js'

const router = Router()

router.get('/', getCustomers)

export default router