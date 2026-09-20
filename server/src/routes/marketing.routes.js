import { Router } from 'express'
import { getPublicTrackingSettings } from '../services/marketing/meta-auth.service.js'

const router = Router()

// GET /api/marketing/config - Public Storefront Tracking Configuration
router.get('/config', async (_req, res, next) => {
  try {
    const config = await getPublicTrackingSettings()
    return res.json({ success: true, data: config })
  } catch (err) {
    next(err)
  }
})

export default router
