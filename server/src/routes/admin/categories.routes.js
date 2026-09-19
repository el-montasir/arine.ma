import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import { createCategorySchema, updateCategorySchema } from '../../validators/admin/category.validator.js'
import {
  getCategories,
  createOne,
  updateOne,
  removeOne,
} from '../../controllers/admin/category.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.CATEGORIES_VIEW), getCategories)
router.post('/', requirePermission(PERMISSIONS.CATEGORIES_CREATE), validate(createCategorySchema), createOne)
router.put('/:id', requirePermission(PERMISSIONS.CATEGORIES_UPDATE), validate(updateCategorySchema), updateOne)
router.delete('/:id', requirePermission(PERMISSIONS.CATEGORIES_DELETE), removeOne)

export default router
