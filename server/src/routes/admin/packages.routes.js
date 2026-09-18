import { Router } from 'express'
import {
  getAdminPackages,
  getAdminPackageById,
  createAdminPackage,
  updateAdminPackage,
  deleteAdminPackage,
} from '../../controllers/admin/package.controller.js'

const router = Router()

router.get('/', getAdminPackages)
router.get('/:id', getAdminPackageById)
router.post('/', createAdminPackage)
router.put('/:id', updateAdminPackage)
router.delete('/:id', deleteAdminPackage)

export default router
