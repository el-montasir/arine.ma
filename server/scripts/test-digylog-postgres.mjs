// Integration test for the DIGYLOG courier flow against a real PostgreSQL and
// a local mock of the DIGYLOG API (nothing is sent to the real courier).
//
//   DATABASE_URL=postgresql://…/arine_sadaqa_test node scripts/test-digylog-postgres.mjs

import http from 'node:http'

if (!/test/i.test(process.env.DATABASE_URL || '')) {
  console.error('Refusing to run: DATABASE_URL must point to a database whose name contains "test".')
  process.exit(1)
}

// ── Mock DIGYLOG ─────────────────────────────────────────────────────────────
const mock = { created: [], parcels: new Map(), lastAuth: null, lastReferer: null }
const CITIES = [
  { id: 3, name: 'CASABLANCA', nameAr: 'الدار البيضاء' },
  { id: 32, name: 'FES', nameAr: 'فاس' },
  { id: 99, name: 'TIZNIT', nameAr: 'تيزنيت' },
]
const COST = { 3: '35.00', 32: '20.00', 99: '45.00' }
const server = http.createServer((req, res) => {
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', () => {
    mock.lastAuth = req.headers.authorization
    mock.lastReferer = req.headers.referer
    const send = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    const path = req.url.replace(/^\/api\/v2\/seller/, '')
    if (req.method === 'GET' && path === '/cities') return send(200, CITIES)
    if (req.method === 'POST' && path === '/orders/standard') {
      const body = JSON.parse(raw)
      const o = body.orders[0]
      mock.created.push(body)
      const tracking = `TK${mock.created.length}`
      mock.parcels.set(tracking, { statusId: 0, status: 'Non envoyée', city: o.city, num: o.num })
      return send(200, [{ isSuccess: true, errors: [], num: o.num, cost: COST[o.city], traking: tracking, tracking }])
    }
    const m = path.match(/^\/order\/([^/]+)\/infos$/)
    if (req.method === 'GET' && m) {
      const p = mock.parcels.get(m[1])
      if (!p) return send(404, { message: 'not found' })
      return send(200, {
        traking: m[1], num: p.num, idStatus: p.statusId, status: p.status, deliveryCost: COST[p.city],
        fees: { deliveryCost: Number(COST[p.city]), packaging: { billed: false, amount: 0 }, fulfillmentShipping: 0, callCenter: 0, returnFees: p.returnFees || 0, refusalFees: 0 },
      })
    }
    send(404, { message: 'mock: unknown route ' + req.method + ' ' + path })
  })
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const mockUrl = `http://127.0.0.1:${server.address().port}/api/v2/seller`

process.env.DIGYLOG_API_URL = mockUrl
process.env.DIGYLOG_API_KEY = 'test-token'
process.env.DIGYLOG_NETWORK_ID = '15'
process.env.DIGYLOG_STORE = 'arine.ma'
process.env.DIGYLOG_WEBHOOK_SECRET = 'a'.repeat(48)

const { prisma } = await import('../src/lib/prisma.js')
const { updateOrderStatus, createManualOrder } = await import('../src/services/admin/order.service.js')
const { createOrder } = await import('../src/services/order.service.js')
const { shippingService, invalidateShippingCache, calcShipping } = await import('../src/services/shipping/index.js')
const { resolveCity } = await import('../src/services/shipping/digylog.client.js')
const { syncShipment, nextOrderStatus } = await import('../src/services/shipping/shipment.service.js')
const { getOrderProfit } = await import('../src/services/admin/sadaqa.service.js')
const { createManualOrderSchema } = await import('../src/validators/admin/order.validator.js')
const { default: app } = await import('../src/app.js')

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

const PHONE = '0622334455'
const PREFIX = 'DIGYLOG-TEST-'
async function cleanup() {
  const orders = await prisma.order.findMany({ where: { phone: PHONE }, select: { id: true } })
  await prisma.stockMovement.deleteMany({ where: { orderId: { in: orders.map((o) => o.id) } } })
  await prisma.order.deleteMany({ where: { phone: PHONE } })
  await prisma.customer.deleteMany({ where: { phone: PHONE } })
  await prisma.product.deleteMany({ where: { title: { startsWith: PREFIX } } })
  await prisma.setting.deleteMany({ where: { key: { in: ['shipping.flat_fee', 'shipping.city_prices', 'shipping.active_provider'] } } })
  invalidateShippingCache()
}

const web = app.listen(0, '127.0.0.1')
await new Promise((r) => web.once('listening', r))
const apiUrl = `http://127.0.0.1:${web.address().port}`

