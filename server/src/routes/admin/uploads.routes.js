import { Router } from 'express'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
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

// Product images upload
router.post(
  '/products',
  requirePermission(PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_UPDATE),
  handleMulterError(uploadProductsMulter.array('images', 10)),
  uploadProductImages
)

// Package images upload
router.post(
  '/packages',
  requirePermission(PERMISSIONS.PACKAGES_CREATE, PERMISSIONS.PACKAGES_UPDATE),
  handleMulterError(uploadPackagesMulter.array('images', 10)),
  uploadPackageImages
)

// Branding logo & banners upload
router.post(
  '/branding',
  requirePermission(
    PERMISSIONS.STORE_SETTINGS_UPDATE,
    PERMISSIONS.BANNERS_CREATE,
    PERMISSIONS.BANNERS_UPDATE
  ),
  handleMulterError(uploadBrandingMulter.any()),
  uploadBrandingLogo
)

export default router
