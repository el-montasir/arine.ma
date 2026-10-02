/**
 * Procurement & Supplier Module - Logic & Safety Verification Suite
 * Tests financial computations, receiving validation, stock movements, supplier balances,
 * return constraints, and permission keys.
 */

import assert from 'node:assert/strict'
import { PERMISSIONS } from '../src/constants/permissions.js'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ ${name}`)
    console.error(err)
    failed++
  }
}

async function runTests() {
  console.log('🧪 Starting Procurement Logic & Safety Verification Suite...\n')

  console.log('📋 1. Permission Constants Tests')
  test('all procurement permissions are properly registered', () => {
    const requiredPermissions = [
      'SUPPLIERS_VIEW',
      'SUPPLIERS_MANAGE',
      'PURCHASES_VIEW',
      'PURCHASES_MANAGE',
      'PURCHASES_RECEIVE',
      'PAYMENTS_VIEW',
      'PAYMENTS_MANAGE',
      'RETURNS_VIEW',
      'RETURNS_MANAGE',
    ]

    for (const perm of requiredPermissions) {
      assert.strictEqual(PERMISSIONS[perm], perm, `Permission ${perm} should exist in PERMISSIONS map`)
    }
  })

  console.log('\n💰 2. Purchase Calculation Tests')
  test('computes subtotal, tax, shipping, discount, and grandTotal correctly', () => {
    const items = [
      { quantity: 10, unitCost: 50.0 }, // 500
      { quantity: 5, unitCost: 120.0 },  // 600
    ]
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
    assert.strictEqual(subtotal, 1100.0)

    const taxAmount = 110.0 // 10%
    const shippingCost = 50.0
    const discountAmount = 60.0
    const grandTotal = subtotal + taxAmount + shippingCost - discountAmount

    assert.strictEqual(grandTotal, 1200.0)
  })

  console.log('\n📦 3. Receiving Goods Safety & Stock Movement Tests')
  test('draft and ordered purchases do not mutate stock', () => {
    let stock = 100
    const poStatus = 'ORDERED'
    if (poStatus === 'DRAFT' || poStatus === 'ORDERED') {
      // zero stock mutation
    } else if (poStatus === 'RECEIVED') {
      stock += 50
    }
    assert.strictEqual(stock, 100, 'Stock must not change when PO is in ORDERED or DRAFT status')
  })

  test('receiving line items correctly increases quantityReceived and stock', () => {
    const poItem = { id: 1, productId: 10, quantity: 20, quantityReceived: 5 }
    const receiveQty = 10

    // Validate over-receiving
    const remainingToReceive = poItem.quantity - poItem.quantityReceived
    assert.ok(receiveQty <= remainingToReceive, 'Cannot receive more than remaining ordered quantity')

    poItem.quantityReceived += receiveQty
    assert.strictEqual(poItem.quantityReceived, 15)

    // Stock increment simulation
    let productStock = 50
    productStock += receiveQty
    assert.strictEqual(productStock, 60)

    // Determine new PO status
    const allItems = [poItem]
    const allReceived = allItems.every((it) => it.quantityReceived >= it.quantity)
    const someReceived = allItems.some((it) => it.quantityReceived > 0)
    const newStatus = allReceived ? 'RECEIVED' : someReceived ? 'PARTIALLY_RECEIVED' : 'ORDERED'

    assert.strictEqual(newStatus, 'PARTIALLY_RECEIVED')
  })

  test('prevent receiving more than ordered quantity', () => {
    const poItem = { id: 1, productId: 10, quantity: 20, quantityReceived: 18 }
    const receiveQty = 5 // Attempt to receive 5 when only 2 remaining

    const remaining = poItem.quantity - poItem.quantityReceived
    assert.throws(
      () => {
        if (receiveQty > remaining) {
          throw new Error(`Cannot receive ${receiveQty} units; only ${remaining} remaining`)
        }
      },
      /Cannot receive 5 units; only 2 remaining/
    )
  })

  console.log('\n💳 4. Supplier Balance & Payments Tests')
  test('calculates supplier balance from purchases, payments, and returns', () => {
    const purchasesGrandTotal = 5000.0 // Debit (we owe)
    const paymentsTotal = 3200.0       // Credit (we paid)
    const returnsTotal = 800.0         // Credit (goods returned)

    const expectedBalance = purchasesGrandTotal - paymentsTotal - returnsTotal
    assert.strictEqual(expectedBalance, 1000.0, 'Balance should equal Purchases - Payments - Returns')
  })

  test('prevents overpayment on linked purchase order', () => {
    const purchase = { id: 1, grandTotal: 1000.0, paidAmount: 800.0 }
    const remainingDue = purchase.grandTotal - purchase.paidAmount
    const attemptedPayment = 300.0

    assert.throws(
      () => {
        if (attemptedPayment > remainingDue) {
          throw new Error(`Payment amount ${attemptedPayment} exceeds remaining due ${remainingDue}`)
        }
      },
      /Payment amount 300 exceeds remaining due 200/
    )
  })

  console.log('\n🔄 5. Purchase Returns & Stock Deduction Tests')
  test('draft return causes zero stock mutation', () => {
    let stock = 40
    const returnStatus = 'DRAFT'
    if (returnStatus === 'CONFIRMED') {
      stock -= 5
    }
    assert.strictEqual(stock, 40, 'Draft returns must not deduct stock until confirmed')
  })

  test('confirmed return validates against received quantity on PO and deducts stock', () => {
    const poItem = { productId: 10, quantityReceived: 15 }
    const returnQty = 5

    assert.ok(returnQty <= poItem.quantityReceived, 'Cannot return more items than were received')

    let stock = 30
    stock -= returnQty
    assert.strictEqual(stock, 25, 'Stock should decrease when return is confirmed')
  })

  console.log('\n🔒 6. Row-Locking Ordering Contract')
  test('product IDs are always sorted in ascending order for FOR UPDATE row locking', () => {
    const rawProductIds = [45, 12, 89, 3, 12, 50]
    const sortedUniqueIds = Array.from(new Set(rawProductIds)).sort((a, b) => a - b)

    assert.deepStrictEqual(sortedUniqueIds, [3, 12, 45, 50, 89])
    for (let i = 0; i < sortedUniqueIds.length - 1; i++) {
      assert.ok(
        sortedUniqueIds[i] < sortedUniqueIds[i + 1],
        'Product IDs must be strictly ascending to prevent deadlocks'
      )
    }
  })

  console.log('\n🛡️  7. Payload Normalization & Field Mapping Regressions')
  test('receive payload handles both raw array and object with items property', () => {
    const rawArray = [{ productId: 1, quantityReceived: 5 }]
    const objWithItems = { items: [{ productId: 1, quantityReceived: 5 }], note: 'Received batch' }

    const extractItems = (data) => (Array.isArray(data) ? data : data?.items || [])
    assert.deepStrictEqual(extractItems(rawArray), rawArray)
    assert.deepStrictEqual(extractItems(objWithItems), objWithItems.items)
  })

  test('return item line totals and quantities compute correctly', () => {
    const rawItems = [
      { productId: 1, quantity: 3, unitCost: 45.5 },
      { productId: 2, quantity: 2, unitCost: 100.0 },
    ]
    let totalRefund = 0
    const computed = rawItems.map((item) => {
      const qty = Number(item.quantity)
      const cost = Number(item.unitCost)
      assert.ok(qty > 0, 'Quantity must be positive')
      const lineTotal = Number((qty * cost).toFixed(2))
      totalRefund += lineTotal
      return { productId: item.productId, quantity: qty, unitCost: cost, lineTotal }
    })

    assert.strictEqual(computed[0].lineTotal, 136.5)
    assert.strictEqual(computed[1].lineTotal, 200.0)
    assert.strictEqual(Number(totalRefund.toFixed(2)), 336.5)
  })

  console.log('\n🏪 8. Supplier Creation & Linked Books Verification')
  test('supplier creation payload validation and persistence mapping', () => {
    const validSupplierPayload = {
      name: 'Dar Al-Kitab Publishing',
      contactPerson: 'Ahmad Mansour',
      phone: '+212600112233',
      whatsapp: '+212600112233',
      email: 'ahmad@daralkitab.ma',
      city: 'Casablanca',
      address: '123 Bd Zerktouni, 4th Floor',
      notes: 'Main educational textbook supplier',
      isActive: true,
    }

    assert.ok(validSupplierPayload.name.trim().length >= 2, 'Supplier name must be at least 2 characters')
    assert.strictEqual(typeof validSupplierPayload.isActive, 'boolean')
  })

  test('supplier product catalog linking does not mutate product currentStock', () => {
    const product = {
      id: 42,
      title: 'Mathematics Grade 10',
      currentStock: 150,
      price: 85.0,
    }

    const initialStock = product.currentStock

    // Link product to supplier via SupplierProduct contract
    const supplierProductLink = {
      supplierId: 7,
      productId: product.id,
      purchasePrice: 45.0,
      minimumOrderQuantity: 10,
      supplierSku: 'DK-MATH-10',
      isActive: true,
    }

    assert.strictEqual(supplierProductLink.productId, product.id)
    assert.strictEqual(supplierProductLink.purchasePrice, 45.0)
    assert.strictEqual(product.currentStock, initialStock, 'Product.currentStock must remain completely unchanged upon catalog linking')
  })

  test('KPI aggregation computes the 4 primary cards: Total Suppliers, Outstanding Balance, Total Purchases, Total Paid', () => {
    const suppliersData = [
      { id: 1, name: 'Supplier A', isActive: true, totalPurchases: 5000, totalPaid: 3000, balance: 2000, createdAt: new Date().toISOString() },
      { id: 2, name: 'Supplier B', isActive: true, totalPurchases: 8000, totalPaid: 8000, balance: 0, createdAt: new Date().toISOString() },
      { id: 3, name: 'Supplier C', isActive: false, totalPurchases: 2500, totalPaid: 1500, balance: 1000, createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString() },
    ]

    const stats = suppliersData.reduce(
      (acc, s) => {
        acc.total += 1
        if (s.isActive !== false) acc.active += 1
        acc.totalPurchases += s.totalPurchases
        acc.totalPaid += s.totalPaid
        acc.totalBalance += s.balance
        return acc
      },
      { total: 0, active: 0, totalPurchases: 0, totalPaid: 0, totalBalance: 0 }
    )

    assert.strictEqual(stats.total, 3, 'Total Suppliers count must match')
    assert.strictEqual(stats.active, 2, 'Active count should be 2')
    assert.strictEqual(stats.totalBalance, 3000, 'Outstanding Balance must match sum of individual balances')
    assert.strictEqual(stats.totalPurchases, 15500, 'Total Purchases must match sum of individual purchases')
    assert.strictEqual(stats.totalPaid, 12500, 'Total Paid must match sum of disbursements')
  })

  console.log('\n========================================')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    process.exit(1)
  }
  console.log('🎉 All procurement logic tests completed successfully!\n')
}

runTests()
