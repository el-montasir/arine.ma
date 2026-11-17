import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import {
  computeOrderProfit,
  isSadaqaEligible,
  isMonthFinished,
  isValidMonthKey,
  monthKey,
  monthQueryWindow,
  rateAt,
  summarizeMonth,
} from '../../utils/sadaqa-math.js'

// Allowed clock skew for dates typed in the browser.
const FUTURE_TOLERANCE_MS = 5 * 60_000
const DUPLICATE_WINDOW_MS = 60_000

const ADMIN_NAME = { select: { id: true, name: true, username: true } }
const adminName = (a) => (a ? a.name || a.username : null)

const PROFIT_INCLUDE = {
  items: true,
  packageItems: true,
  profit: { include: { updatedByAdmin: ADMIN_NAME } },
  charges: { orderBy: { id: 'asc' } },
  shipment: true,
}

function loadRates(client = prisma) {
  return client.sadaqaRate.findMany({ orderBy: { effectiveFrom: 'asc' } })
}

// Rate in force at delivery; an undelivered order previews today's rate.
function calcOrder(order, rates) {
  const rateBp = rateAt(rates, order.deliveredAt ?? new Date())
  return computeOrderProfit(order, order.profit, order.charges, rateBp, order.shipment?.costCents ?? null)
}

function orderRow(order, calc) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    fullName: order.fullName,
    deliveredAt: order.deliveredAt,
    deliveredAtEstimated: order.deliveredAtEstimated,
    mode: calc.mode,
    costSource: calc.costSource,
    initialProfitCents: calc.initialProfitCents,
    extraChargesCents: calc.extraChargesCents,
    realProfitCents: calc.realProfitCents,
    sadaqaCents: calc.sadaqaCents,
    profitAfterCents: calc.profitAfterCents,
    rateBp: calc.rateBp,
    complete: calc.complete,
    adjusted: calc.mode === 'MANUAL' || calc.extraChargesCents > 0 || calc.costSource === 'MANUAL',
  }
}

// ── Per-order profit ─────────────────────────────────────────────────────────

function profitLine(type, title, item) {
  const hasCost = item.unitCostPrice != null
  return {
    type,
    title,
    quantity: item.quantity,
    unitPriceCents: item.unitPrice * 100,
    unitCostCents: hasCost ? item.unitCostPrice * 100 : null,
    revenueCents: item.unitPrice * item.quantity * 100,
    costCents: hasCost ? item.unitCostPrice * item.quantity * 100 : null,
    profitCents: hasCost ? (item.unitPrice - item.unitCostPrice) * item.quantity * 100 : null,
  }
}

export async function getOrderProfit(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: PROFIT_INCLUDE })
  if (!order) throw new ApiError(404, 'NOT_FOUND', 'الطلب غير موجود')

  const rates = await loadRates()
  const calc = calcOrder(order, rates)
  const month = order.deliveredAt ? monthKey(order.deliveredAt) : null
  const monthPaid = month
    ? (await prisma.sadaqaPayment.count({ where: { periodMonth: month, voidedAt: null } })) > 0
    : false

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    deliveredAt: order.deliveredAt,
    deliveredAtEstimated: order.deliveredAtEstimated,
    mode: calc.mode,
    manualProfitCents: order.profit?.manualProfitCents ?? null,
    goodsCostOverrideCents: order.profit?.goodsCostOverrideCents ?? null,
    note: order.profit?.note ?? null,
    charges: order.charges.map((c) => ({ id: c.id, type: c.type, amountCents: c.amountCents, note: c.note })),
    // Per-line detail so the admin can see where the goods profit comes from.
    lines: [
      ...order.items.map((i) => profitLine('BOOK', i.productTitle, i)),
      ...order.packageItems.map((i) => profitLine('PACKAGE', i.packageTitle, i)),
    ],
    calc,
    eligible: isSadaqaEligible(order),
    month,
    monthPaid,
    updatedAt: order.profit?.updatedAt ?? null,
    updatedBy: adminName(order.profit?.updatedByAdmin),
  }
}

