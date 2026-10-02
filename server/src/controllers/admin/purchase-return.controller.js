import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  listPurchaseReturns,
  getPurchaseReturnById,
  createPurchaseReturn,
  confirmPurchaseReturn,
  PurchaseReturnError,
} from '../../services/procurement/purchase-return.service.js'

export const listPurchaseReturnsHandler = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const supplierId = req.query.supplierId ? Number(req.query.supplierId) : undefined
  const purchaseId = req.query.purchaseId ? Number(req.query.purchaseId) : undefined
  const status = req.query.status || undefined
  const startDate = req.query.startDate || undefined
  const endDate = req.query.endDate || undefined

  const result = await listPurchaseReturns({
    supplierId,
    purchaseId,
    status,
    startDate,
    endDate,
    page,
    limit,
  })

  res.json({ success: true, ...result })
})

export const getPurchaseReturnByIdHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف المرتجع غير صحيح')
  }

  const purchaseReturn = await getPurchaseReturnById(id)
  if (!purchaseReturn) {
    return errorResponse(res, 404, 'RETURN_NOT_FOUND', 'سجل المرتجع غير موجود')
  }

  res.json({ success: true, data: purchaseReturn })
})

export const createPurchaseReturnHandler = asyncHandler(async (req, res) => {
  try {
    const purchaseReturn = await createPurchaseReturn(req.validated, req.admin, req)
    res.status(201).json({ success: true, data: purchaseReturn })
  } catch (err) {
    if (err instanceof PurchaseReturnError) {
      return errorResponse(res, err.status, err.code, err.message)
    }
    throw err
  }
})

export const confirmPurchaseReturnHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف المرتجع غير صحيح')
  }

  try {
    const confirmed = await confirmPurchaseReturn(id, req.admin, req)
    res.json({ success: true, data: confirmed })
  } catch (err) {
    if (err instanceof PurchaseReturnError) {
      return errorResponse(res, err.status, err.code, err.message)
    }
    throw err
  }
})
