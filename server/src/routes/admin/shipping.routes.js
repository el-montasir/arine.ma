import { Router } from 'express'
import {
  getShippingStatusHandler,
  getShippingConfigHandler,
  updateShippingConfigHandler,
  getShippingProvidersHandler,
  setActiveProviderHandler,
} from '../../controllers/admin/shipping.controller.js'

const router = Router()

router.get('/status', getShippingStatusHandler)
router.get('/config', getShippingConfigHandler)
router.put('/config', updateShippingConfigHandler)
router.get('/providers', getShippingProvidersHandler)
router.post('/active-provider', setActiveProviderHandler)

export default router
