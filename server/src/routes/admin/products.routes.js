import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import { createProductSchema, updateProductSchema } from '../../validators/admin/product.validator.js'
import {
  getProducts,
  getProductById,
  createOne,
  updateOne,
  removeOne,
} from '../../controllers/admin/product.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.PRODUCTS_VIEW), getProducts)
router.get('/:id', requirePermission(PERMISSIONS.PRODUCTS_VIEW), getProductById)
router.post('/', requirePermission(PERMISSIONS.PRODUCTS_CREATE), validate(createProductSchema), createOne)
router.put('/:id', requirePermission(PERMISSIONS.PRODUCTS_UPDATE), validate(updateProductSchema), updateOne)
router.delete('/:id', requirePermission(PERMISSIONS.PRODUCTS_DELETE), removeOne)

export default router
