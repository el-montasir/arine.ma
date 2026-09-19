import { Router } from 'express'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import {
  getAdminPackages,
  getAdminPackageById,
  createAdminPackage,
  updateAdminPackage,
  deleteAdminPackage,
} from '../../controllers/admin/package.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.PACKAGES_VIEW), getAdminPackages)
router.get('/:id', requirePermission(PERMISSIONS.PACKAGES_VIEW), getAdminPackageById)
router.post('/', requirePermission(PERMISSIONS.PACKAGES_CREATE), createAdminPackage)
router.put('/:id', requirePermission(PERMISSIONS.PACKAGES_UPDATE), updateAdminPackage)
router.delete('/:id', requirePermission(PERMISSIONS.PACKAGES_DELETE), deleteAdminPackage)

export default router
