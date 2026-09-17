import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { createProductSchema, updateProductSchema } from '../../validators/admin/product.validator.js'
import {
  getProducts,
  getProductById,
  createOne,
  updateOne,
  removeOne,
} from '../../controllers/admin/product.controller.js'

const router = Router()

router.get('/', getProducts)
router.get('/:id', getProductById)
router.post('/', validate(createProductSchema), createOne)
router.put('/:id', validate(updateProductSchema), updateOne)
router.delete('/:id', removeOne)

export default router