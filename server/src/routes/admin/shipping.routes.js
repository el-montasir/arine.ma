import { Router } from 'express'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import {
  getShippingStatusHandler,
  getShippingConfigHandler,
  updateShippingConfigHandler,
  getShippingProvidersHandler,
  setActiveProviderHandler,
} from '../../controllers/admin/shipping.controller.js'

const router = Router()

router.get('/status', requirePermission(PERMISSIONS.SHIPPING_VIEW), getShippingStatusHandler)
router.get('/config', requirePermission(PERMISSIONS.SHIPPING_VIEW), getShippingConfigHandler)
router.put('/config', requirePermission(PERMISSIONS.SHIPPING_UPDATE), updateShippingConfigHandler)
router.get('/providers', requirePermission(PERMISSIONS.SHIPPING_VIEW), getShippingProvidersHandler)
router.post('/active-provider', requirePermission(PERMISSIONS.SHIPPING_UPDATE), setActiveProviderHandler)

export default router