// Returns { before, after } so the controller can audit-log the change.
export async function saveOrderProfit(orderId, input, admin) {
  const before = await getOrderProfit(orderId)

  const orderUpdate = {}
  if (input.deliveredAt != null) {
    if (before.status !== 'DELIVERED') {
      throw new ApiError(409, 'NOT_DELIVERED', 'لا يمكن تعديل تاريخ التسليم لطلب غير مُسلَّم')
    }
    const deliveredAt = new Date(input.deliveredAt)
    if (deliveredAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      throw new ApiError(400, 'FUTURE_DATE', 'تاريخ التسليم لا يمكن أن يكون في المستقبل')
    }
    if (!before.deliveredAt || deliveredAt.getTime() !== new Date(before.deliveredAt).getTime()) {
      orderUpdate.deliveredAt = deliveredAt
      orderUpdate.deliveredAtEstimated = false
    }
  }

  const data = {
    mode: input.mode,
    // Each mode keeps only its own correction, so the two never stack.
    manualProfitCents: input.mode === 'MANUAL' ? input.manualProfitCents : null,
    // A typed cost only fills a gap in the order's cost snapshot.
    goodsCostOverrideCents: before.calc.costUnknownItems > 0 ? input.goodsCostOverrideCents ?? null : null,
    note: input.note ?? null,
    updatedByAdminId: admin?.id ?? null,
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderProfit.upsert({ where: { orderId }, update: data, create: { orderId, ...data } })
    await tx.orderCharge.deleteMany({ where: { orderId } })
    if (input.charges.length > 0) {
      await tx.orderCharge.createMany({
        data: input.charges.map((c) => ({ orderId, type: c.type, amountCents: c.amountCents, note: c.note ?? null })),
      })
    }
    if (Object.keys(orderUpdate).length > 0) {
      await tx.order.update({ where: { id: orderId }, data: orderUpdate })
    }
  })

  const after = await getOrderProfit(orderId)
  return { before, after }
}

// ── Monthly sadaqa ───────────────────────────────────────────────────────────

function deliveredOrders(client, where = {}) {
  return client.order.findMany({
    where: { status: 'DELIVERED', deliveredAt: { not: null }, ...where },
    include: { items: true, packageItems: true, profit: true, charges: true, shipment: true },
    orderBy: { deliveredAt: 'asc' },
  })
}

async function monthCalcs(client, key) {
  const { from, to } = monthQueryWindow(key)
  const [orders, rates] = await Promise.all([
    deliveredOrders(client, { deliveredAt: { gte: from, lt: to } }),
    loadRates(client),
  ])
  return orders
    .filter((o) => monthKey(o.deliveredAt) === key)
    .map((o) => ({ order: o, calc: calcOrder(o, rates) }))
}

export async function getSadaqaSummary(now = new Date()) {
  const [orders, payments, rates] = await Promise.all([
    deliveredOrders(prisma),
    prisma.sadaqaPayment.findMany(),
    loadRates(),
  ])

  const calcsByMonth = new Map()
  for (const o of orders) {
    const key = monthKey(o.deliveredAt)
    if (!calcsByMonth.has(key)) calcsByMonth.set(key, [])
    calcsByMonth.get(key).push(calcOrder(o, rates))
  }
  const paymentsByMonth = new Map()
  for (const p of payments) {
    if (!paymentsByMonth.has(p.periodMonth)) paymentsByMonth.set(p.periodMonth, [])
    paymentsByMonth.get(p.periodMonth).push(p)
  }

  const keys = [...new Set([...calcsByMonth.keys(), ...paymentsByMonth.keys()])].sort().reverse()
  const months = keys.map((k) => summarizeMonth(k, calcsByMonth.get(k) || [], paymentsByMonth.get(k) || [], now))

  const sum = (field) => months.reduce((s, m) => s + m[field], 0)
  return {
    months,
    totals: {
      sadaqaDueCents: sum('sadaqaDueCents'),
      paidCents: sum('paidCents'),
      // Finished months only: the current month is still accumulating.
      remainingCents: months.filter((m) => m.finished).reduce((s, m) => s + m.remainingCents, 0),
      openMonthDueCents: months.filter((m) => !m.finished).reduce((s, m) => s + m.sadaqaDueCents, 0),
      overpaidCents: sum('overpaidCents'),
      incompleteCount: sum('incompleteCount'),
    },
    currentRateBp: rateAt(rates, now),
  }
}

