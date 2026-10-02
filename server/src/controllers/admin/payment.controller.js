import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  listPayments,
  createPayment,
  PaymentError,
} from '../../services/procurement/payment.service.js'

export const listPaymentsHandler = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const supplierId = req.query.supplierId ? Number(req.query.supplierId) : undefined
  const purchaseId = req.query.purchaseId ? Number(req.query.purchaseId) : undefined
  const paymentMethod = req.query.paymentMethod || undefined
  const startDate = req.query.startDate || undefined
  const endDate = req.query.endDate || undefined

  const result = await listPayments({
    supplierId,
    purchaseId,
    paymentMethod,
    startDate,
    endDate,
    page,
    limit,
  })

  res.json({ success: true, ...result })
})

export const createPaymentHandler = asyncHandler(async (req, res) => {
  try {
    const payment = await createPayment(req.validated, req.admin, req)
    res.status(201).json({ success: true, data: payment })
  } catch (err) {
    if (err instanceof PaymentError) {
      return errorResponse(res, err.status, err.code, err.message)
    }
    throw err
  }
})
