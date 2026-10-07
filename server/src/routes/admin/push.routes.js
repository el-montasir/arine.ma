import { Router } from 'express'
import {
  getPublicKey,
  subscribe,
  unsubscribe,
  getUnseenCount,
  getStatus,
} from '../../controllers/admin/push.controller.js'

const router = Router()

router.get('/public-key', getPublicKey)
router.post('/subscribe', subscribe)
router.post('/unsubscribe', unsubscribe)
router.get('/unseen-order-count', getUnseenCount)
router.get('/status', getStatus)
router.post('/status', getStatus)

export default router
