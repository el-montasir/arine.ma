import { Router } from 'express'
import {
  uploadProductsMulter,
  uploadPackagesMulter,
  uploadBrandingMulter,
  handleMulterError,
} from '../../middleware/upload.middleware.js'
import {
  uploadProductImages,
  uploadPackageImages,
  uploadBrandingLogo,
} from '../../controllers/admin/upload.controller.js'

const router = Router()

// Support both single and multiple uploads under fields 'images', 'image', 'file', 'files'
router.post(
  '/products',
  handleMulterError(uploadProductsMulter.array('images', 10)),
  uploadProductImages
)

router.post(
  '/packages',
  handleMulterError(uploadPackagesMulter.array('images', 10)),
  uploadPackageImages
)

// Branding logo upload (supports 'logo', 'image', 'file', 'images')
router.post(
  '/branding',
  handleMulterError(uploadBrandingMulter.any()),
  uploadBrandingLogo
)

export default router
