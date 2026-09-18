import { Router } from 'express'
import { getPublicStoreConfig } from '../controllers/store-config.controller.js'

const router = Router()

router.get('/', getPublicStoreConfig)

export default router
