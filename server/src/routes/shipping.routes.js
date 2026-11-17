import { Router } from 'express'
import { getShippingConfig } from '../services/shipping/index.js'
import { getCities } from '../services/shipping/digylog.client.js'

const router = Router()

// GET /api/shipping/config - Public endpoint for Store frontend
router.get('/config', async (_req, res, next) => {
  try {
    const config = await getShippingConfig()
    return res.json({
      success: true,
      data: {
        enabled: config.enabled ?? true,
        freeThreshold: config.freeThreshold,
        flatFee: config.flatFee,
        freeEnabled: config.freeEnabled,
        cityPrices: config.cityPrices || {},
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/shipping/cities - delivery cities for the checkout picker.
// Empty when DIGYLOG is not configured; the checkout then accepts free text.
router.get('/cities', async (_req, res, next) => {
  try {
    const cities = await getCities()
    return res.json({ success: true, data: cities.map((c) => ({ name: c.name, nameAr: c.nameAr })) })
  } catch (err) {
    next(err)
  }
})

export default router
