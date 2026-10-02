import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  listSuppliers,
  getSuppliersGlobalSummary,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listSupplierProducts,
  addOrUpdateSupplierProduct,
  removeSupplierProduct,
} from '../../services/procurement/supplier.service.js'

export const listSuppliersHandler = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const search = req.query.search?.trim() || ''
  const city = req.query.city?.trim() || ''
  const sortBy = req.query.sortBy || 'recent'
  const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined

  const result = await listSuppliers({
    search,
    isActive,
    city,
    sortBy,
    page,
    limit,
  })

  res.json({ success: true, ...result })
})

export const getSuppliersSummaryHandler = asyncHandler(async (_req, res) => {
  const summary = await getSuppliersGlobalSummary()
  res.json({ success: true, data: summary })
})

export const getSupplierByIdHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف المورد غير صحيح')
  }

  const supplier = await getSupplierById(id)
  if (!supplier) {
    return errorResponse(res, 404, 'SUPPLIER_NOT_FOUND', 'المورد غير موجود')
  }

  res.json({ success: true, data: supplier })
})

export const createSupplierHandler = asyncHandler(async (req, res) => {
  const supplier = await createSupplier(req.validated, req.admin, req)
  res.status(201).json({ success: true, data: supplier })
})

export const updateSupplierHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف المورد غير صحيح')
  }

  const supplier = await updateSupplier(id, req.validated, req.admin, req)
  res.json({ success: true, data: supplier })
})

export const deleteSupplierHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف المورد غير صحيح')
  }

  const result = await deleteSupplier(id, req.admin, req)
  res.json({ success: true, ...result })
})

export const listSupplierProductsHandler = asyncHandler(async (req, res) => {
  const supplierId = Number(req.params.id)
  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف المورد غير صحيح')
  }

  const products = await listSupplierProducts(supplierId)
  res.json({ success: true, data: products })
})

export const linkSupplierProductHandler = asyncHandler(async (req, res) => {
  const supplierId = Number(req.params.id)
  const productId = Number(req.params.productId || req.validated.productId)
  if (!Number.isInteger(supplierId) || !Number.isInteger(productId)) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف المورد أو المنتج غير صحيح')
  }

  const linked = await addOrUpdateSupplierProduct(supplierId, productId, req.validated)
  res.json({ success: true, data: linked })
})

export const removeSupplierProductHandler = asyncHandler(async (req, res) => {
  const supplierId = Number(req.params.id)
  const productId = Number(req.params.productId)
  if (!Number.isInteger(supplierId) || !Number.isInteger(productId)) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف المورد أو المنتج غير صحيح')
  }

  await removeSupplierProduct(supplierId, productId)
  res.json({ success: true, message: 'تم إزالة ربط المنتج بنجاح' })
})
