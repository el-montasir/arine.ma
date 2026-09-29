import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import { adjustStockSchema, updateStockSettingsSchema } from '../../validators/admin/stock.validator.js'
import {
  getSettingsHandler,
  updateSettingsHandler,
  getStockSummaryHandler,
  adjustStockHandler,
  getMovementsHandler,
} from '../../controllers/admin/stock.controller.js'

const router = Router()

router.get('/settings', requirePermission(PERMISSIONS.STOCK_VIEW), getSettingsHandler)
router.patch('/settings', requirePermission(PERMISSIONS.STOCK_SETTINGS_UPDATE), validate(updateStockSettingsSchema), updateSettingsHandler)

router.get('/', requirePermission(PERMISSIONS.STOCK_VIEW), getStockSummaryHandler)
router.post('/products/:productId/adjust', requirePermission(PERMISSIONS.STOCK_ADJUST), validate(adjustStockSchema), adjustStockHandler)
router.get('/products/:productId/movements', requirePermission(PERMISSIONS.STOCK_VIEW), getMovementsHandler)

export default router
