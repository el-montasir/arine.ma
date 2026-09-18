import { Router } from 'express'
import { getShippingConfig } from '../services/shipping/index.js'

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
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
