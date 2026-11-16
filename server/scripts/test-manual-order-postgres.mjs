// Integration test for admin-typed (manual) orders against a real PostgreSQL.
// Writes and deletes data — refuses to run unless DATABASE_URL names a test DB.
//
//   DATABASE_URL=postgresql://…/arine_sadaqa_test node scripts/test-manual-order-postgres.mjs

if (!/test/i.test(process.env.DATABASE_URL || '')) {
  console.error('Refusing to run: DATABASE_URL must point to a database whose name contains "test".')
  process.exit(1)
}

const { prisma } = await import('../src/lib/prisma.js')
const { createManualOrder } = await import('../src/services/admin/order.service.js')
const { StockConflictError } = await import('../src/services/stock/stock.service.js')
const { createManualOrderSchema } = await import('../src/validators/admin/order.validator.js')
const { getOrderProfit } = await import('../src/services/admin/sadaqa.service.js')

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

const PREFIX = 'MANUAL-TEST-'
const PHONE = '0611223344'
async function cleanup() {
  const orders = await prisma.order.findMany({ where: { phone: PHONE }, select: { id: true } })
  await prisma.stockMovement.deleteMany({ where: { orderId: { in: orders.map((o) => o.id) } } })
  await prisma.order.deleteMany({ where: { phone: PHONE } })
  await prisma.customer.deleteMany({ where: { phone: PHONE } })
  await prisma.product.deleteMany({ where: { title: { startsWith: PREFIX } } })
  await prisma.setting.deleteMany({ where: { key: 'shipping.flat_fee' } })
}

const order = (extra) =>
  createManualOrderSchema.parse({ fullName: 'Client Test', phone: PHONE, source: 'WHATSAPP', status: 'PENDING', ...extra })

try {
  await cleanup()
  await prisma.setting.create({ data: { key: 'shipping.flat_fee', value: '35' } })
  await prisma.stockSettings.upsert({ where: { id: 1 }, update: { stockManagementEnabled: true, allowOverselling: false }, create: { id: 1, stockManagementEnabled: true } })
  const category = await prisma.category.upsert({ where: { slug: 'manual-test' }, update: {}, create: { name: 'test', slug: 'manual-test' } })
  const book = await prisma.product.create({
    data: { title: `${PREFIX}book`, author: 'a', categoryId: category.id, price: 100, costPrice: 50, trackStock: true, currentStock: 5 },
  })
  const admin = await prisma.admin.findFirst()

  console.log('Running manual order PostgreSQL suite...\n')

  assertEqual(createManualOrderSchema.safeParse({ fullName: 'Ali', phone: PHONE, source: 'STORE', status: 'PENDING' }).success, false, 'An order needs at least one item')
  assertEqual(createManualOrderSchema.safeParse({ fullName: 'Ali', phone: PHONE, source: 'STORE', status: 'RETURNED', items: [{ productId: 1, quantity: 1 }] }).success, false, 'Cannot create an order as RETURNED')

  // Catalog price + storefront shipping.
  let o = await createManualOrder(order({ items: [{ productId: book.id, quantity: 2 }] }), admin)
  assertEqual(o.subtotal, 200, 'Catalog price used when none typed (2 × 100)')
  assertEqual(o.shipping, 35, 'Shipping computed like the site (35)')
  assertEqual(o.total, 235, 'Total 235')
  assertEqual(o.source, 'WHATSAPP', 'Source saved')
  assertEqual(o.status, 'PENDING', 'Status PENDING')
  assertEqual(o.createdBy != null, admin != null, 'Creator recorded')
  let stock = (await prisma.product.findUnique({ where: { id: book.id } })).currentStock
  assertEqual(stock, 5, 'PENDING does not touch stock')

  // In-store sale: typed price, no shipping, delivered at once.
  o = await createManualOrder(order({ source: 'STORE', status: 'DELIVERED', shipping: 0, items: [{ productId: book.id, quantity: 1, unitPrice: 90 }] }), admin)
  assertEqual(o.subtotal, 90, 'Typed price 90 used')
  assertEqual(o.shipping, 0, 'Typed shipping 0 used')
  assertEqual(o.status, 'DELIVERED', 'Created as DELIVERED')
  const row = await prisma.order.findUnique({ where: { id: o.id } })
  assertEqual(row.deliveredAt instanceof Date, true, 'deliveredAt stamped')
  stock = (await prisma.product.findUnique({ where: { id: book.id } })).currentStock
  assertEqual(stock, 4, 'DELIVERED went through CONFIRMED → stock −1')

  const p = await getOrderProfit(o.id)
  assertEqual(p.lines.length, 1, 'Profit breakdown has one line')
  assertEqual(p.lines[0].profitCents, 4000, 'Line profit (90 − 50) = 40.00')
  assertEqual(p.calc.sadaqaCents, 280, 'Sadaqa 2.80 on the in-store sale')
  assertEqual(p.eligible, true, 'Delivered manual order counts for sadaqa')

  // Not enough stock: nothing is created.
  const before = await prisma.order.count({ where: { phone: PHONE } })
  let code = null
  try {
    await createManualOrder(order({ status: 'CONFIRMED', items: [{ productId: book.id, quantity: 50 }] }), admin)
  } catch (err) {
    code = err instanceof StockConflictError ? 'STOCK_CONFLICT' : err.code
  }
  assertEqual(code, 'STOCK_CONFLICT', 'Over-stock order is refused')
  assertEqual(await prisma.order.count({ where: { phone: PHONE } }), before, 'Refused order leaves nothing behind')
  stock = (await prisma.product.findUnique({ where: { id: book.id } })).currentStock
  assertEqual(stock, 4, 'Stock unchanged after refusal')

  // Customer linked once by phone.
  assertEqual(await prisma.customer.count({ where: { phone: PHONE } }), 1, 'One customer for the phone')

  let notFound = null
  try {
    await createManualOrder(order({ items: [{ productId: 999999, quantity: 1 }] }), admin)
  } catch (err) {
    notFound = err.code
  }
  assertEqual(notFound, 'PRODUCT_NOT_FOUND', 'Unknown book is rejected')
} catch (err) {
  console.error(err)
  failed++
} finally {
  await cleanup().catch(() => {})
  await prisma.$disconnect()
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`)
if (failed > 0) process.exit(1)
