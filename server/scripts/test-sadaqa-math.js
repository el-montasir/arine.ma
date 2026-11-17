import {
  computeOrderProfit,
  applyRate,
  monthKey,
  isMonthFinished,
  rateAt,
  summarizeMonth,
  isSadaqaEligible,
} from '../src/utils/sadaqa-math.js'

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

// 100 DH book bought at 50 DH, 35 DH shipping billed → 135 DH collected.
const book = (cost = 50) => ({
  subtotal: 100,
  shipping: 35,
  total: 135,
  items: [{ quantity: 1, unitPrice: 100, unitCostPrice: cost }],
  packageItems: [],
})
const charge = (dh) => ({ amountCents: dh * 100 })

console.log('Running sadaqa math test suite...\n')

// Spec example: courier paid 45 → +10 extra.
let r = computeOrderProfit(book(), null, [charge(10)], 700)
assertEqual(r.initialProfitCents, 5000, 'Spec: initial profit 135 − 50 − 35 = 50 DH (shipping not deducted twice)')
assertEqual(r.realProfitCents, 4000, 'Spec: real profit 50 − 10 = 40 DH')
assertEqual(r.sadaqaCents, 280, 'Spec: sadaqa 40 × 7 % = 2.80 DH')
assertEqual(r.profitAfterCents, 3720, 'Spec: after sadaqa 37.20 DH')

// Courier paid 35 / 40.
r = computeOrderProfit(book(), null, [], 700)
assertEqual(r.sadaqaCents, 350, 'Courier 35: profit 50 → sadaqa 3.50')
r = computeOrderProfit(book(), null, [charge(5)], 700)
assertEqual(r.sadaqaCents, 315, 'Courier 40: profit 45 → sadaqa 3.15')

// Several charge lines add up.
r = computeOrderProfit(book(), null, [charge(10), { amountCents: 250 }], 700)
assertEqual(r.realProfitCents, 3750, 'Two charges (+10, +2.50) → 37.50')

// Free-shipping order: admin enters the whole courier fee.
const free = { subtotal: 100, shipping: 0, total: 100, items: [{ quantity: 1, unitPrice: 100, unitCostPrice: 50 }], packageItems: [] }
r = computeOrderProfit(free, null, [charge(35)], 700)
assertEqual(r.realProfitCents, 1500, 'Free shipping: 100 − 50 − 35 (charge) = 15 DH')

// Courier's real fee known (DIGYLOG): the margin billed − real fee counts.
r = computeOrderProfit(book(), null, [], 700, 4500)
assertEqual(r.initialProfitCents, 4000, 'Courier 45 vs billed 35: profit 50 − 10 = 40')
assertEqual(r.sadaqaCents, 280, 'Courier 45: sadaqa 2.80 (same as the +10 charge)')
const fesOrder = { subtotal: 100, shipping: 20, total: 120, items: [{ quantity: 1, unitPrice: 100, unitCostPrice: 50 }], packageItems: [] }
r = computeOrderProfit(fesOrder, null, [], 700, 2000)
assertEqual(r.initialProfitCents, 5000, 'Fes: billed 20, courier 20 → profit 50')
r = computeOrderProfit(book(), null, [], 700, null)
assertEqual(r.shippingMarginCents, 0, 'Unknown courier fee → billed shipping cancels out')

// Zero and negative margins.
r = computeOrderProfit(book(100), null, [], 700)
assertEqual(r.sadaqaCents, 0, 'Zero margin → sadaqa 0')
r = computeOrderProfit(book(), null, [charge(60)], 700)
assertEqual(r.realProfitCents, -1000, 'Negative margin → real profit −10 DH')
assertEqual(r.sadaqaCents, 0, 'Negative margin → sadaqa 0')
assertEqual(r.profitAfterCents, -1000, 'Negative margin → after sadaqa unchanged')

// Manual mode: typed profit wins, charges are NOT subtracted again.
r = computeOrderProfit(book(), { mode: 'MANUAL', manualProfitCents: 3000 }, [charge(10)], 700)
assertEqual(r.realProfitCents, 3000, 'Manual: real profit is the typed 30 DH')
assertEqual(r.sadaqaCents, 210, 'Manual: sadaqa 2.10, charges not double-counted')

// Missing cost snapshot.
const legacy = { subtotal: 100, shipping: 35, total: 135, items: [{ quantity: 1, unitPrice: 100, unitCostPrice: null }], packageItems: [] }
r = computeOrderProfit(legacy, null, [], 700)
assertEqual(r.complete, false, 'Missing cost → incomplete (no invented cost)')
assertEqual(r.sadaqaCents, null, 'Missing cost → no sadaqa')
r = computeOrderProfit(legacy, { mode: 'AUTO', goodsCostOverrideCents: 4000 }, [], 700)
assertEqual(r.realProfitCents, 6000, 'Missing cost + typed cost 40 → profit 60')
assertEqual(r.costSource, 'MANUAL', 'Typed cost source is MANUAL')
r = computeOrderProfit(book(), { mode: 'AUTO', goodsCostOverrideCents: 1 }, [], 700)
assertEqual(r.goodsCostCents, 5000, 'Typed cost ignored when the snapshot is complete')
r = computeOrderProfit(legacy, { mode: 'MANUAL', manualProfitCents: 2000 }, [], 700)
assertEqual(r.complete, true, 'Missing cost but manual profit → complete')

