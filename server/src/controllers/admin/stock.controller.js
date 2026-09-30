import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  getStockSettings,
  updateStockSettings,
  adjustStock,
  listStockMovements,
  getStockSummary,
} from '../../services/stock/stock.service.js'

export const getSettingsHandler = asyncHandler(async (_req, res) => {
  const settings = await getStockSettings()
  res.json({ success: true, data: settings })
})

export const updateSettingsHandler = asyncHandler(async (req, res) => {
  const settings = await updateStockSettings(req.validated)
  res.json({ success: true, data: settings })
})

export const getStockSummaryHandler = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
  const search = req.query.search?.trim() || ''
  const filter = ['all', 'in-stock', 'low-stock', 'out-of-stock', 'not-tracked'].includes(req.query.filter)
    ? req.query.filter
    : 'all'

  const result = await getStockSummary({ page, limit, search, filter })
  res.json({ success: true, ...result })
})

export const adjustStockHandler = asyncHandler(async (req, res) => {
  const productId = Number(req.params.productId)
  if (!Number.isInteger(productId) || productId <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف المنتج غير صحيح')
  }

  const movement = await adjustStock({
    productId,
    newStock: req.validated.newStock,
    reason: req.validated.reason,
    note: req.validated.note ?? null,
    actorAdminId: req.admin?.id ?? null,
  })
  res.json({ success: true, data: movement })
})

export const getMovementsHandler = asyncHandler(async (req, res) => {
  const productId = Number(req.params.productId)
  if (!Number.isInteger(productId) || productId <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف المنتج غير صحيح')
  }

  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
  const result = await listStockMovements({ productId, page, limit })
  res.json({ success: true, ...result })
})
