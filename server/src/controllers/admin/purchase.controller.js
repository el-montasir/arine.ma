import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  listPurchases,
  getPurchasesGlobalSummary,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  updatePurchaseStatus,
  receivePurchaseItems,
  PurchaseError,
} from '../../services/procurement/purchase.service.js'

export const listPurchasesHandler = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const search = req.query.search?.trim() || ''
  const supplierId = req.query.supplierId ? Number(req.query.supplierId) : undefined
  const status = req.query.status || undefined
  const paymentStatus = req.query.paymentStatus || undefined
  const startDate = req.query.startDate || undefined
  const endDate = req.query.endDate || undefined
  const sortBy = req.query.sortBy || 'recent'

  const result = await listPurchases({
    search,
    supplierId,
    status,
    paymentStatus,
    startDate,
    endDate,
    sortBy,
    page,
    limit,
  })

  res.json({ success: true, ...result })
})

export const getPurchasesSummaryHandler = asyncHandler(async (_req, res) => {
  const summary = await getPurchasesGlobalSummary()
  res.json({ success: true, data: summary })
})

export const getPurchaseByIdHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف طلب الشراء غير صحيح')
  }

  const purchase = await getPurchaseById(id)
  if (!purchase) {
    return errorResponse(res, 404, 'PURCHASE_NOT_FOUND', 'طلب الشراء غير موجود')
  }

  res.json({ success: true, data: purchase })
})

export const createPurchaseHandler = asyncHandler(async (req, res) => {
  try {
    const purchase = await createPurchase(req.validated, req.admin, req)
    res.status(201).json({ success: true, data: purchase })
  } catch (err) {
    if (err instanceof PurchaseError) {
      return errorResponse(res, err.status, err.code, err.message)
    }
    throw err
  }
})

export const updatePurchaseHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف طلب الشراء غير صحيح')
  }

  try {
    const purchase = await updatePurchase(id, req.validated, req.admin, req)
    res.json({ success: true, data: purchase })
  } catch (err) {
    if (err instanceof PurchaseError) {
      return errorResponse(res, err.status, err.code, err.message)
    }
    throw err
  }
})

export const updatePurchaseStatusHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف طلب الشراء غير صحيح')
  }

  try {
    const purchase = await updatePurchaseStatus(id, req.validated.status, req.admin, req)
    res.json({ success: true, data: purchase })
  } catch (err) {
    if (err instanceof PurchaseError) {
      return errorResponse(res, err.status, err.code, err.message)
    }
    throw err
  }
})

export const receivePurchaseItemsHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف طلب الشراء غير صحيح')
  }

  try {
    const purchase = await receivePurchaseItems(id, req.validated, req.admin, req)
    res.json({ success: true, data: purchase })
  } catch (err) {
    if (err instanceof PurchaseError) {
      return errorResponse(res, err.status, err.code, err.message)
    }
    throw err
  }
})
