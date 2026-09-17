import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  getProfitOverview,
  getProfitByProduct,
  getProfitByPeriod,
} from '../../services/admin/profit.service.js'

function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? 'invalid' : d
}

export const overview = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getProfitOverview() })
})

export const byProduct = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getProfitByProduct() })
})

export const byPeriod = asyncHandler(async (req, res) => {
  const from = parseDate(req.query.from)
  const to = parseDate(req.query.to)
  if (from === 'invalid' || to === 'invalid') {
    return errorResponse(res, 400, 'INVALID_DATE', 'التاريخ غير صحيح')
  }
  res.json({ success: true, data: await getProfitByPeriod({ from, to }) })
})