try {
  await cleanup()
  await prisma.setting.createMany({
    data: [
      { key: 'shipping.flat_fee', value: '35' },
      { key: 'shipping.city_prices', value: JSON.stringify({ FES: 20 }) },
    ],
  })
  invalidateShippingCache()
  await prisma.stockSettings.upsert({ where: { id: 1 }, update: { stockManagementEnabled: true, allowOverselling: false }, create: { id: 1, stockManagementEnabled: true } })
  const category = await prisma.category.upsert({ where: { slug: 'digylog-test' }, update: {}, create: { name: 'test', slug: 'digylog-test' } })
  const book = await prisma.product.create({
    data: { title: `${PREFIX}book`, author: 'a', categoryId: category.id, price: 100, costPrice: 50, trackStock: true, currentStock: 20 },
  })

  console.log('Running DIGYLOG integration suite...\n')

  // ── Cities ──
  assertEqual((await resolveCity('Fès'))?.id, 32, '"Fès" resolves to FES')
  assertEqual((await resolveCity('  fes '))?.id, 32, '" fes " resolves to FES')
  assertEqual((await resolveCity('فاس'))?.id, 32, '"فاس" resolves to FES')
  assertEqual((await resolveCity('الدار البيضاء'))?.name, 'CASABLANCA', 'Arabic Casablanca resolves')
  assertEqual(await resolveCity('Atlantis'), null, 'Unknown city → null')

  // ── City price ──
  assertEqual(await calcShipping(100, [], null, { cityKey: 'FES' }), 20, 'Fes pays 20')
  assertEqual(await calcShipping(100, [], null, { cityKey: 'CASABLANCA' }), 35, 'Casablanca pays the flat 35')
  assertEqual(await calcShipping(100, []), 35, 'No city → flat 35')

  // Storefront checkout uses the city price server-side.
  const siteOrder = await createOrder({
    fullName: 'Client Fes', phone: PHONE, city: 'فاس', address: 'Rue 1', paymentMethod: 'CASH_ON_DELIVERY',
    items: [{ productId: book.id, quantity: 1 }], packages: [],
  })
  assertEqual(siteOrder.shipping, 20, 'Checkout in فاس: shipping 20')
  assertEqual(siteOrder.total, 120, 'Checkout in فاس: total 120')

  // ── Manual provider: nothing is sent ──
  await updateOrderStatus(siteOrder.id, 'CONFIRMED')
  assertEqual(mock.created.length, 0, 'Manual provider active → nothing sent')
  assertEqual(await prisma.shipment.count({ where: { orderId: siteOrder.id } }), 0, 'Manual provider → no shipment row')

  // ── DIGYLOG active: send once on confirmation ──
  await shippingService.setActiveProvider('digylog')
  const o2 = await createOrder({
    fullName: 'Client Tiznit', phone: PHONE, city: 'Tiznit', address: 'Rue 2', paymentMethod: 'CASH_ON_DELIVERY',
    items: [{ productId: book.id, quantity: 1 }], packages: [],
  })
  await updateOrderStatus(o2.id, 'CONFIRMED')
  let s2 = await prisma.shipment.findUnique({ where: { orderId: o2.id } })
  assertEqual(s2?.tracking, 'TK1', 'Confirmed order sent → tracking saved')
  assertEqual(s2?.costCents, 4500, 'Courier fee 45.00 saved')
  const sent = mock.created[0]
  assertEqual(sent.store, 'arine.ma', 'Store arine.ma')
  assertEqual(sent.network, 15, 'Network 15')
  assertEqual(sent.orders[0].price, 135, 'COD price = full order total')
  assertEqual(sent.orders[0].port, 2, 'Shipping paid by seller (port 2)')
  assertEqual(sent.orders[0].openproduct, 1, 'Customer may open the parcel')
  assertEqual(sent.orders[0].num, o2.orderNumber, 'num = our order number')
  assertEqual(mock.lastAuth, 'Bearer test-token', 'Bearer token sent')
  assertEqual(mock.lastReferer, 'https://apiseller.digylog.com', 'Required Referer sent')

  await updateOrderStatus(o2.id, 'SHIPPING')
  assertEqual(mock.created.length, 1, 'SHIPPING after CONFIRMED does not send twice')

  // Real courier fee in the profit: 100 − 50 + (35 − 45) = 40.
  let profit = await getOrderProfit(o2.id)
  assertEqual(profit.calc.initialProfitCents, 4000, 'Profit uses DIGYLOG fee: 50 − 10 = 40')

  // ── Unknown city → error kept, retry possible ──
  const o3 = await createOrder({
    fullName: 'Client X', phone: PHONE, city: 'Atlantis', address: 'Rue 3', paymentMethod: 'CASH_ON_DELIVERY',
    items: [{ productId: book.id, quantity: 1 }], packages: [],
  })
  await updateOrderStatus(o3.id, 'CONFIRMED')
  const s3 = await prisma.shipment.findUnique({ where: { orderId: o3.id } })
  assertEqual(s3?.tracking, null, 'Unknown city → not sent')
  assertEqual(Boolean(s3?.error?.includes('Atlantis')), true, 'Unknown city → error stored for the admin')

  // ── Typed orders ──
  const manual = (extra) => createManualOrderSchema.parse({ fullName: 'Client WA', phone: PHONE, city: 'Casablanca', items: [{ productId: book.id, quantity: 1 }], ...extra })
  const before = mock.created.length
  const shop = await createManualOrder(manual({ source: 'STORE', status: 'DELIVERED', shipping: 0 }), null)
  assertEqual(mock.created.length, before, 'Shop sale is never sent')
  assertEqual(shop.status, 'DELIVERED', 'Shop sale delivered')
  const wa = await createManualOrder(manual({ source: 'WHATSAPP', status: 'CONFIRMED' }), null)
  assertEqual(mock.created.length, before + 1, 'Confirmed WhatsApp order is sent')
  assertEqual((await prisma.shipment.findUnique({ where: { orderId: wa.id } }))?.costCents, 3500, 'Casablanca fee 35 saved')

  // ── Status sync ──
  assertEqual(nextOrderStatus('DELIVERED', 3), null, 'Never moves a delivered order back to shipping')
  assertEqual(nextOrderStatus('CANCELLED', 6), null, 'Never revives a cancelled order')
  assertEqual(nextOrderStatus('CONFIRMED', 3), 'SHIPPING', 'In delivery → SHIPPING')

  mock.parcels.get('TK1').statusId = 6
  mock.parcels.get('TK1').status = 'Livrée'
  await syncShipment('TK1', { motif: '', driverPhone: '0611111111' })
  let row = await prisma.order.findUnique({ where: { id: o2.id }, include: { shipment: true } })
  assertEqual(row.status, 'DELIVERED', 'Livrée → DELIVERED')
  assertEqual(row.deliveredAt instanceof Date, true, 'Delivery date stamped (counts for sadaqa)')
  assertEqual(row.shipment.statusLabel, 'Livrée', 'Courier label stored')
  assertEqual(row.shipment.driverPhone, '0611111111', 'Driver phone stored')

  // Return with a return fee: stock back, fee recorded.
  const stockBefore = (await prisma.product.findUnique({ where: { id: book.id } })).currentStock
  Object.assign(mock.parcels.get('TK1'), { statusId: 8, status: 'Retournée', returnFees: 10 })
  await syncShipment('TK1')
  row = await prisma.order.findUnique({ where: { id: o2.id }, include: { shipment: true } })
  assertEqual(row.status, 'RETURNED', 'Retournée → RETURNED')
  assertEqual(row.shipment.costCents, 5500, 'Return fee added: 45 + 10')
  assertEqual((await prisma.product.findUnique({ where: { id: book.id } })).currentStock, stockBefore + 1, 'Returned book back in stock')

  // ── Webhook ──
  const hook = (secret, body) =>
    fetch(`${apiUrl}/api/webhooks/digylog/${secret}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  let res = await hook('wrong-secret', { type: 'subscribe', key: 'k' })
  assertEqual(res.status, 404, 'Wrong secret → 404')
  res = await hook('a'.repeat(48), { type: 'subscribe', key: 'abc123' })
  assertEqual((await res.json()).key, 'abc123', 'Handshake echoes the key')

  // The payload lies ("Livrée") but DIGYLOG says "En cours de livraison": we trust DIGYLOG.
  const tWa = (await prisma.shipment.findUnique({ where: { orderId: wa.id } })).tracking
  Object.assign(mock.parcels.get(tWa), { statusId: 3, status: 'En cours de livraison' })
  res = await hook('a'.repeat(48), { eventType: 'order-status-changed', payload: { traking: tWa, idStatus: '6', status: 'Livrée' } })
  assertEqual(res.status, 200, 'Status event acknowledged')
  row = await prisma.order.findUnique({ where: { id: wa.id } })
  assertEqual(row.status, 'SHIPPING', 'Webhook body is not trusted: status re-read from DIGYLOG')

  res = await hook('a'.repeat(48), { eventType: 'order-status-changed', payload: { traking: 'UNKNOWN' } })
  assertEqual(res.status, 200, 'Unknown tracking is ignored safely')
} catch (err) {
  console.error(err)
  failed++
} finally {
  await cleanup().catch(() => {})
  await prisma.$disconnect()
  web.close()
  server.close()
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`)
process.exit(failed > 0 ? 1 : 0)
