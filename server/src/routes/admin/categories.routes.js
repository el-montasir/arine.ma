import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { createCategorySchema, updateCategorySchema } from '../../validators/admin/category.validator.js'
import {
  getCategories,
  createOne,
  updateOne,
  removeOne,
} from '../../controllers/admin/category.controller.js'

const router = Router()

router.get('/', getCategories)
router.post('/', validate(createCategorySchema), createOne)
router.put('/:id', validate(updateCategorySchema), updateOne)
router.delete('/:id', removeOne)

export default router