import { Router } from 'express'
import {
  getStoreConfigHandler,
  updateStoreConfigHandler,
} from '../../controllers/admin/store-config.controller.js'

const router = Router()

router.get('/', getStoreConfigHandler)
router.put('/', updateStoreConfigHandler)

export default router
