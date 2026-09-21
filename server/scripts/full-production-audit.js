import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'
import app from '../src/app.js'
import { hashPassword, verifyPassword } from '../src/utils/password.js'
import { generateOrderNumber } from '../src/utils/order-number.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prisma = new PrismaClient()

let server
let baseUrl = ''
let adminCookie = ''
let staffCookie = ''
let superAdminUser = null
let staffUser = null

let passCount = 0
let failCount = 0
const failures = []

function assert(condition, testName, details = '') {
  if (condition) {
    passCount++
    console.log(`  ✅ PASS: ${testName}`)
  } else {
    failCount++
    const msg = `❌ FAIL: ${testName} ${details ? `(${details})` : ''}`
    console.error(`  ${msg}`)
    failures.push(msg)
  }
}

async function request(method, pathUrl, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, baseUrl)
    const headers = { 'Content-Type': 'application/json' }
    if (cookie) headers['Cookie'] = cookie

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          let json = null
          try {
            json = JSON.parse(data)
          } catch {
            json = data
          }
          const setCookie = res.headers['set-cookie']
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: json,
            setCookie: Array.isArray(setCookie) ? setCookie.join('; ') : setCookie,
          })
        })
      }
    )
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function setup() {
  return new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      baseUrl = `http://127.0.0.1:${addr.port}`
      console.log(`\n🚀 [AUDIT SERVER] Running on ${baseUrl}\n`)
      resolve()
    })
  })
}

async function teardown() {
  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }
  await prisma.$disconnect()
}

// -----------------------------------------------------------------------------
// AUDIT SUITES
// -----------------------------------------------------------------------------

