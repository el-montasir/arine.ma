import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import { logActivity } from '../../services/admin/activity-log.service.js'
import {
  getOrderProfit,
  saveOrderProfit,
  getSadaqaSummary,
  getSadaqaMonth,
  recordSadaqaPayment,
  voidSadaqaPayment,
  getSadaqaRates,
  setSadaqaRate,
} from '../../services/admin/sadaqa.service.js'

function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

// Compact audit view of an order's profit state.
function profitAudit(p) {
  return {
    mode: p.mode,
    manualProfitCents: p.manualProfitCents,
    goodsCostOverrideCents: p.goodsCostOverrideCents,
    charges: p.charges.map((c) => ({ type: c.type, amountCents: c.amountCents, note: c.note })),
    deliveredAt: p.deliveredAt,
    realProfitCents: p.calc.realProfitCents,
    sadaqaCents: p.calc.sadaqaCents,
  }
}

export const getOrderProfitHandler = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'معرف الطلب غير صحيح')
  res.json({ success: true, data: await getOrderProfit(id) })
})

export const saveOrderProfitHandler = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'معرف الطلب غير صحيح')

  const { before, after } = await saveOrderProfit(id, req.validated, req.admin)

  await logActivity({
    actor: req.admin,
    action: 'ORDER_PROFIT_UPDATED',
    resourceType: 'ORDER',
    resourceId: id,
    details: {
      orderNumber: after.orderNumber,
      reason: req.validated.note ?? null,
      before: profitAudit(before),
      after: profitAudit(after),
      monthAlreadyPaid: after.monthPaid,
    },
    req,
  })

  res.json({ success: true, data: after })
})

export const getSummaryHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getSadaqaSummary() })
})

export const getMonthHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getSadaqaMonth(req.params.month) })
})

export const createPaymentHandler = asyncHandler(async (req, res) => {
  const payment = await recordSadaqaPayment(req.validated, req.admin)

  await logActivity({
    actor: req.admin,
    action: 'SADAQA_PAYMENT_RECORDED',
    resourceType: 'SADAQA_PAYMENT',
    resourceId: payment.id,
    details: {
      periodMonth: payment.periodMonth,
      amountCents: payment.amountCents,
      paidAt: payment.paidAt,
      reference: payment.reference,
      dueSnapshotCents: payment.dueSnapshotCents,
    },
    req,
  })

  res.status(201).json({ success: true, data: payment })
})

export const voidPaymentHandler = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'المعرف غير صحيح')

  const payment = await voidSadaqaPayment(id, req.validated.reason, req.admin)

  await logActivity({
    actor: req.admin,
    action: 'SADAQA_PAYMENT_VOIDED',
    resourceType: 'SADAQA_PAYMENT',
    resourceId: id,
    details: { periodMonth: payment.periodMonth, amountCents: payment.amountCents, reason: payment.voidReason },
    req,
  })

  res.json({ success: true, data: payment })
})

export const getRatesHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getSadaqaRates() })
})

export const setRateHandler = asyncHandler(async (req, res) => {
  const result = await setSadaqaRate(req.validated.rateBp, req.admin)

  await logActivity({
    actor: req.admin,
    action: 'SADAQA_RATE_UPDATED',
    resourceType: 'SADAQA_RATE',
    details: result,
    req,
  })

  res.json({ success: true, data: await getSadaqaRates() })
})
