import assert from 'node:assert/strict'
import {
  buildDeductions,
  packageCapacity,
  deriveStockStatus,
  validateDeductions,
} from '../src/services/stock/stock-rules.js'
import { StockConflictError } from '../src/services/stock/stock.service.js'

console.log('🧪 Starting Arine Stock Logic & Rules Verification Suite...\n')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ ${name}`)
    console.error(`     ${err.message}`)
    failed++
  }
}

// -----------------------------------------------------------------------------
// 1. Pure Rules: buildDeductions
// -----------------------------------------------------------------------------
console.log('📦 1. buildDeductions Tests')

test('deducts tracked single book items', () => {
  const orderItems = [
    { productId: 101, quantity: 2, product: { trackStock: true } },
    { productId: 102, quantity: 1, product: { trackStock: false } },
  ]
  const deductions = buildDeductions(orderItems, [])
  assert.deepEqual(deductions, [{ productId: 101, delta: -2 }])
})

test('deducts package items using itemsSnapshot', () => {
  const packageItems = [
    {
      quantity: 3,
      itemsSnapshot: [
        { productId: 201, componentQuantity: 1, product: { trackStock: true } },
        { productId: 202, componentQuantity: 2, product: { trackStock: true } },
        { productId: 203, componentQuantity: 1, product: { trackStock: false } },
      ],
    },
  ]
  const deductions = buildDeductions([], packageItems)
  assert.deepEqual(deductions, [
    { productId: 201, delta: -3 },
    { productId: 202, delta: -6 },
  ])
})

test('deducts package items with fallback to package.items when no snapshot', () => {
  const packageItems = [
    {
      quantity: 2,
      package: {
        items: [
          { productId: 301, quantity: 1, product: { trackStock: true } },
          { productId: 302, quantity: 3, product: { trackStock: true } },
        ],
      },
    },
  ]
  const deductions = buildDeductions([], packageItems)
  assert.deepEqual(deductions, [
    { productId: 301, delta: -2 },
    { productId: 302, delta: -6 },
  ])
})

test('merges deductions when a product appears as both book and in package snapshot', () => {
  const orderItems = [
    { productId: 10, quantity: 2, product: { trackStock: true } },
  ]
  const packageItems = [
    {
      quantity: 1,
      itemsSnapshot: [
        { productId: 10, componentQuantity: 3, product: { trackStock: true } },
        { productId: 20, componentQuantity: 1, product: { trackStock: true } },
      ],
    },
  ]
  const deductions = buildDeductions(orderItems, packageItems)
  // Product 10: 2 from book + 1 * 3 from package = 5
  assert.deepEqual(deductions, [
    { productId: 10, delta: -5 },
    { productId: 20, delta: -1 },
  ])
})

test('resolves trackStock via productMap when not in item/snapshot', () => {
  const orderItems = [{ productId: 50, quantity: 4 }]
  const packageItems = [
    {
      quantity: 2,
      itemsSnapshot: [{ productId: 60, componentQuantity: 1 }],
    },
  ]
  const productMap = new Map([
    [50, { trackStock: true }],
    [60, { trackStock: true }],
  ])
  const deductions = buildDeductions(orderItems, packageItems, productMap)
  assert.deepEqual(deductions, [
    { productId: 50, delta: -4 },
    { productId: 60, delta: -2 },
  ])
})

test('ignores non-tracked or zero quantity items', () => {
  const orderItems = [
    { productId: 1, quantity: 0, product: { trackStock: true } },
    { productId: null, quantity: 2, product: { trackStock: true } },
  ]
  const deductions = buildDeductions(orderItems, [])
  assert.deepEqual(deductions, [])
})

// -----------------------------------------------------------------------------
// 2. Pure Rules: packageCapacity
// -----------------------------------------------------------------------------
console.log('\n📊 2. packageCapacity Tests')

test('computes minimum capacity across tracked components', () => {
  const components = [
    { productId: 1, quantity: 2, currentStock: 10, trackStock: true }, // floor(10/2) = 5
    { productId: 2, quantity: 3, currentStock: 7, trackStock: true },  // floor(7/3) = 2
    { productId: 3, quantity: 1, currentStock: 0, trackStock: false }, // untracked -> ignored
  ]
  const cap = packageCapacity(components)
  assert.equal(cap, 2)
})

test('returns 0 if any tracked component has insufficient stock', () => {
  const components = [
    { productId: 1, quantity: 1, currentStock: 5, trackStock: true },
    { productId: 2, quantity: 2, currentStock: 1, trackStock: true }, // floor(1/2) = 0
  ]
  assert.equal(packageCapacity(components), 0)
})

test('returns Infinity if all components are untracked', () => {
  const components = [
    { productId: 1, quantity: 1, currentStock: 0, trackStock: false },
    { productId: 2, quantity: 2, currentStock: 0, trackStock: false },
  ]
  assert.equal(packageCapacity(components), Infinity)
})

// -----------------------------------------------------------------------------
// 3. Pure Rules: deriveStockStatus
// -----------------------------------------------------------------------------
console.log('\n🏷️  3. deriveStockStatus Tests')

test('respects stockManagementEnabled=false global bypass', () => {
  const res = deriveStockStatus({
    trackStock: true,
    currentStock: 0,
    lowStockThreshold: 5,
    availability: 'in-stock',
    stockManagementEnabled: false,
  })
  assert.deepEqual(res, { stockStatus: 'in-stock', canPurchase: true })
})

test('respects trackStock=false product bypass', () => {
  const res = deriveStockStatus({
    trackStock: false,
    currentStock: 0,
    lowStockThreshold: 5,
    availability: 'in-stock',
    stockManagementEnabled: true,
  })
  assert.deepEqual(res, { stockStatus: 'in-stock', canPurchase: true })
})

test('marks out-of-stock when currentStock <= 0', () => {
  const res = deriveStockStatus({
    trackStock: true,
    currentStock: 0,
    lowStockThreshold: 5,
    availability: 'in-stock',
    stockManagementEnabled: true,
  })
  assert.deepEqual(res, { stockStatus: 'out-of-stock', canPurchase: false })
})

test('marks low-stock when 0 < currentStock <= lowStockThreshold', () => {
  const res = deriveStockStatus({
    trackStock: true,
    currentStock: 3,
    lowStockThreshold: 5,
    availability: 'in-stock',
    stockManagementEnabled: true,
  })
  assert.deepEqual(res, { stockStatus: 'low-stock', canPurchase: true })
})

test('marks in-stock when currentStock > lowStockThreshold', () => {
  const res = deriveStockStatus({
    trackStock: true,
    currentStock: 10,
    lowStockThreshold: 5,
    availability: 'in-stock',
    stockManagementEnabled: true,
  })
  assert.deepEqual(res, { stockStatus: 'in-stock', canPurchase: true })
})

// -----------------------------------------------------------------------------
// 4. Pure Rules: validateDeductions
// -----------------------------------------------------------------------------
console.log('\n🔒 4. validateDeductions Tests')

test('allows overselling when allowOverselling=true', () => {
  const deductions = [{ productId: 1, delta: -10 }]
  const stockMap = new Map([[1, 2]]) // available 2, requested 10
  const res = validateDeductions(deductions, stockMap, true)
  assert.equal(res.valid, true)
  assert.deepEqual(res.conflicts, [])
})

test('identifies conflicts when available < requested with allowOverselling=false', () => {
  const deductions = [
    { productId: 1, delta: -5 },
    { productId: 2, delta: -2 },
  ]
  const stockMap = new Map([
    [1, 3], // requested 5, available 3 -> conflict
    [2, 5], // requested 2, available 5 -> ok
  ])
  const res = validateDeductions(deductions, stockMap, false)
  assert.equal(res.valid, false)
  assert.deepEqual(res.conflicts, [
    { productId: 1, available: 3, requested: 5 },
  ])
})

test('passes when all products have sufficient stock', () => {
  const deductions = [
    { productId: 1, delta: -2 },
    { productId: 2, delta: -4 },
  ]
  const stockMap = new Map([
    [1, 2],
    [2, 10],
  ])
  const res = validateDeductions(deductions, stockMap, false)
  assert.equal(res.valid, true)
  assert.deepEqual(res.conflicts, [])
})

// -----------------------------------------------------------------------------
// 5. StockConflictError & 409 Conflict Payload structure
// -----------------------------------------------------------------------------
console.log('\n⚡ 5. StockConflictError Structure Tests')

test('StockConflictError holds conflicts array and code', () => {
  const conflicts = [{ productId: 42, available: 1, requested: 3 }]
  const err = new StockConflictError('Insufficient stock', conflicts)
  assert.equal(err.name, 'StockConflictError')
  assert.equal(err.code, 'STOCK_CONFLICT')
  assert.deepEqual(err.conflicts, conflicts)
})

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log(`\n========================================`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
} else {
  console.log('🎉 All stock logic tests completed successfully!')
}