// Quantities and packages.
const multi = {
  subtotal: 350,
  shipping: 35,
  total: 385,
  items: [{ quantity: 2, unitPrice: 100, unitCostPrice: 60 }],
  packageItems: [{ quantity: 1, unitPrice: 150, unitCostPrice: 90 }],
}
r = computeOrderProfit(multi, null, [], 700)
assertEqual(r.realProfitCents, 14000, 'Multi-line: 350 − (120 + 90) = 140 DH')

// Rounding (half-up on centimes).
assertEqual(applyRate(1050, 700), 74, '10.50 × 7 % = 0.735 → 0.74')
assertEqual(applyRate(1, 700), 0, '0.01 × 7 % → 0.00')
assertEqual(applyRate(4000, 1000), 400, '40 × 10 % = 4.00')

// Rates.
const rates = [
  { rateBp: 700, effectiveFrom: '1970-01-01T00:00:00Z' },
  { rateBp: 1000, effectiveFrom: '2026-12-01T10:00:00Z' },
]
assertEqual(rateAt(rates, '2026-11-30T12:00:00Z'), 700, 'Rate before change stays 7 %')
assertEqual(rateAt(rates, '2026-12-01T10:00:01Z'), 1000, 'Rate after change is 10 %')

// Moroccan month boundaries (UTC+1 outside Ramadan).
assertEqual(monthKey('2026-10-31T23:30:00Z'), '2026-11', '31 Oct 23:30 UTC = 1 Nov 00:30 Morocco → November')
assertEqual(monthKey('2026-10-31T22:30:00Z'), '2026-10', '31 Oct 22:30 UTC = 23:30 Morocco → October')
assertEqual(isMonthFinished('2026-10', new Date('2026-11-16T12:00:00Z')), true, 'October is finished on 16 Nov')
assertEqual(isMonthFinished('2026-11', new Date('2026-11-16T12:00:00Z')), false, 'November is still open on 16 Nov')

// Eligibility.
assertEqual(isSadaqaEligible({ status: 'DELIVERED', deliveredAt: new Date() }), true, 'Delivered → eligible')
assertEqual(isSadaqaEligible({ status: 'RETURNED', deliveredAt: new Date() }), false, 'Returned → not eligible')
assertEqual(isSadaqaEligible({ status: 'SHIPPING', deliveredAt: null }), false, 'Shipping → not eligible')

// Month summary: partial payments, later return, overpayment shown not carried.
const now = new Date('2026-11-16T12:00:00Z')
const c1 = computeOrderProfit(book(), null, [charge(10)], 700) // 2.80
const c2 = computeOrderProfit(book(), null, [], 700) // 3.50
let s = summarizeMonth('2026-10', [c1, c2], [], now)
assertEqual(s.sadaqaDueCents, 630, 'Month due 2.80 + 3.50 = 6.30')
assertEqual(s.status, 'PENDING', 'Finished month with nothing paid → PENDING')
s = summarizeMonth('2026-10', [c1, c2], [{ amountCents: 300, dueSnapshotCents: 630, createdAt: '2026-11-01' }], now)
assertEqual(s.remainingCents, 330, 'Partial payment 3.00 → 3.30 remaining')
s = summarizeMonth(
  '2026-10',
  [c1, c2],
  [
    { amountCents: 300, dueSnapshotCents: 630, createdAt: '2026-11-01' },
    { amountCents: 330, dueSnapshotCents: 630, createdAt: '2026-11-02' },
  ],
  now
)
assertEqual(s.status, 'PAID', 'Two payments covering the due → PAID')
// The 3.50 order is returned after payment.
s = summarizeMonth('2026-10', [c1], [{ amountCents: 630, dueSnapshotCents: 630, createdAt: '2026-11-02' }], now)
assertEqual(s.adjustmentCents, -350, 'Return after payment → explicit −3.50 adjustment')
assertEqual(s.overpaidCents, 350, 'Overpaid 3.50 is shown')
assertEqual(s.remainingCents, 0, 'Remaining never goes below 0')
s = summarizeMonth('2026-10', [c1, c2], [{ amountCents: 630, dueSnapshotCents: 630, createdAt: '2026-11-02', voidedAt: '2026-11-03' }], now)
assertEqual(s.paidCents, 0, 'Voided payment is not counted')
s = summarizeMonth('2026-11', [c1], [], now)
assertEqual(s.status, 'OPEN', 'Current month → OPEN')

console.log(`\nResults: ${passed} passed, ${failed} failed.`)
if (failed > 0) process.exit(1)
