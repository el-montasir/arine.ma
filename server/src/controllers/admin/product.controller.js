import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  serializeAdminProduct,
} from '../../services/admin/product.service.js'
import { logActivity } from '../../services/admin/activity-log.service.js'

function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export const getProducts = asyncHandler(async (req, res) => {
  const categoryId = parseId(req.query.categoryId)
  const products = await listProducts({
    search: req.query.search?.trim() || '',
    categoryId,
    availability: req.query.availability?.trim() || '',
  })
  res.json({ success: true, data: products, count: products.length })
})

export const getProductById = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'معرف الكتاب غير صحيح')
  const product = await getProduct(id)
  if (!product) return errorResponse(res, 404, 'NOT_FOUND', 'الكتاب غير موجود')
  res.json({ success: true, data: serializeAdminProduct(product) })
})

export const createOne = asyncHandler(async (req, res) => {
  const product = await createProduct(req.validated)

  await logActivity({
    actor: req.admin,
    action: 'PRODUCT_CREATED',
    resourceType: 'PRODUCT',
    resourceId: product.id,
    details: { title: product.title, price: product.price },
    req,
  })

  res.status(201).json({ success: true, data: product })
})

export const updateOne = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'معرف الكتاب غير صحيح')
  const product = await updateProduct(id, req.validated)

  await logActivity({
    actor: req.admin,
    action: 'PRODUCT_UPDATED',
    resourceType: 'PRODUCT',
    resourceId: id,
    details: { title: product.title, price: product.price },
    req,
  })

  res.json({ success: true, data: product })
})

export const removeOne = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'معرف الكتاب غير صحيح')
  await deleteProduct(id)

  await logActivity({
    actor: req.admin,
    action: 'PRODUCT_DELETED',
    resourceType: 'PRODUCT',
    resourceId: id,
    req,
  })

  res.json({ success: true, message: 'تم حذف الكتاب' })
})