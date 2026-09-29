import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import {
  applyStockAndUpdateOrderStatus,
  updateStockSettings,
  getStockSettings,
  adjustStock,
  listStockMovements,
  getStockSummary,
  StockConflictError,
} from '../src/services/stock/stock.service.js'
import { updateOrderStatus } from '../src/services/admin/order.service.js'

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres@localhost:5433/arine_test'

if (!TEST_DB_URL.includes('test') && !process.env.ALLOW_NON_TEST_DB) {
  console.error('❌ Safety check failed: TEST_DATABASE_URL does not contain "test". Refusing to run destructive test suite.')
  process.exit(1)
}

process.env.DATABASE_URL = TEST_DB_URL
process.env.DIRECT_URL = TEST_DB_URL

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
})

console.log('🧪 Starting Arine Real PostgreSQL Concurrency & Integration Test Suite...\n')

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ ${name}`)
    console.error(`     ${err.stack || err.message}`)
    failed++
  }
}

async function resetDb() {
  await prisma.stockMovement.deleteMany()
  await prisma.packageOrderItem.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.packageItem.deleteMany()
  await prisma.package.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.admin.deleteMany()

  // Seed default admin users
  await prisma.admin.createMany({
    data: [
      { id: 1, username: 'admin1', email: 'admin1@arine.local', passwordHash: 'hash1', role: 'SUPER_ADMIN' },
      { id: 2, username: 'admin2', email: 'admin2@arine.local', passwordHash: 'hash2', role: 'ADMIN' },
    ],
  })

  // Seed default category
  await prisma.category.create({
    data: { id: 1, name: 'Default', slug: 'default' },
  })

  // Ensure stock management is enabled for tests
  await updateStockSettings({
    stockManagementEnabled: true,
    allowOverselling: false,
    lowStockAlertEnabled: true,
    defaultLowStockThreshold: 5,
  })
}

async function runAll() {
  // =========================================================================
  // Phase 3 — REAL PostgreSQL transaction/concurrency tests
  // =========================================================================
  console.log('--- Phase 3: Real PostgreSQL Concurrency Tests ---')

  await test('Test A: Concurrent CONFIRMED on same order (Idempotency & Lock serialized)', async () => {
    await resetDb()

    const p1 = await prisma.product.create({
      data: { id: 101, title: 'Concurrency Book 1', author: 'Author A', categoryId: 1, price: 50, trackStock: true, currentStock: 10, lowStockThreshold: 5 },
    })

    const order1 = await prisma.order.create({
      data: {
        id: 1001,
        orderNumber: 'ORD-TEST-A',
        fullName: 'Test User',
        phone: '0600000001',
        city: 'Casablanca',
        address: 'Addr 1',
        subtotal: 150,
        shipping: 20,
        total: 170,
        status: 'PENDING',
        items: {
          create: [{ productId: 101, productTitle: 'Concurrency Book 1', quantity: 3, unitPrice: 50, totalPrice: 150 }],
        },
      },
    })

    // Execute concurrent confirmations on the same order
    const results = await Promise.allSettled([
      updateOrderStatus(1001, 'CONFIRMED', 1),
      updateOrderStatus(1001, 'CONFIRMED', 2),
    ])

    // At least one must succeed, both should complete without corrupting state
    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    assert.ok(fulfilled.length >= 1, 'At least one confirmation must succeed')

    const productAfter = await prisma.product.findUnique({ where: { id: 101 } })
    assert.equal(productAfter.currentStock, 7, 'Stock should be deducted EXACTLY once (10 - 3 = 7)')

    const orderAfter = await prisma.order.findUnique({ where: { id: 1001 } })
    assert.equal(orderAfter.status, 'CONFIRMED')
    assert.equal(orderAfter.stockDeducted, true)
    assert.ok(orderAfter.stockDeductionCycleId, 'Cycle ID must be set')

    const movements = await prisma.stockMovement.findMany({
      where: { orderId: 1001, reason: 'ORDER_CONFIRMED' },
    })
    assert.equal(movements.length, 1, 'Exactly ONE stock movement record must exist')
    assert.equal(movements[0].delta, -3)
    assert.equal(movements[0].previousStock, 10)
    assert.equal(movements[0].newStock, 7)
    assert.equal(movements[0].cycleId, orderAfter.stockDeductionCycleId)
  })

  await test('Test B: Two different orders competing for the last stock', async () => {
    await resetDb()

    const p2 = await prisma.product.create({
      data: { id: 102, title: 'Limited Book', author: 'Author B', categoryId: 1, price: 100, trackStock: true, currentStock: 5, lowStockThreshold: 2 },
    })

    // Order 2001 needs 4 units, Order 2002 needs 4 units (total needed = 8, available = 5)
    await prisma.order.create({
      data: {
        id: 2001,
        orderNumber: 'ORD-TEST-B1',
        fullName: 'Competitor 1',
        phone: '0600000002',
        city: 'Rabat',
        address: 'Addr 2',
        subtotal: 400,
        shipping: 20,
        total: 420,
        status: 'PENDING',
        items: {
          create: [{ productId: 102, productTitle: 'Limited Book', quantity: 4, unitPrice: 100, totalPrice: 400 }],
        },
      },
    })

    await prisma.order.create({
      data: {
        id: 2002,
        orderNumber: 'ORD-TEST-B2',
        fullName: 'Competitor 2',
        phone: '0600000003',
        city: 'Tangier',
        address: 'Addr 3',
        subtotal: 400,
        shipping: 20,
        total: 420,
        status: 'PENDING',
        items: {
          create: [{ productId: 102, productTitle: 'Limited Book', quantity: 4, unitPrice: 100, totalPrice: 400 }],
        },
      },
    })

    const results = await Promise.allSettled([
      updateOrderStatus(2001, 'CONFIRMED', 1),
      updateOrderStatus(2002, 'CONFIRMED', 2),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    assert.equal(fulfilled.length, 1, 'Exactly one order must be confirmed')
    assert.equal(rejected.length, 1, 'Exactly one order must be rejected')

    // The rejected error must be StockConflictError
    const conflictErr = rejected[0].reason
    assert.ok(conflictErr instanceof StockConflictError || conflictErr.code === 'STOCK_CONFLICT', 'Error must be StockConflictError')

    const productAfter = await prisma.product.findUnique({ where: { id: 102 } })
    assert.equal(productAfter.currentStock, 1, 'Stock must be 1 (5 - 4 = 1), never negative')

    const movements = await prisma.stockMovement.findMany({ where: { productId: 102 } })
    assert.equal(movements.length, 1, 'Exactly one movement record for the winning order')
  })

  await test('Test C: Concurrent CANCELLED calls on a confirmed order', async () => {
    await resetDb()

    const p3 = await prisma.product.create({
      data: { id: 103, title: 'Book C', author: 'Author C', categoryId: 1, price: 60, trackStock: true, currentStock: 10, lowStockThreshold: 5 },
    })

    await prisma.order.create({
      data: {
        id: 3001,
        orderNumber: 'ORD-TEST-C',
        fullName: 'Cancel User',
        phone: '0600000004',
        city: 'Fes',
        address: 'Addr 4',
        subtotal: 240,
        shipping: 20,
        total: 260,
        status: 'PENDING',
        items: {
          create: [{ productId: 103, productTitle: 'Book C', quantity: 4, unitPrice: 60, totalPrice: 240 }],
        },
      },
    })

    // First confirm order
    await updateOrderStatus(3001, 'CONFIRMED', 1)
    let prod = await prisma.product.findUnique({ where: { id: 103 } })
    assert.equal(prod.currentStock, 6, 'Stock deducted to 6')

    // Concurrently cancel order
    const results = await Promise.allSettled([
      updateOrderStatus(3001, 'CANCELLED', 1),
      updateOrderStatus(3001, 'CANCELLED', 2),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    assert.ok(fulfilled.length >= 1)

    prod = await prisma.product.findUnique({ where: { id: 103 } })
    assert.equal(prod.currentStock, 10, 'Stock restored to 10 (NOT double-restored to 14)')

    const orderAfter = await prisma.order.findUnique({ where: { id: 3001 } })
    assert.equal(orderAfter.status, 'CANCELLED')
    assert.equal(orderAfter.stockDeducted, false)

    const cancelMovements = await prisma.stockMovement.findMany({
      where: { orderId: 3001, reason: 'ORDER_CANCELLED' },
    })
    assert.equal(cancelMovements.length, 1, 'Exactly ONE cancellation restoration movement')
    assert.equal(cancelMovements[0].delta, 4)
    assert.equal(cancelMovements[0].previousStock, 6)
    assert.equal(cancelMovements[0].newStock, 10)
  })

  await test('Test D: Rollback atomicity on multi-item order failure', async () => {
    await resetDb()

    await prisma.product.create({
      data: { id: 104, title: 'Item In Stock', author: 'Author D1', categoryId: 1, price: 40, trackStock: true, currentStock: 10, lowStockThreshold: 5 },
    })
    await prisma.product.create({
      data: { id: 105, title: 'Item Short', author: 'Author D2', categoryId: 1, price: 80, trackStock: true, currentStock: 1, lowStockThreshold: 5 },
    })

    // Order requests 3 of Product 104 (has 10) and 2 of Product 105 (has only 1)
    await prisma.order.create({
      data: {
        id: 4001,
        orderNumber: 'ORD-TEST-D',
        fullName: 'Rollback User',
        phone: '0600000005',
        city: 'Agadir',
        address: 'Addr 5',
        subtotal: 280,
        shipping: 20,
        total: 300,
        status: 'PENDING',
        items: {
          create: [
            { productId: 104, productTitle: 'Item In Stock', quantity: 3, unitPrice: 40, totalPrice: 120 },
            { productId: 105, productTitle: 'Item Short', quantity: 2, unitPrice: 80, totalPrice: 160 },
          ],
        },
      },
    })

    await assert.rejects(
      async () => {
        await updateOrderStatus(4001, 'CONFIRMED', 1)
      },
      (err) => {
        assert.ok(err instanceof StockConflictError)
        assert.deepEqual(err.conflicts, [{ productId: 105, available: 1, requested: 2 }])
        return true
      }
    )

    // Verify complete rollback — Product 104 was NOT deducted!
    const p104 = await prisma.product.findUnique({ where: { id: 104 } })
    const p105 = await prisma.product.findUnique({ where: { id: 105 } })
    assert.equal(p104.currentStock, 10, 'Product 104 must remain untouched at 10')
    assert.equal(p105.currentStock, 1, 'Product 105 must remain untouched at 1')

    const orderAfter = await prisma.order.findUnique({ where: { id: 4001 } })
    assert.equal(orderAfter.status, 'PENDING', 'Order status must remain PENDING')
    assert.equal(orderAfter.stockDeducted, false)
    assert.equal(orderAfter.stockDeductionCycleId, null)

    const movements = await prisma.stockMovement.findMany({ where: { orderId: 4001 } })
    assert.equal(movements.length, 0, 'Zero stock movements should be written on rollback')
  })

  await test('Test E: Package concurrency with component calculation', async () => {
    await resetDb()

    const comp1 = await prisma.product.create({
      data: { id: 106, title: 'Package Comp 1', author: 'Author E1', categoryId: 1, price: 30, trackStock: true, currentStock: 4, lowStockThreshold: 2 },
    })
    const comp2 = await prisma.product.create({
      data: { id: 107, title: 'Package Comp 2', author: 'Author E2', categoryId: 1, price: 40, trackStock: true, currentStock: 5, lowStockThreshold: 2 },
    })

    const pkg = await prisma.package.create({
      data: {
        id: 1,
        title: 'Bundle Package',
        price: 90,
        items: {
          create: [
            { productId: 106, quantity: 2 }, // requires 2 of 106
            { productId: 107, quantity: 1 }, // requires 1 of 107
          ],
        },
      },
    })

    // Order 5001: 2 x Package 1 (needs 4 of 106, 2 of 107)
    await prisma.order.create({
      data: {
        id: 5001,
        orderNumber: 'ORD-TEST-E1',
        fullName: 'Bundle User 1',
        phone: '0600000006',
        city: 'Oujda',
        address: 'Addr 6',
        subtotal: 180,
        shipping: 20,
        total: 200,
        status: 'PENDING',
        packageItems: {
          create: [
            {
              packageId: 1,
              packageTitle: 'Bundle Package',
              quantity: 2,
              unitPrice: 90,
              totalPrice: 180,
              itemsSnapshot: [
                { productId: 106, componentQuantity: 2, product: { trackStock: true } },
                { productId: 107, componentQuantity: 1, product: { trackStock: true } },
              ],
            },
          ],
        },
      },
    })

    // Order 5002: 1 x Package 1 (needs 2 of 106, 1 of 107)
    await prisma.order.create({
      data: {
        id: 5002,
        orderNumber: 'ORD-TEST-E2',
        fullName: 'Bundle User 2',
        phone: '0600000007',
        city: 'Kenitra',
        address: 'Addr 7',
        subtotal: 90,
        shipping: 20,
        total: 110,
        status: 'PENDING',
        packageItems: {
          create: [
            {
              packageId: 1,
              packageTitle: 'Bundle Package',
              quantity: 1,
              unitPrice: 90,
              totalPrice: 90,
              itemsSnapshot: [
                { productId: 106, componentQuantity: 2, product: { trackStock: true } },
                { productId: 107, componentQuantity: 1, product: { trackStock: true } },
              ],
            },
          ],
        },
      },
    })

    // Competing for Product 106 (has 4 total; 5001 needs 4, 5002 needs 2)
    const results = await Promise.allSettled([
      updateOrderStatus(5001, 'CONFIRMED', 1),
      updateOrderStatus(5002, 'CONFIRMED', 2),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    assert.equal(fulfilled.length, 1, 'Only one package order can win')
    assert.equal(rejected.length, 1, 'One package order must fail')

    const p106 = await prisma.product.findUnique({ where: { id: 106 } })
    const p107 = await prisma.product.findUnique({ where: { id: 107 } })

    if (results[0].status === 'fulfilled') {
      // 5001 won: deducted 4 of 106, 2 of 107
      assert.equal(p106.currentStock, 0)
      assert.equal(p107.currentStock, 3)
    } else {
      // 5002 won: deducted 2 of 106, 1 of 107
      assert.equal(p106.currentStock, 2)
      assert.equal(p107.currentStock, 4)
    }
  })

  await test('Test F: trackStock=false mixture', async () => {
    await resetDb()

    await prisma.product.create({
      data: { id: 108, title: 'Tracked Book', author: 'Author F1', categoryId: 1, price: 50, trackStock: true, currentStock: 10, lowStockThreshold: 5 },
    })
    await prisma.product.create({
      data: { id: 109, title: 'Untracked Book', author: 'Author F2', categoryId: 1, price: 30, trackStock: false, currentStock: 0, lowStockThreshold: 5 },
    })

    await prisma.order.create({
      data: {
        id: 6001,
        orderNumber: 'ORD-TEST-F',
        fullName: 'Mixed User',
        phone: '0600000008',
        city: 'Tetouan',
        address: 'Addr 8',
        subtotal: 250,
        shipping: 20,
        total: 270,
        status: 'PENDING',
        items: {
          create: [
            { productId: 108, productTitle: 'Tracked Book', quantity: 2, unitPrice: 50, totalPrice: 100 },
            { productId: 109, productTitle: 'Untracked Book', quantity: 5, unitPrice: 30, totalPrice: 150 },
          ],
        },
      },
    })

    await updateOrderStatus(6001, 'CONFIRMED', 1)

    const p108 = await prisma.product.findUnique({ where: { id: 108 } })
    const p109 = await prisma.product.findUnique({ where: { id: 109 } })

    assert.equal(p108.currentStock, 8, 'Tracked book stock should be 8 (10 - 2)')
    assert.equal(p109.currentStock, 0, 'Untracked book stock should remain 0')

    const movements = await prisma.stockMovement.findMany({ where: { orderId: 6001 } })
    assert.equal(movements.length, 1, 'Only tracked book generates a stock movement')
    assert.equal(movements[0].productId, 108)
  })

  // =========================================================================
  // Phase 4 — Retry / Serialization Error Behavior
  // =========================================================================
  console.log('\n--- Phase 4: Retry / Serialization Behavior Tests ---')

  await test('Phase 4: Deadlock prevention via sorted ascending lock order', async () => {
    await resetDb()

    await prisma.product.create({
      data: { id: 201, title: 'Product 201', author: 'Author', categoryId: 1, price: 50, trackStock: true, currentStock: 20, lowStockThreshold: 5 },
    })
    await prisma.product.create({
      data: { id: 202, title: 'Product 202', author: 'Author', categoryId: 1, price: 50, trackStock: true, currentStock: 20, lowStockThreshold: 5 },
    })

    // Order 7001 has items [202, 201] (descending in order items)
    await prisma.order.create({
      data: {
        id: 7001,
        orderNumber: 'ORD-DEADLOCK-1',
        fullName: 'User 1',
        phone: '0600000009',
        city: 'City',
        address: 'Addr',
        subtotal: 100,
        shipping: 0,
        total: 100,
        status: 'PENDING',
        items: {
          create: [
            { productId: 202, productTitle: 'Product 202', quantity: 1, unitPrice: 50, totalPrice: 50 },
            { productId: 201, productTitle: 'Product 201', quantity: 1, unitPrice: 50, totalPrice: 50 },
          ],
        },
      },
    })

    // Order 7002 has items [201, 202] (ascending in order items)
    await prisma.order.create({
      data: {
        id: 7002,
        orderNumber: 'ORD-DEADLOCK-2',
        fullName: 'User 2',
        phone: '0600000010',
        city: 'City',
        address: 'Addr',
        subtotal: 100,
        shipping: 0,
        total: 100,
        status: 'PENDING',
        items: {
          create: [
            { productId: 201, productTitle: 'Product 201', quantity: 1, unitPrice: 50, totalPrice: 50 },
            { productId: 202, productTitle: 'Product 202', quantity: 1, unitPrice: 50, totalPrice: 50 },
          ],
        },
      },
    })

    // Both acquire product locks in ascending order [201, 202] -> NO DEADLOCK
    const results = await Promise.allSettled([
      updateOrderStatus(7001, 'CONFIRMED', 1),
      updateOrderStatus(7002, 'CONFIRMED', 1),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    assert.equal(fulfilled.length, 2, 'Both orders should succeed without deadlock')

    const p201 = await prisma.product.findUnique({ where: { id: 201 } })
    const p202 = await prisma.product.findUnique({ where: { id: 202 } })
    assert.equal(p201.currentStock, 18)
    assert.equal(p202.currentStock, 18)
  })

  // =========================================================================
  // Phase 5 — Existing-Order & Legacy Compatibility
  // =========================================================================
  console.log('\n--- Phase 5: Existing-Order & Legacy Compatibility Tests ---')

  await test('Phase 5: Legacy order without itemsSnapshot falls back to package.items', async () => {
    await resetDb()

    await prisma.product.create({
      data: { id: 301, title: 'Fallback Book', author: 'Author', categoryId: 1, price: 40, trackStock: true, currentStock: 10, lowStockThreshold: 5 },
    })

    const pkg = await prisma.package.create({
      data: {
        id: 2,
        title: 'Legacy Package',
        price: 40,
        items: {
          create: [{ productId: 301, quantity: 2 }],
        },
      },
    })

    // Package order item with itemsSnapshot = null
    await prisma.order.create({
      data: {
        id: 8001,
        orderNumber: 'ORD-LEGACY-FALLBACK',
        fullName: 'Legacy User',
        phone: '0600000011',
        city: 'City',
        address: 'Addr',
        subtotal: 40,
        shipping: 0,
        total: 40,
        status: 'PENDING',
        packageItems: {
          create: [
            {
              packageId: 2,
              packageTitle: 'Legacy Package',
              quantity: 3, // 3 * 2 = 6 units of Product 301
              unitPrice: 40,
              totalPrice: 120,
              itemsSnapshot: null,
            },
          ],
        },
      },
    })

    await updateOrderStatus(8001, 'CONFIRMED', 1)

    const p301 = await prisma.product.findUnique({ where: { id: 301 } })
    assert.equal(p301.currentStock, 4, 'Stock should be deducted from live package relation (10 - 6 = 4)')
  })

  await test('Phase 5: Global stockManagementEnabled=false bypasses stock deduction entirely', async () => {
    await resetDb()
    await updateStockSettings({ stockManagementEnabled: false })

    await prisma.product.create({
      data: { id: 401, title: 'Bypass Book', author: 'Author', categoryId: 1, price: 50, trackStock: true, currentStock: 0, lowStockThreshold: 5 },
    })

    await prisma.order.create({
      data: {
        id: 9001,
        orderNumber: 'ORD-BYPASS',
        fullName: 'Bypass User',
        phone: '0600000012',
        city: 'City',
        address: 'Addr',
        subtotal: 50,
        shipping: 0,
        total: 50,
        status: 'PENDING',
        items: {
          create: [{ productId: 401, productTitle: 'Bypass Book', quantity: 2, unitPrice: 50, totalPrice: 100 }],
        },
      },
    })

    // Should succeed even with 0 stock
    await updateOrderStatus(9001, 'CONFIRMED', 1)

    const orderAfter = await prisma.order.findUnique({ where: { id: 9001 } })
    assert.equal(orderAfter.status, 'CONFIRMED')
    assert.equal(orderAfter.stockDeducted, false, 'stockDeducted remains false when stock management is disabled globally')

    const p401 = await prisma.product.findUnique({ where: { id: 401 } })
    assert.equal(p401.currentStock, 0, 'Stock remained 0')
  })

  await test('Phase 5: Manual stock adjustment and movement listing', async () => {
    await resetDb()

    await prisma.product.create({
      data: { id: 501, title: 'Manual Book', author: 'Author', categoryId: 1, price: 50, trackStock: true, currentStock: 10, lowStockThreshold: 5 },
    })

    const mov = await adjustStock({
      productId: 501,
      newStock: 25,
      reason: 'RESTOCK',
      note: 'Supplier delivery batch #42',
      actorAdminId: null,
    })

    assert.equal(mov.delta, 15)
    assert.equal(mov.previousStock, 10)
    assert.equal(mov.newStock, 25)
    assert.equal(mov.reason, 'RESTOCK')

    const p501 = await prisma.product.findUnique({ where: { id: 501 } })
    assert.equal(p501.currentStock, 25)

    const history = await listStockMovements({ productId: 501 })
    assert.equal(history.total, 1)
    assert.equal(history.items[0].note, 'Supplier delivery batch #42')

    const summary = await getStockSummary({ page: 1, limit: 10 })
    assert.equal(summary.total, 1)
    assert.equal(summary.items[0].currentStock, 25)
  })

  // Summary
  console.log(`\n========================================`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  await prisma.$disconnect()
  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('🎉 All Real PostgreSQL Integration Tests Completed Successfully!')
  }
}

runAll().catch(async (err) => {
  console.error('Fatal test runner error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