export async function getSadaqaMonth(key, now = new Date()) {
  if (!isValidMonthKey(key)) throw new ApiError(400, 'INVALID_MONTH', 'الشهر غير صحيح')

  const [calcs, payments] = await Promise.all([
    monthCalcs(prisma, key),
    prisma.sadaqaPayment.findMany({
      where: { periodMonth: key },
      include: { createdByAdmin: ADMIN_NAME, voidedByAdmin: ADMIN_NAME },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const rows = calcs.map(({ order, calc }) => orderRow(order, calc))
  return {
    summary: summarizeMonth(key, calcs.map((c) => c.calc), payments, now),
    orders: rows.filter((r) => r.complete),
    incompleteOrders: rows.filter((r) => !r.complete),
    payments: payments.map((p) => ({
      id: p.id,
      periodMonth: p.periodMonth,
      amountCents: p.amountCents,
      paidAt: p.paidAt,
      reference: p.reference,
      note: p.note,
      dueSnapshotCents: p.dueSnapshotCents,
      ordersCount: Array.isArray(p.ordersSnapshot) ? p.ordersSnapshot.length : 0,
      createdAt: p.createdAt,
      createdBy: adminName(p.createdByAdmin),
      voidedAt: p.voidedAt,
      voidReason: p.voidReason,
      voidedBy: adminName(p.voidedByAdmin),
    })),
  }
}

export async function recordSadaqaPayment(input, admin, now = new Date()) {
  const key = input.periodMonth
  if (!isMonthFinished(key, now)) {
    throw new ApiError(409, 'MONTH_NOT_FINISHED', 'لا يمكن إخراج صدقة شهر لم ينتهِ بعد')
  }
  const paidAt = new Date(input.paidAt)
  if (paidAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    throw new ApiError(400, 'FUTURE_DATE', 'تاريخ الإخراج لا يمكن أن يكون في المستقبل')
  }

  return prisma.$transaction(async (tx) => {
    // One writer per month at a time, so two clicks cannot both pass the checks.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sadaqa:${key}`}))`

    const [calcs, payments] = await Promise.all([
      monthCalcs(tx, key),
      tx.sadaqaPayment.findMany({ where: { periodMonth: key, voidedAt: null } }),
    ])
    const summary = summarizeMonth(key, calcs.map((c) => c.calc), payments, now)

    if (summary.remainingCents <= 0) {
      throw new ApiError(409, 'NOTHING_DUE', 'لا يوجد مبلغ متبقٍّ لهذا الشهر')
    }
    if (input.amountCents > summary.remainingCents) {
      throw new ApiError(409, 'AMOUNT_EXCEEDS_REMAINING', 'المبلغ أكبر من المتبقي لهذا الشهر')
    }
    const recentSame = payments.find(
      (p) => p.amountCents === input.amountCents && now.getTime() - new Date(p.createdAt).getTime() < DUPLICATE_WINDOW_MS
    )
    if (recentSame) {
      throw new ApiError(409, 'DUPLICATE_PAYMENT', 'تم تسجيل نفس المبلغ قبل لحظات — تحقّق من السجل')
    }

    return tx.sadaqaPayment.create({
      data: {
        periodMonth: key,
        amountCents: input.amountCents,
        paidAt,
        reference: input.reference ?? null,
        note: input.note ?? null,
        dueSnapshotCents: summary.sadaqaDueCents,
        ordersSnapshot: calcs
          .filter((c) => c.calc.complete)
          .map(({ order, calc }) => ({
            orderId: order.id,
            orderNumber: order.orderNumber,
            realProfitCents: calc.realProfitCents,
            sadaqaCents: calc.sadaqaCents,
            rateBp: calc.rateBp,
          })),
        createdByAdminId: admin?.id ?? null,
      },
    })
  })
}

export async function voidSadaqaPayment(id, reason, admin) {
  const payment = await prisma.sadaqaPayment.findUnique({ where: { id } })
  if (!payment) throw new ApiError(404, 'NOT_FOUND', 'العملية غير موجودة')
  if (payment.voidedAt) throw new ApiError(409, 'ALREADY_VOIDED', 'هذه العملية ملغاة من قبل')

  return prisma.sadaqaPayment.update({
    where: { id },
    data: { voidedAt: new Date(), voidReason: reason, voidedByAdminId: admin?.id ?? null },
  })
}

// ── Rate ─────────────────────────────────────────────────────────────────────

export async function getSadaqaRates(now = new Date()) {
  const rates = await prisma.sadaqaRate.findMany({
    include: { createdByAdmin: ADMIN_NAME },
    orderBy: { effectiveFrom: 'desc' },
  })
  return {
    currentRateBp: rateAt(rates, now),
    history: rates.map((r) => ({
      id: r.id,
      rateBp: r.rateBp,
      effectiveFrom: r.effectiveFrom,
      createdBy: adminName(r.createdByAdmin),
    })),
  }
}

// Takes effect now: orders delivered from now on use it, earlier ones keep theirs.
export async function setSadaqaRate(rateBp, admin) {
  const { currentRateBp } = await getSadaqaRates()
  if (rateBp === currentRateBp) {
    throw new ApiError(409, 'SAME_RATE', 'هذه هي النسبة الحالية')
  }
  await prisma.sadaqaRate.create({
    data: { rateBp, effectiveFrom: new Date(), createdByAdminId: admin?.id ?? null },
  })
  return { previousRateBp: currentRateBp, rateBp }
}
