import { Router } from 'express'
import { overview, byProduct, byPeriod } from '../../controllers/admin/profit.controller.js'

const router = Router()

router.get('/overview', overview)
router.get('/by-product', byProduct)
router.get('/by-period', byPeriod)

export default router