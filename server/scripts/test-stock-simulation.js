import assert from 'node:assert/strict'
import { randomUUID } from 'crypto'
import { buildDeductions, validateDeductions } from '../src/services/stock/stock-rules.js'
import { StockConflictError } from '../src/services/stock/stock.service.js'

console.log('🧪 Starting Arine Stock Transaction & State Simulation Suite...\n')

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ ${name}`)
    console.error(`     ${err.message}`)
    failed++
  }
}

// Simulated mock database state
class MockDatabase {
  constructor() {
    this.products = new Map([
      [1, { id: 1, title: 'Book A', currentStock: 10, trackStock: true, lowStockThreshold: 5 }],
      [2, { id: 2, title: 'Book B', currentStock: 5, trackStock: true, lowStockThreshold: 5 }],
      [3, { id: 3, title: 'Book C (Untracked)', currentStock: 0, trackStock: false, lowStockThreshold: 5 }],
    ])
    this.orders = new Map()
    this.movements = []
    this.lockedProducts = []
  }

  // Simulated serializable transaction executing state transitions exactly matching stock.service.js
  async applyStockAndUpdateOrderStatus(orderId, newStatus, actorAdminId = null, settings = { stockManagementEnabled: true, allowOverselling: false }) {
    const order = this.orders.get(orderId)
    if (!order) throw new Error(`Order ${orderId} not found`)

    // Simulating SELECT ... FOR UPDATE on order
    const orderRow = { ...order }

    if (settings.stockManagementEnabled) {
      if (newStatus === 'CONFIRMED') {
        await this._deductStock(orderRow, settings, actorAdminId)
      } else if (newStatus === 'CANCELLED' && orderRow.stockDeducted) {
        await this._restoreStock(orderRow, actorAdminId)
      }
    }

    const updatedOrder = {
      ...orderRow,
      status: newStatus,
    }
    this.orders.set(orderId, updatedOrder)
    return updatedOrder
  }

  async _deductStock(orderRow, settings, actorAdminId) {
    if (orderRow.stockDeducted) return // Idempotent exit

    const productMap = new Map()
    for (const [id, p] of this.products.entries()) {
      productMap.set(id, { id: p.id, trackStock: p.trackStock })
    }

    const deductions = buildDeductions(orderRow.items, orderRow.packageItems, productMap)
    if (deductions.length === 0) {
      orderRow.stockDeducted = true
      orderRow.stockDeductionCycleId = randomUUID()
      return
    }

    // Deadlock-safe product locking: sorted ascending
    const productIds = deductions.map((d) => d.productId).sort((a, b) => a - b)
    this.lockedProducts = [...productIds]

    const stockMap = new Map()
    for (const pid of productIds) {
      stockMap.set(pid, this.products.get(pid)?.currentStock ?? 0)
    }

    const { valid, conflicts } = validateDeductions(deductions, stockMap, settings.allowOverselling)
    if (!valid) {
      throw new StockConflictError('Insufficient stock', conflicts)
    }

    const cycleId = randomUUID()

    for (const { productId, delta } of deductions) {
      const prod = this.products.get(productId)
      const previous = prod.currentStock
      const next = previous + delta
      prod.currentStock = next

      this.movements.push({
        productId,
        orderId: orderRow.id,
        cycleId,
        reason: 'ORDER_CONFIRMED',
        delta,
        previousStock: previous,
        newStock: next,
        actorAdminId,
      })
    }

    orderRow.stockDeducted = true
    orderRow.stockDeductionCycleId = cycleId
  }

  async _restoreStock(orderRow, actorAdminId) {
    if (!orderRow.stockDeducted || !orderRow.stockDeductionCycleId) return

    const cycleId = orderRow.stockDeductionCycleId
    const alreadyRestored = this.movements.find(
      (m) => m.cycleId === cycleId && m.reason === 'ORDER_CANCELLED'
    )
    if (alreadyRestored) return // Idempotent exit

    const deductions = this.movements.filter(
      (m) => m.cycleId === cycleId && m.reason === 'ORDER_CONFIRMED'
    )
    if (deductions.length === 0) return

    const productIds = deductions.map((d) => d.productId).sort((a, b) => a - b)
    this.lockedProducts = [...productIds]

    for (const movement of deductions) {
      const prod = this.products.get(movement.productId)
      const previous = prod.currentStock
      const restorationDelta = Math.abs(movement.delta)
      const next = previous + restorationDelta
      prod.currentStock = next

      this.movements.push({
        productId: movement.productId,
        orderId: orderRow.id,
        cycleId,
        reason: 'ORDER_CANCELLED',
        delta: restorationDelta,
        previousStock: previous,
        newStock: next,
        actorAdminId,
      })
    }

    orderRow.stockDeducted = false
  }
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

async function runAll() {
  await test('Order confirmation deducts stock and records movement with cycleId', async () => {
    const db = new MockDatabase()
    db.orders.set(1001, {
      id: 1001,
      status: 'PENDING',
      stockDeducted: false,
      stockDeductionCycleId: null,
      items: [{ productId: 1, quantity: 3, product: { trackStock: true } }],
      packageItems: [],
    })

    await db.applyStockAndUpdateOrderStatus(1001, 'CONFIRMED', 99)

    const updatedOrder = db.orders.get(1001)
    assert.equal(updatedOrder.status, 'CONFIRMED')
    assert.equal(updatedOrder.stockDeducted, true)
    assert.ok(updatedOrder.stockDeductionCycleId)

    const prod = db.products.get(1)
    assert.equal(prod.currentStock, 7) // 10 - 3

    assert.equal(db.movements.length, 1)
    assert.equal(db.movements[0].reason, 'ORDER_CONFIRMED')
    assert.equal(db.movements[0].delta, -3)
    assert.equal(db.movements[0].previousStock, 10)
    assert.equal(db.movements[0].newStock, 7)
    assert.equal(db.movements[0].cycleId, updatedOrder.stockDeductionCycleId)
  })

  await test('Confirmation idempotency: repeated CONFIRMED does not double-deduct', async () => {
    const db = new MockDatabase()
    db.orders.set(1002, {
      id: 1002,
      status: 'PENDING',
      stockDeducted: false,
      stockDeductionCycleId: null,
      items: [{ productId: 1, quantity: 2, product: { trackStock: true } }],
      packageItems: [],
    })

    await db.applyStockAndUpdateOrderStatus(1002, 'CONFIRMED', 99)
    const stockAfterFirst = db.products.get(1).currentStock
    assert.equal(stockAfterFirst, 8)
    assert.equal(db.movements.length, 1)

    // Repeated confirm call
    await db.applyStockAndUpdateOrderStatus(1002, 'CONFIRMED', 99)
    const stockAfterSecond = db.products.get(1).currentStock
    assert.equal(stockAfterSecond, 8) // Still 8
    assert.equal(db.movements.length, 1) // No new movement created
  })

  await test('Cancellation restores stock and records ORDER_CANCELLED movement', async () => {
    const db = new MockDatabase()
    db.orders.set(1003, {
      id: 1003,
      status: 'PENDING',
      stockDeducted: false,
      stockDeductionCycleId: null,
      items: [{ productId: 2, quantity: 4, product: { trackStock: true } }],
      packageItems: [],
    })

    await db.applyStockAndUpdateOrderStatus(1003, 'CONFIRMED', 99)
    assert.equal(db.products.get(2).currentStock, 1) // 5 - 4

    await db.applyStockAndUpdateOrderStatus(1003, 'CANCELLED', 99)
    const updatedOrder = db.orders.get(1003)
    assert.equal(updatedOrder.status, 'CANCELLED')
    assert.equal(updatedOrder.stockDeducted, false)
    assert.equal(db.products.get(2).currentStock, 5) // Restored back to 5

    const cancelMov = db.movements.find((m) => m.reason === 'ORDER_CANCELLED')
    assert.ok(cancelMov)
    assert.equal(cancelMov.delta, 4)
    assert.equal(cancelMov.previousStock, 1)
    assert.equal(cancelMov.newStock, 5)
  })

  await test('Cancellation idempotency: repeated CANCELLED does not double-restore', async () => {
    const db = new MockDatabase()
    db.orders.set(1004, {
      id: 1004,
      status: 'PENDING',
      stockDeducted: false,
      stockDeductionCycleId: null,
      items: [{ productId: 2, quantity: 3, product: { trackStock: true } }],
      packageItems: [],
    })

    await db.applyStockAndUpdateOrderStatus(1004, 'CONFIRMED', 99)
    await db.applyStockAndUpdateOrderStatus(1004, 'CANCELLED', 99)
    assert.equal(db.products.get(2).currentStock, 5)

    // Repeated cancellation
    await db.applyStockAndUpdateOrderStatus(1004, 'CANCELLED', 99)
    assert.equal(db.products.get(2).currentStock, 5)
    const cancelMovs = db.movements.filter((m) => m.reason === 'ORDER_CANCELLED')
    assert.equal(cancelMovs.length, 1)
  })

  await test('Cancelling an order that was never confirmed does not alter stock', async () => {
    const db = new MockDatabase()
    db.orders.set(1005, {
      id: 1005,
      status: 'PENDING',
      stockDeducted: false,
      stockDeductionCycleId: null,
      items: [{ productId: 1, quantity: 2, product: { trackStock: true } }],
      packageItems: [],
    })

    await db.applyStockAndUpdateOrderStatus(1005, 'CANCELLED', 99)
    assert.equal(db.products.get(1).currentStock, 10) // Unchanged
    assert.equal(db.movements.length, 0)
  })

  await test('Insufficient stock raises StockConflictError and locks products in ascending order', async () => {
    const db = new MockDatabase()
    db.orders.set(1006, {
      id: 1006,
      status: 'PENDING',
      stockDeducted: false,
      stockDeductionCycleId: null,
      items: [
        { productId: 2, quantity: 10, product: { trackStock: true } }, // 10 requested, 5 available
        { productId: 1, quantity: 2, product: { trackStock: true } },
      ],
      packageItems: [],
    })

    await assert.rejects(
      async () => {
        await db.applyStockAndUpdateOrderStatus(1006, 'CONFIRMED', 99)
      },
      (err) => {
        assert.ok(err instanceof StockConflictError)
        assert.deepEqual(err.conflicts, [{ productId: 2, available: 5, requested: 10 }])
        return true
      }
    )

    // Verifies product locking ordered ascending: [1, 2] even though order had [2, 1]
    assert.deepEqual(db.lockedProducts, [1, 2])
  })

  console.log(`\n========================================`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('🎉 All stock simulation tests completed successfully!')
  }
}

runAll()
