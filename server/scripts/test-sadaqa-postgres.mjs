// Integration test for profit & sadaqa against a real PostgreSQL database.
// Writes and deletes data — refuses to run unless DATABASE_URL names a test DB.
//
//   DATABASE_URL=postgresql://…/arine_sadaqa_test node scripts/test-sadaqa-postgres.mjs

if (!/test/i.test(process.env.DATABASE_URL || '')) {
  console.error('Refusing to run: DATABASE_URL must point to a database whose name contains "test".')
  process.exit(1)
}

const { prisma } = await import('../src/lib/prisma.js')
const { updateOrderStatus } = await import('../src/services/admin/order.service.js')
const sadaqa = await import('../src/services/admin/sadaqa.service.js')
const { saveOrderProfitSchema } = await import('../src/validators/admin/sadaqa.validator.js')
const { monthKey } = await import('../src/utils/sadaqa-math.js')

let passed = 0
let failed = 0
function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    console.log(`✅ PASS: ${testName} (expected ${expected}, got ${actual})`)
    passed++
  } else {
    console.error(`❌ FAIL: ${testName} (expected ${expected}, got ${actual})`)
    failed++
  }
}
async function expectCode(promise, code, testName) {
  try {
    await promise
    assertEqual('no error', code, testName)
  } catch (err) {
    assertEqual(err.code, code, testName)
  }
}

const PREFIX = 'SADAQA-TEST-'
async function cleanup() {
  await prisma.sadaqaPayment.deleteMany({})
  await prisma.sadaqaRate.deleteMany({ where: { rateBp: { not: 700 } } })
  const orders = await prisma.order.findMany({ where: { orderNumber: { startsWith: PREFIX } }, select: { id: true } })
  await prisma.stockMovement.deleteMany({ where: { orderId: { in: orders.map((o) => o.id) } } })
  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: PREFIX } } })
  await prisma.product.deleteMany({ where: { title: { startsWith: PREFIX } } })
}

let seq = 0
async function makeOrder(product, { shipping = 35 } = {}) {
  seq += 1
  return prisma.order.create({
    data: {
      orderNumber: `${PREFIX}${Date.now()}-${seq}`,
      fullName: 'Test',
      phone: '0600000000',
      city: 'Rabat',
      address: 'x',
      subtotal: 100,
      shipping,
      total: 100 + shipping,
      items: { create: [{ productId: product.id, productTitle: product.title, quantity: 1, unitPrice: 100, totalPrice: 100, unitCostPrice: 50 }] },
    },
  })
}

const now = new Date()
const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15, 12))
const lastMonth = monthKey(lastMonthDate)
const thisMonth = monthKey(now)

