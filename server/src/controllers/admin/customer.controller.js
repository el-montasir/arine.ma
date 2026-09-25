import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  listCustomers,
  getCustomer,
  updateCustomer,
  archiveCustomer,
  deleteCustomer,
} from '../../services/admin/customer.service.js'
import { logActivity } from '../../services/admin/activity-log.service.js'

export const getCustomers = asyncHandler(async (req, res) => {
  const customers = await listCustomers({
    search: req.query.search?.trim() || '',
    status: req.query.status?.trim() || '',
  })
  res.json({ success: true, data: customers, count: customers.length })
})

export const getCustomerById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف العميل غير صحيح')
  }
  const customer = await getCustomer(id)
  res.json({ success: true, data: customer })
})

export const patchCustomer = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف العميل غير صحيح')
  }

  const updated = await updateCustomer(id, req.validated || req.body)

  await logActivity({
    actor: req.admin,
    action: 'CUSTOMER_UPDATED',
    resourceType: 'CUSTOMER',
    resourceId: id,
    details: {
      customerId: id,
      fullName: updated.fullName,
      phone: updated.phone,
      status: updated.status,
    },
    req,
  })

  res.json({ success: true, data: updated, message: 'تم تحديث بيانات العميل بنجاح' })
})

export const archiveCustomerHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف العميل غير صحيح')
  }

  const targetStatus = req.body.status || 'ARCHIVED'
  const updated = await archiveCustomer(id, targetStatus)

  await logActivity({
    actor: req.admin,
    action: targetStatus === 'ARCHIVED' ? 'CUSTOMER_ARCHIVED' : 'CUSTOMER_UNARCHIVED',
    resourceType: 'CUSTOMER',
    resourceId: id,
    details: {
      customerId: id,
      fullName: updated.fullName,
      phone: updated.phone,
      status: updated.status,
    },
    req,
  })

  res.json({
    success: true,
    data: updated,
    message: targetStatus === 'ARCHIVED' ? 'تم أرشفة العميل بنجاح' : 'تم استعادة العميل بنجاح',
  })
})

export const deleteCustomerHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف العميل غير صحيح')
  }

  const deleted = await deleteCustomer(id)

  await logActivity({
    actor: req.admin,
    action: 'CUSTOMER_DELETED',
    resourceType: 'CUSTOMER',
    resourceId: id,
    details: {
      customerId: id,
      fullName: deleted.fullName,
      phone: deleted.phone,
    },
    req,
  })

  res.json({
    success: true,
    message: 'تم حذف العميل بنجاح',
  })
})
