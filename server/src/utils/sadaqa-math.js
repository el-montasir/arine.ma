// Admin-only real-profit & sadaqa math. Pure functions, no database access.
//
// Units: order money (subtotal, shipping, total, unit prices/costs) is whole
// dirhams, as everywhere else in the store. Everything this module returns is
// integer centimes (1 DH = 100), because 7 % of a whole-dirham profit is not a
// whole dirham. Rates are basis points (700 = 7 %).
//
// Shipping reconciliation: the shipping billed to the customer (order.shipping)
// is treated as passing straight through to the courier, so it cancels out:
//   collected − goods cost − standard shipping = (total − shipping) − goods cost
// Anything the courier charged above that (35 → 40/45, or the whole fee on a
// free-shipping order) is entered by the admin as an extra charge.

import { orderFinance } from './admin-finance.js'

export const SADAQA_TIMEZONE = 'Africa/Casablanca'
export const DEFAULT_SADAQA_RATE_BP = 700

const dh = (n) => n * 100

// Half-up for positives; profit ≤ 0 never reaches this (sadaqa is 0 then).
export function applyRate(cents, rateBp) {
  return Math.floor((cents * rateBp + 5000) / 10000)
}

/**
 * @param {object} order   - order row with items + packageItems (DH)
 * @param {object|null} profit  - OrderProfit row or null (never edited yet)
 * @param {Array} charges  - OrderCharge rows ({ amountCents })
 * @param {number} rateBp
 */
export function computeOrderProfit(order, profit, charges = [], rateBp = DEFAULT_SADAQA_RATE_BP) {
  const fin = orderFinance(order)
  const mode = profit?.mode === 'MANUAL' ? 'MANUAL' : 'AUTO'

  const collectedCents = dh(order.total)
  const shippingBilledCents = dh(order.shipping)
  const goodsRevenueCents = collectedCents - shippingBilledCents

  // Reliable snapshot first; the admin's typed cost only fills a gap.
  let goodsCostCents = null
  let costSource = 'MISSING'
  if (fin.costUnknownItems === 0) {
    goodsCostCents = dh(fin.cost)
    costSource = 'SNAPSHOT'
  } else if (profit?.goodsCostOverrideCents != null) {
    goodsCostCents = profit.goodsCostOverrideCents
    costSource = 'MANUAL'
  }

  const initialProfitCents = goodsCostCents == null ? null : goodsRevenueCents - goodsCostCents
  const extraChargesCents = charges.reduce((sum, c) => sum + c.amountCents, 0)

  // Exactly one correction applies: AUTO subtracts the charges, MANUAL takes the
  // typed figure as final (charges are shown but not subtracted again).
  let realProfitCents
  if (mode === 'MANUAL') {
    realProfitCents = profit?.manualProfitCents ?? null
  } else {
    realProfitCents = initialProfitCents == null ? null : initialProfitCents - extraChargesCents
  }

  const complete = realProfitCents != null
  const sadaqaCents = complete && realProfitCents > 0 ? applyRate(realProfitCents, rateBp) : 0
  const profitAfterCents = complete ? realProfitCents - sadaqaCents : null

  return {
    mode,
    rateBp,
    collectedCents,
    shippingBilledCents,
    goodsRevenueCents,
    goodsCostCents,
    costSource,
    costUnknownItems: fin.costUnknownItems,
    initialProfitCents,
    extraChargesCents,
    realProfitCents,
    sadaqaCents: complete ? sadaqaCents : null,
    profitAfterCents,
    complete,
  }
}

// Delivered = paid: the store only takes cash on delivery.
export function isSadaqaEligible(order) {
  return order.status === 'DELIVERED' && order.deliveredAt != null
}

const monthFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SADAQA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
})

// "YYYY-MM" of a date in Moroccan local time.
export function monthKey(date) {
  const parts = monthFormatter.formatToParts(new Date(date))
  const y = parts.find((p) => p.type === 'year').value
  const m = parts.find((p) => p.type === 'month').value
  return `${y}-${m}`
}

export function isValidMonthKey(key) {
  return typeof key === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(key)
}

// A month can be marked as paid only once it is over (Moroccan time).
export function isMonthFinished(key, now = new Date()) {
  return key < monthKey(now)
}

// UTC window that safely contains a local month (padded by two days); callers
// filter precisely with monthKey().
export function monthQueryWindow(key) {
  const [y, m] = key.split('-').map(Number)
  return {
    from: new Date(Date.UTC(y, m - 1, 1) - 2 * 86_400_000),
    to: new Date(Date.UTC(y, m, 1) + 2 * 86_400_000),
  }
}

// rates: [{ rateBp, effectiveFrom }]. Picks the rate in force at `date`
// (now when the order has no delivery date yet).
export function rateAt(rates, date = new Date()) {
  const t = new Date(date).getTime()
  let current = null
  for (const r of rates) {
    const from = new Date(r.effectiveFrom).getTime()
    if (from <= t && (!current || from >= new Date(current.effectiveFrom).getTime())) current = r
  }
  return current ? current.rateBp : DEFAULT_SADAQA_RATE_BP
}

/**
 * Month totals from eligible order calcs and the month's payments.
 * Overpayment (after a later return/correction) is shown, never carried over.
 */
export function summarizeMonth(key, calcs, payments, now = new Date()) {
  const complete = calcs.filter((c) => c.complete)
  const active = payments.filter((p) => !p.voidedAt)

  const profitBeforeCents = complete.reduce((s, c) => s + c.realProfitCents, 0)
  const sadaqaDueCents = complete.reduce((s, c) => s + c.sadaqaCents, 0)
  const paidCents = active.reduce((s, p) => s + p.amountCents, 0)

  const last = [...active].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
  const adjustmentCents = last ? sadaqaDueCents - last.dueSnapshotCents : 0

  const finished = isMonthFinished(key, now)
  const remainingCents = Math.max(sadaqaDueCents - paidCents, 0)
  let status
  if (!finished) status = 'OPEN'
  else if (remainingCents > 0) status = 'PENDING'
  else if (paidCents > 0) status = 'PAID'
  else status = 'NONE'

  return {
    month: key,
    ordersCount: complete.length,
    incompleteCount: calcs.length - complete.length,
    profitBeforeCents,
    sadaqaDueCents,
    profitAfterCents: profitBeforeCents - sadaqaDueCents,
    paidCents,
    remainingCents,
    overpaidCents: Math.max(paidCents - sadaqaDueCents, 0),
    adjustmentCents,
    paymentsCount: active.length,
    finished,
    status,
  }
}
