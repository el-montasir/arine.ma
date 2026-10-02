import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import {
  createSupplierSchema,
  updateSupplierSchema,
  supplierProductSchema,
} from '../../validators/admin/supplier.validator.js'
import {
  listSuppliersHandler,
  getSuppliersSummaryHandler,
  getSupplierByIdHandler,
  createSupplierHandler,
  updateSupplierHandler,
  deleteSupplierHandler,
  listSupplierProductsHandler,
  linkSupplierProductHandler,
  removeSupplierProductHandler,
} from '../../controllers/admin/supplier.controller.js'

const router = Router()

router.get('/summary', requirePermission(PERMISSIONS.SUPPLIERS_VIEW), getSuppliersSummaryHandler)
router.get('/', requirePermission(PERMISSIONS.SUPPLIERS_VIEW), listSuppliersHandler)
router.get('/:id', requirePermission(PERMISSIONS.SUPPLIERS_VIEW), getSupplierByIdHandler)
router.post('/', requirePermission(PERMISSIONS.SUPPLIERS_MANAGE), validate(createSupplierSchema), createSupplierHandler)
router.put('/:id', requirePermission(PERMISSIONS.SUPPLIERS_MANAGE), validate(updateSupplierSchema), updateSupplierHandler)
router.patch('/:id', requirePermission(PERMISSIONS.SUPPLIERS_MANAGE), validate(updateSupplierSchema), updateSupplierHandler)
router.delete('/:id', requirePermission(PERMISSIONS.SUPPLIERS_MANAGE), deleteSupplierHandler)

router.get('/:id/products', requirePermission(PERMISSIONS.SUPPLIERS_VIEW), listSupplierProductsHandler)
router.post('/:id/products', requirePermission(PERMISSIONS.SUPPLIERS_MANAGE), validate(supplierProductSchema), linkSupplierProductHandler)
router.put('/:id/products/:productId', requirePermission(PERMISSIONS.SUPPLIERS_MANAGE), validate(supplierProductSchema), linkSupplierProductHandler)
router.delete('/:id/products/:productId', requirePermission(PERMISSIONS.SUPPLIERS_MANAGE), removeSupplierProductHandler)

export default router
