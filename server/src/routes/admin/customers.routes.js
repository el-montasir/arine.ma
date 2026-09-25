import { Router } from 'express'
import { validate } from '../../middleware/validate.middleware.js'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import {
  updateCustomerSchema,
  archiveCustomerSchema,
} from '../../validators/admin/customer.validator.js'
import {
  getCustomers,
  getCustomerById,
  patchCustomer,
  archiveCustomerHandler,
  deleteCustomerHandler,
} from '../../controllers/admin/customer.controller.js'

const router = Router()

router.get('/', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getCustomers)
router.get('/:id', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getCustomerById)
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.CUSTOMERS_UPDATE),
  validate(updateCustomerSchema),
  patchCustomer
)
router.patch(
  '/:id/archive',
  requirePermission(PERMISSIONS.CUSTOMERS_ARCHIVE),
  validate(archiveCustomerSchema),
  archiveCustomerHandler
)
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.CUSTOMERS_DELETE),
  deleteCustomerHandler
)

export default router
