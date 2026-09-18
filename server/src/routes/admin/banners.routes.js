import { Router } from 'express'
import {
  getBannersHandler,
  getBannerByIdHandler,
  createBannerHandler,
  updateBannerHandler,
  deleteBannerHandler,
} from '../../controllers/admin/banner.controller.js'

const router = Router()

router.get('/', getBannersHandler)
router.get('/:id', getBannerByIdHandler)
router.post('/', createBannerHandler)
router.put('/:id', updateBannerHandler)
router.delete('/:id', deleteBannerHandler)

export default router