try {
  await cleanup()
  const category = await prisma.category.upsert({ where: { slug: 'sadaqa-test' }, update: {}, create: { name: 'test', slug: 'sadaqa-test' } })
  const product = await prisma.product.create({
    data: { title: `${PREFIX}book`, author: 'a', categoryId: category.id, price: 100, costPrice: 50, trackStock: true, currentStock: 10 },
  })
  await prisma.stockSettings.upsert({ where: { id: 1 }, update: { stockManagementEnabled: true }, create: { id: 1, stockManagementEnabled: true } })

  console.log('Running sadaqa PostgreSQL integration suite...\n')

  // ── Delivery date is stamped by the status change ──
  const o1 = await makeOrder(product)
  await updateOrderStatus(o1.id, 'CONFIRMED')
  let row = await prisma.order.findUnique({ where: { id: o1.id } })
  assertEqual(row.deliveredAt, null, 'Confirmed order has no deliveredAt')
  await updateOrderStatus(o1.id, 'DELIVERED')
  row = await prisma.order.findUnique({ where: { id: o1.id } })
  assertEqual(row.deliveredAt instanceof Date, true, 'DELIVERED stamps deliveredAt')
  assertEqual(row.deliveredAtEstimated, false, 'Stamped date is not an estimate')

  // ── Order profit: spec example (+10 DH courier) ──
  const input = (extra) => saveOrderProfitSchema.parse({ mode: 'AUTO', charges: [{ type: 'SHIPPING_EXTRA', amountCents: 1000 }], ...extra })
  let { after } = await sadaqa.saveOrderProfit(o1.id, input(), null)
  assertEqual(after.calc.realProfitCents, 4000, 'Saved: real profit 40.00')
  assertEqual(after.calc.sadaqaCents, 280, 'Saved: sadaqa 2.80')
  let reread = await sadaqa.getOrderProfit(o1.id)
  assertEqual(reread.charges.length, 1, 'Reopened: charge persisted')
  assertEqual(reread.calc.profitAfterCents, 3720, 'Reopened: after sadaqa 37.20')

  // Manual mode needs a reason; manual figure replaces charges, not stacked.
  assertEqual(saveOrderProfitSchema.safeParse({ mode: 'MANUAL', manualProfitCents: 3000 }).success, false, 'Manual without reason is rejected')
  ;({ after } = await sadaqa.saveOrderProfit(o1.id, input({ mode: 'MANUAL', manualProfitCents: 3000, note: 'remise client' }), null))
  assertEqual(after.calc.realProfitCents, 3000, 'Manual: profit 30.00 (charge not subtracted again)')
  ;({ after } = await sadaqa.saveOrderProfit(o1.id, input(), null))
  assertEqual(after.manualProfitCents, null, 'Back to AUTO clears the manual figure')

  // Move the delivery into last month so it can be paid.
  ;({ after } = await sadaqa.saveOrderProfit(o1.id, input({ deliveredAt: lastMonthDate.toISOString() }), null))
  assertEqual(after.month, lastMonth, 'Admin can correct the delivery date')
  await expectCode(
    sadaqa.saveOrderProfit(o1.id, input({ deliveredAt: new Date(Date.now() + 86_400_000).toISOString() }), null),
    'FUTURE_DATE',
    'Future delivery date is rejected'
  )

  // ── Second order in last month: 3.50 sadaqa ──
  const o2 = await makeOrder(product)
  await updateOrderStatus(o2.id, 'CONFIRMED')
  await updateOrderStatus(o2.id, 'DELIVERED')
  await sadaqa.saveOrderProfit(o2.id, saveOrderProfitSchema.parse({ mode: 'AUTO', deliveredAt: lastMonthDate.toISOString() }), null)

  let month = await sadaqa.getSadaqaMonth(lastMonth)
  assertEqual(month.summary.ordersCount, 2, 'Month has 2 eligible orders')
  assertEqual(month.summary.sadaqaDueCents, 630, 'Month due 6.30')

  // ── Payments ──
  const pay = (amountCents, periodMonth = lastMonth) =>
    sadaqa.recordSadaqaPayment({ periodMonth, amountCents, paidAt: new Date().toISOString() }, null)
  await expectCode(pay(100, thisMonth), 'MONTH_NOT_FINISHED', 'Current month cannot be paid yet')
  await expectCode(pay(700), 'AMOUNT_EXCEEDS_REMAINING', 'Paying more than remaining is rejected')

  // Two simultaneous clicks of the same partial amount: exactly one is recorded.
  const results = await Promise.allSettled([pay(300), pay(300)])
  assertEqual(results.filter((r) => r.status === 'fulfilled').length, 1, 'Double click records one payment')
  assertEqual(results.find((r) => r.status === 'rejected')?.reason?.code, 'DUPLICATE_PAYMENT', 'Second click is DUPLICATE_PAYMENT')

  const second = await pay(330)
  assertEqual(second.dueSnapshotCents, 630, 'Payment snapshot freezes the 6.30 due')
  await expectCode(pay(10), 'NOTHING_DUE', 'Fully paid month accepts no more')
  month = await sadaqa.getSadaqaMonth(lastMonth)
  assertEqual(month.summary.status, 'PAID', 'Month is PAID')

  // ── Return after payment: explicit adjustment, history untouched ──
  const stockBefore = (await prisma.product.findUnique({ where: { id: product.id } })).currentStock
  await updateOrderStatus(o2.id, 'RETURNED')
  const stockAfter = (await prisma.product.findUnique({ where: { id: product.id } })).currentStock
  assertEqual(stockAfter, stockBefore + 1, 'RETURNED puts the book back in stock')
  const mv = await prisma.stockMovement.findFirst({ where: { orderId: o2.id, reason: 'ORDER_CANCELLED' } })
  assertEqual(mv?.note, 'ORDER_RETURNED', 'Stock movement is labelled as a return')

  month = await sadaqa.getSadaqaMonth(lastMonth)
  assertEqual(month.summary.sadaqaDueCents, 280, 'Returned order leaves the month')
  assertEqual(month.summary.adjustmentCents, -350, 'Adjustment −3.50 is explicit')
  assertEqual(month.summary.overpaidCents, 350, 'Overpaid 3.50 is shown')
  assertEqual(month.summary.paidCents, 630, 'Recorded payments are untouched')
  // The global remaining is the plain sum of other months' remaining: the
  // 3.50 overpaid here is not netted against them.
  const summary = await sadaqa.getSadaqaSummary()
  const othersRemaining = summary.months
    .filter((m) => m.finished && m.month !== lastMonth)
    .reduce((s, m) => s + m.remainingCents, 0)
  assertEqual(summary.totals.remainingCents, othersRemaining, 'Overpayment is not carried to other months')

  // Void a payment → month owes again.
  await sadaqa.voidSadaqaPayment(second.id, 'erreur de saisie', null)
  await expectCode(sadaqa.voidSadaqaPayment(second.id, 'again', null), 'ALREADY_VOIDED', 'A voided payment cannot be voided twice')
  month = await sadaqa.getSadaqaMonth(lastMonth)
  assertEqual(month.summary.paidCents, 300, 'Voided payment no longer counts')
  assertEqual(month.payments.length, 2, 'Voided payment stays in history')

  // ── Rate change applies to later deliveries only ──
  await sadaqa.setSadaqaRate(1000, null)
  month = await sadaqa.getSadaqaMonth(lastMonth)
  assertEqual(month.summary.sadaqaDueCents, 280, 'Old month keeps 7 % after rate change')
  const o3 = await makeOrder(product)
  await updateOrderStatus(o3.id, 'DELIVERED')
  const p3 = await sadaqa.getOrderProfit(o3.id)
  assertEqual(p3.calc.rateBp, 1000, 'New delivery uses 10 %')
  assertEqual(p3.calc.sadaqaCents, 500, '50 DH × 10 % = 5.00')
  await expectCode(sadaqa.setSadaqaRate(1000, null), 'SAME_RATE', 'Setting the same rate is rejected')

  // ── Free shipping + not-delivered orders ──
  const o4 = await makeOrder(product, { shipping: 0 })
  const p4 = await sadaqa.getOrderProfit(o4.id)
  assertEqual(p4.eligible, false, 'Pending order is not eligible')
  ;({ after } = await sadaqa.saveOrderProfit(o4.id, saveOrderProfitSchema.parse({ mode: 'AUTO', charges: [{ type: 'SHIPPING_EXTRA', amountCents: 3500 }] }), null))
  assertEqual(after.calc.realProfitCents, 1500, 'Free shipping: full courier fee as charge → 15.00')
  await expectCode(
    sadaqa.saveOrderProfit(o4.id, saveOrderProfitSchema.parse({ mode: 'AUTO', deliveredAt: now.toISOString() }), null),
    'NOT_DELIVERED',
    'Delivery date cannot be set on an undelivered order'
  )

  // ── Deleting an order keeps the payment snapshot ──
  await prisma.order.delete({ where: { id: o1.id } })
  const kept = await prisma.sadaqaPayment.findFirst({ where: { periodMonth: lastMonth, voidedAt: null } })
  assertEqual(Array.isArray(kept.ordersSnapshot) && kept.ordersSnapshot.length, 2, 'Snapshot still lists both orders after delete')
  assertEqual(await prisma.orderProfit.count({ where: { orderId: o1.id } }), 0, 'Profit row cascades with the order')
} catch (err) {
  console.error(err)
  failed++
} finally {
  await cleanup().catch(() => {})
  await prisma.$disconnect()
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`)
if (failed > 0) process.exit(1)