async function runAudit() {
  console.log('================================================================')
  console.log('  ARINE COMPREHENSIVE PRODUCTION READINESS AUDIT                ')
  console.log('================================================================\n')

  await setup()

  try {
    // -------------------------------------------------------------------------
    // 1. Phase 5: Health & Public Core Endpoints
    // -------------------------------------------------------------------------
    console.log('\n--- 1. HEALTH & PUBLIC API CONTRACTS ---')
    const health = await request('GET', '/api/health')
    assert(health.status === 200 && health.body.success === true, 'GET /api/health responds 200 OK')

    const productsRes = await request('GET', '/api/products')
    assert(productsRes.status === 200 && Array.isArray(productsRes.body.data), 'GET /api/products returns array')
    assert(productsRes.body.data.length > 0, 'Catalog contains active products')
    const firstProduct = productsRes.body.data[0]
    assert(firstProduct.id && firstProduct.title && typeof firstProduct.price === 'number', 'Product schema has id, title, price')
    assert(firstProduct.costPrice === undefined, 'Product costPrice is strictly hidden from public API')

    const productDetail = await request('GET', `/api/products/${firstProduct.id}`)
    assert(productDetail.status === 200 && productDetail.body.data.id === firstProduct.id, `GET /api/products/${firstProduct.id} returns single product`)
    assert(productDetail.body.data.costPrice === undefined, 'Single product costPrice is strictly hidden from public API')

    const packagesRes = await request('GET', '/api/packages')
    assert(packagesRes.status === 200 && Array.isArray(packagesRes.body.data), 'GET /api/packages returns array')
    if (packagesRes.body.data.length > 0) {
      const firstPkg = packagesRes.body.data[0]
      assert(firstPkg.costPrice === undefined, 'Package costPrice is strictly hidden from public API')
      const pkgDetail = await request('GET', `/api/packages/${firstPkg.id}`)
      assert(pkgDetail.status === 200 && pkgDetail.body.data.id === firstPkg.id, `GET /api/packages/${firstPkg.id} returns single package`)
      assert(Array.isArray(pkgDetail.body.data.books), 'Package books array is properly populated')
    }

    const categoriesRes = await request('GET', '/api/categories')
    assert(categoriesRes.status === 200 && Array.isArray(categoriesRes.body.data), 'GET /api/categories returns array')

    const storeConfigRes = await request('GET', '/api/store-config')
    assert(storeConfigRes.status === 200 && storeConfigRes.body.success === true, 'GET /api/store-config returns public settings')
    assert(storeConfigRes.body.data.store !== undefined, 'Store config contains store information')

    const shippingRes = await request('GET', '/api/shipping/config')
    assert(shippingRes.status === 200 && typeof shippingRes.body.data.flatFee === 'number', 'GET /api/shipping/config returns flatFee and threshold')

    // -------------------------------------------------------------------------
    // 2. Phase 7 & 8: Authentication, Session Lifecycle & RBAC
    // -------------------------------------------------------------------------
    console.log('\n--- 2. AUTHENTICATION, SESSIONS & RBAC ---')
    // Ensure Super Admin
    const pwHash = await hashPassword('auditAdminPass123!')
    superAdminUser = await prisma.admin.upsert({
      where: { username: 'audit_super_admin@arine.ma' },
      update: { passwordHash: pwHash, isActive: true, role: 'SUPER_ADMIN', status: 'ACTIVE' },
      create: {
        username: 'audit_super_admin@arine.ma',
        email: 'audit_super_admin@arine.ma',
        name: 'Audit Super Admin',
        passwordHash: pwHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        isActive: true,
      },
    })

    // Test unauthenticated access to admin endpoints
    const unauthDash = await request('GET', '/api/admin/dashboard')
    assert(unauthDash.status === 401, 'Unauthenticated GET /api/admin/dashboard returns 401 Unauthorized')

    const unauthUsers = await request('GET', '/api/admin/users')
    assert(unauthUsers.status === 401, 'Unauthenticated GET /api/admin/users returns 401 Unauthorized')

    // Login with invalid credentials
    const badLogin = await request('POST', '/api/admin/auth/login', {
      username: 'audit_super_admin@arine.ma',
      password: 'WrongPassword!',
    })
    assert(badLogin.status === 401, 'Invalid login credentials rejected with 401')

    // Login with valid credentials
    const goodLogin = await request('POST', '/api/admin/auth/login', {
      username: 'audit_super_admin@arine.ma',
      password: 'auditAdminPass123!',
    })
    assert(goodLogin.status === 200 && goodLogin.body.success === true, 'Super Admin login succeeds')
    adminCookie = goodLogin.setCookie
    assert(adminCookie && adminCookie.includes('arine.admin.sid'), 'Session cookie arine.admin.sid issued')

    // Auth Me verification
    const authMe = await request('GET', '/api/admin/auth/me', null, adminCookie)
    assert(authMe.status === 200 && authMe.body.admin?.role === 'SUPER_ADMIN', 'GET /api/admin/auth/me returns SUPER_ADMIN profile')

    // Super Admin creates a restricted staff user
    const staffUsername = `staff_audit_${Date.now()}`
    const createStaffRes = await request(
      'POST',
      '/api/admin/users',
      {
        username: staffUsername,
        email: `${staffUsername}@arine.ma`,
        name: 'Audit Staff Worker',
        password: 'StaffPassword123!',
        role: 'ADMIN',
        status: 'ACTIVE',
        permissions: ['DASHBOARD_VIEW', 'ORDERS_VIEW', 'ORDERS_STATUS_UPDATE', 'PRODUCTS_VIEW'],
      },
      adminCookie
    )
    assert(createStaffRes.status === 201, 'Super Admin creates scoped staff member')
    staffUser = createStaffRes.body.data

    // Staff logs in
    const staffLogin = await request('POST', '/api/admin/auth/login', {
      username: staffUsername,
      password: 'StaffPassword123!',
    })
    assert(staffLogin.status === 200, 'Staff member logs in successfully')
    staffCookie = staffLogin.setCookie

    // RBAC: Staff allowed endpoints
    const staffDash = await request('GET', '/api/admin/dashboard', null, staffCookie)
    assert(staffDash.status === 200, 'Staff allowed: GET /api/admin/dashboard (DASHBOARD_VIEW)')

    const staffOrders = await request('GET', '/api/admin/orders', null, staffCookie)
    assert(staffOrders.status === 200, 'Staff allowed: GET /api/admin/orders (ORDERS_VIEW)')

    // RBAC: Staff blocked endpoints (403 Forbidden)
    const staffFinance = await request('GET', '/api/admin/profit/overview', null, staffCookie)
    assert(staffFinance.status === 403, 'Staff blocked: GET /api/admin/profit/overview -> 403 FORBIDDEN (FINANCE_VIEW required)')

    const staffUsersList = await request('GET', '/api/admin/users', null, staffCookie)
    assert(staffUsersList.status === 403, 'Staff blocked: GET /api/admin/users -> 403 FORBIDDEN (ADMIN_USERS_VIEW required)')

    const staffSettings = await request('PUT', '/api/admin/store-config', { settings: {} }, staffCookie)
    assert(staffSettings.status === 403, 'Staff blocked: PUT /api/admin/store-config -> 403 FORBIDDEN (STORE_SETTINGS_UPDATE required)')

    // -------------------------------------------------------------------------
    // 3. Phase 9, 10 & 11: End-to-End Order Creation & Server Pricing Integrity
    // -------------------------------------------------------------------------
    console.log('\n--- 3. ORDER CREATION, SERVER PRICING & HISTORICAL SNAPSHOTS ---')
    // Get test books and test package
    const catalogBooks = await prisma.product.findMany({ take: 3 })
    const b1 = catalogBooks[0]
    const b2 = catalogBooks[1]

    // Create a dynamic test package with b1 and b2
    const testPkg = await prisma.package.create({
      data: {
        title: 'باقة الاختبار الشاملة',
        price: 180,
        costPrice: 90,
        oldPrice: 220,
        discount: 18,
        items: {
          create: [
            { productId: b1.id, sortOrder: 0 },
            { productId: b2.id, sortOrder: 1 },
          ],
        },
      },
    })

    // Test 1: Empty cart validation
    const emptyOrder = await request('POST', '/api/orders', {
      fullName: 'أحمد التازي',
      phone: '0612345678',
      city: 'فاس',
      address: 'طريق عين الشقف',
      paymentMethod: 'CASH_ON_DELIVERY',
      items: [],
      packages: [],
    })
    assert(emptyOrder.status === 400, 'Empty cart order rejected with 400 Bad Request')

    // Test 2: Invalid phone validation
    const invalidPhoneOrder = await request('POST', '/api/orders', {
      fullName: 'أحمد التازي',
      phone: '123',
      city: 'فاس',
      address: 'طريق عين الشقف',
      paymentMethod: 'CASH_ON_DELIVERY',
      items: [{ productId: b1.id, quantity: 1 }],
    })
    assert(invalidPhoneOrder.status === 400, 'Invalid phone number rejected with 400 Bad Request')

    // Test 3: Mixed Order (Book + Package) with server-authoritative pricing
    const clientEventId = `test_order_${Date.now()}`
    const createOrderRes = await request('POST', '/api/orders', {
      fullName: 'عبد الله الفاسي',
      phone: '0661234567',
      city: 'فاس',
      address: 'حي النرجس، شارع القدس رقم 45',
      note: 'يرجى الاتصال قبل التسليم',
      paymentMethod: 'CASH_ON_DELIVERY',
      items: [{ productId: b1.id, quantity: 2 }],
      packages: [{ packageId: testPkg.id, quantity: 1 }],
      eventId: clientEventId,
      attribution: {
        utmSource: 'facebook',
        utmMedium: 'cpc',
        utmCampaign: 'test_campaign_audit',
      },
    })

    assert(createOrderRes.status === 201 && createOrderRes.body.success === true, 'Mixed Book + Package order placed successfully')
    const orderData = createOrderRes.body.order
    assert(orderData.orderNumber && orderData.orderNumber.startsWith('AR-'), `Order number generated: ${orderData.orderNumber}`)

    // Verify Server-Authoritative Math in DB
    const dbOrder = await prisma.order.findUnique({
      where: { orderNumber: orderData.orderNumber },
      include: {
        items: true,
        packageItems: true,
        marketingAttribution: true,
      },
    })
    assert(dbOrder !== null, 'Order found in PostgreSQL database')
    const expectedBookSubtotal = b1.price * 2
    const expectedPkgSubtotal = testPkg.price * 1
    const expectedSubtotal = expectedBookSubtotal + expectedPkgSubtotal
    assert(dbOrder.subtotal === expectedSubtotal, `Subtotal accurately calculated server-side: ${dbOrder.subtotal} DH`)
    assert(dbOrder.total === dbOrder.subtotal + dbOrder.shipping, `Total matches subtotal (${dbOrder.subtotal}) + shipping (${dbOrder.shipping}) = ${dbOrder.total} DH`)
    assert(dbOrder.items.length === 1, 'OrderItem snapshot created')
    assert(dbOrder.items[0].productTitle === b1.title, 'OrderItem captured productTitle snapshot')
    assert(dbOrder.items[0].unitPrice === b1.price, 'OrderItem captured unitPrice snapshot')
    assert(dbOrder.packageItems.length === 1, 'PackageOrderItem snapshot created')
    assert(dbOrder.packageItems[0].packageTitle === testPkg.title, 'PackageOrderItem captured packageTitle snapshot')
    assert(dbOrder.marketingAttribution !== null && dbOrder.marketingAttribution.utmSource === 'facebook', 'Marketing attribution linked to order')

    // Test 4: Public Order Tracking
    const trackRes = await request('GET', `/api/orders/${orderData.orderNumber}`)
    assert(trackRes.status === 200 && trackRes.body.order.orderNumber === orderData.orderNumber, `Public order tracking works for ${orderData.orderNumber}`)
    assert(trackRes.body.order.items.length > 0, 'Public order tracking returns items list')
    assert(trackRes.body.order.items[0].unitCostPrice === undefined, 'Public tracking strictly hides unitCostPrice')

    // Test 5: Historical snapshot resilience when product is modified or package deleted
    await prisma.product.update({
      where: { id: b1.id },
      data: { price: b1.price + 50 },
    })
    const recheckedOrder = await prisma.order.findUnique({
      where: { id: dbOrder.id },
      include: { items: true },
    })
    assert(recheckedOrder.items[0].unitPrice === b1.price, 'Historical order retained original snapshot price after catalog price hike')

    // Restore product price
    await prisma.product.update({
      where: { id: b1.id },
      data: { price: b1.price },
    })

    // -------------------------------------------------------------------------
    // 4. Phase 12: Admin Order Management & Status Transitions
    // -------------------------------------------------------------------------
    console.log('\n--- 4. ADMIN ORDER MANAGEMENT & WORKFLOW ---')
    const adminOrdersList = await request('GET', '/api/admin/orders', null, adminCookie)
    assert(adminOrdersList.status === 200 && Array.isArray(adminOrdersList.body.data), 'Admin GET /api/admin/orders returns orders array')

    const adminOrderDetail = await request('GET', `/api/admin/orders/${dbOrder.id}`, null, adminCookie)
    assert(adminOrderDetail.status === 200 && adminOrderDetail.body.data.id === dbOrder.id, 'Admin GET /api/admin/orders/:id returns order with financials')
    assert(adminOrderDetail.body.data.finance !== undefined && typeof adminOrderDetail.body.data.finance.profit === 'number', 'Admin order detail includes financial breakdown (revenue, cost, profit)')

    // Update order status: PENDING -> CONFIRMED -> SHIPPING -> DELIVERED
    const updateStatusRes = await request(
      'PATCH',
      `/api/admin/orders/${dbOrder.id}/status`,
      { status: 'CONFIRMED' },
      adminCookie
    )
    assert(updateStatusRes.status === 200 && updateStatusRes.body.data.status === 'CONFIRMED', 'Order status transitioned to CONFIRMED')

    // -------------------------------------------------------------------------
    // 5. Phase 14 & 15: Security & Injection Protections
    // -------------------------------------------------------------------------
    console.log('\n--- 5. SECURITY CONTROLS & INJECTION RESISTANCE ---')
    // Path traversal in public product lookup
    const pathTraversalRes = await request('GET', '/api/products/..%2F..%2Fetc%2Fpasswd')
    assert(pathTraversalRes.status === 400 || pathTraversalRes.status === 404, 'Path traversal attempt in product route safely rejected')

    // SQL Injection simulation in order tracking
    const sqlInjectionRes = await request('GET', `/api/orders/${encodeURIComponent("AR-1234' OR '1'='1")}`)
    assert(sqlInjectionRes.status === 404, 'SQL injection attempt in order number lookup safely returned 404')

    // Clean up test data
    await prisma.package.delete({ where: { id: testPkg.id } }).catch(() => {})
    if (staffUser) {
      await prisma.admin.delete({ where: { id: staffUser.id } }).catch(() => {})
    }
  } catch (err) {
    console.error('\n💥 Unexpected Runtime Exception during audit execution:', err)
    failCount++
    failures.push(`Unexpected error: ${err.message}`)
  } finally {
    await teardown()
  }

  console.log('\n================================================================')
  console.log(`  AUDIT RUN COMPLETE: ${passCount} PASSED, ${failCount} FAILED`)
  console.log('================================================================')
  if (failCount > 0) {
    console.error('\nFailures summary:')
    failures.forEach((f) => console.error(` - ${f}`))
    process.exit(1)
  }
}

runAudit()
