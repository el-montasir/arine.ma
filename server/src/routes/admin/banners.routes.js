import { Router } from 'express'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import {
  getBannersHandler,
  getBannerByIdHandler,
  createBannerHandler,
  updateBannerHandler,
  deleteBannerHandler,
} from '../../controllers/admin/banner.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.BANNERS_VIEW), getBannersHandler)
router.get('/:id', requirePermission(PERMISSIONS.BANNERS_VIEW), getBannerByIdHandler)
router.post('/', requirePermission(PERMISSIONS.BANNERS_CREATE), createBannerHandler)
router.put('/:id', requirePermission(PERMISSIONS.BANNERS_UPDATE), updateBannerHandler)
router.delete('/:id', requirePermission(PERMISSIONS.BANNERS_DELETE), deleteBannerHandler)

export default router
