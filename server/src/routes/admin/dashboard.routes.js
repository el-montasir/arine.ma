import { Router } from 'express'
import { asyncHandler } from '../../utils/async-handler.js'
import { getDashboard } from '../../controllers/admin/dashboard.controller.js'

const router = Router()

router.get('/', asyncHandler(getDashboard))

export default router