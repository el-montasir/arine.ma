import http from 'http'
import app from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

async function runTest() {
  console.log('🚀 Starting Comprehensive End-to-End Admin Management & RBAC Verification...')

  // 1. Start server on an ephemeral port
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}/api/admin`
  console.log(`📡 Test server running on http://127.0.0.1:${port}`)

  let ownerCookie = ''
  let staffCookie = ''
  let testStaffId = null
  const testStaffUsername = `test_staff_${Date.now()}`
  const testStaffPassword = 'StaffPassword123!'

  try {
    // Helper to send HTTP requests with cookies
    async function request(method, path, body = null, cookie = '') {
      const headers = { 'Content-Type': 'application/json' }
      if (cookie) headers['Cookie'] = cookie

      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      const setCookie = res.headers.get('set-cookie')
      let newCookie = cookie
      if (setCookie) {
        newCookie = setCookie.split(';')[0]
      }

      let data = null
      try {
        data = await res.json()
      } catch (err) {
        data = null
      }

      return { status: res.status, data, cookie: newCookie }
    }

    // --- STEP 1: Owner Login ---
    console.log('\n--- STEP 1: Owner Login ---')
    const ownerLogin = await request('POST', '/auth/login', {
      username: 'admin@arine.ma',
      password: 'admin123',
    })

    if (ownerLogin.status !== 200 || !ownerLogin.cookie) {
      throw new Error(`Owner login failed with status ${ownerLogin.status}: ${JSON.stringify(ownerLogin.data)}`)
    }
    ownerCookie = ownerLogin.cookie
    console.log('✅ Owner logged in successfully. Role:', ownerLogin.data.admin.role)

    // Verify Owner Profile
    const ownerMe = await request('GET', '/auth/me', null, ownerCookie)
    if (ownerMe.status !== 200 || ownerMe.data.admin.role !== 'SUPER_ADMIN') {
      throw new Error(`Owner profile verification failed: ${JSON.stringify(ownerMe.data)}`)
    }
    console.log('✅ Owner /auth/me verified as SUPER_ADMIN')

    // --- STEP 2: Owner Accesses Protected Endpoints ---
    console.log('\n--- STEP 2: Owner Accesses Admin Team, Activity Logs, Finance, Settings ---')
    const listUsersRes = await request('GET', '/users', null, ownerCookie)
    if (listUsersRes.status !== 200) throw new Error('Owner failed to list users')
    console.log('✅ Owner can access GET /users (Admin Team)')

    const listLogsRes = await request('GET', '/activity-logs', null, ownerCookie)
    if (listLogsRes.status !== 200) throw new Error('Owner failed to list activity logs')
    console.log('✅ Owner can access GET /activity-logs')

    const getProfitRes = await request('GET', '/profit/overview', null, ownerCookie)
    if (getProfitRes.status !== 200) throw new Error('Owner failed to access profit reports')
    console.log('✅ Owner can access GET /profit/overview (Finance)')

    const getStoreConfigRes = await request('GET', '/store-config', null, ownerCookie)
    if (getStoreConfigRes.status !== 200) throw new Error('Owner failed to access store config')
    console.log('✅ Owner can access GET /store-config')

    // --- STEP 3: Owner Creates Restricted Staff Member ---
    console.log('\n--- STEP 3: Owner Creates Restricted Staff Member ---')
    const createStaffRes = await request('POST', '/users', {
      name: 'Test Staff Order Manager',
      username: testStaffUsername,
      email: `${testStaffUsername}@arine.ma`,
      phone: '+212611223344',
      password: testStaffPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      permissions: ['DASHBOARD_VIEW', 'ORDERS_VIEW', 'ORDERS_STATUS_UPDATE', 'PRODUCTS_VIEW'],
      notes: 'Test Order Manager account for E2E audit',
    }, ownerCookie)

    if (createStaffRes.status !== 201 || !createStaffRes.data.data?.id) {
      throw new Error(`Staff creation failed: ${JSON.stringify(createStaffRes.data)}`)
    }
    testStaffId = createStaffRes.data.data.id
    console.log(`✅ Staff account created successfully (ID: ${testStaffId}, Username: ${testStaffUsername})`)
    console.log(`   Assigned Permissions:`, createStaffRes.data.data.permissions)

    // --- STEP 4: Staff Member Logs In ---
    console.log('\n--- STEP 4: Staff Member Logs In ---')
    const staffLogin = await request('POST', '/auth/login', {
      username: testStaffUsername,
      password: testStaffPassword,
    })

    if (staffLogin.status !== 200 || !staffLogin.cookie) {
      throw new Error(`Staff login failed with status ${staffLogin.status}: ${JSON.stringify(staffLogin.data)}`)
    }
    staffCookie = staffLogin.cookie
    console.log('✅ Staff logged in successfully. Role:', staffLogin.data.admin.role)

    const staffMe = await request('GET', '/auth/me', null, staffCookie)
    if (staffMe.status !== 200 || staffMe.data.admin.role !== 'ADMIN') {
      throw new Error(`Staff profile verification failed: ${JSON.stringify(staffMe.data)}`)
    }
    if (!staffMe.data.admin.permissions.includes('ORDERS_VIEW') || staffMe.data.admin.permissions.includes('FINANCE_VIEW')) {
      throw new Error(`Staff permissions mismatch: ${JSON.stringify(staffMe.data.admin.permissions)}`)
    }
    console.log('✅ Staff /auth/me verified: Role=ADMIN, Permissions correctly scoped')

    // --- STEP 5: Staff Performs Allowed Operations ---
    console.log('\n--- STEP 5: Staff Performs Allowed Operations ---')
    const staffDash = await request('GET', '/dashboard', null, staffCookie)
    if (staffDash.status !== 200) throw new Error('Staff could not access allowed dashboard')
    console.log('✅ Staff allowed: GET /dashboard (Status 200)')

    const staffOrders = await request('GET', '/orders', null, staffCookie)
    if (staffOrders.status !== 200) throw new Error('Staff could not access allowed orders')
    console.log('✅ Staff allowed: GET /orders (Status 200)')

    const staffProducts = await request('GET', '/products', null, staffCookie)
    if (staffProducts.status !== 200) throw new Error('Staff could not access allowed products view')
    console.log('✅ Staff allowed: GET /products (Status 200)')

    // --- STEP 6: Server Blocks Unauthorized Endpoints (403 Forbidden) ---
    console.log('\n--- STEP 6: Server Enforces RBAC & Blocks Unauthorized Endpoints (403 Forbidden) ---')

    // 6.1 Finance / Profit
    const staffFinance = await request('GET', '/profit/overview', null, staffCookie)
    if (staffFinance.status !== 403) throw new Error(`Expected 403 for /profit/overview, got ${staffFinance.status}`)
    console.log('🛡️ Blocked: GET /profit/overview -> 403 FORBIDDEN (Permission: FINANCE_VIEW required)')

    // 6.2 Admin Team Management
    const staffUsers = await request('GET', '/users', null, staffCookie)
    if (staffUsers.status !== 403) throw new Error(`Expected 403 for /users, got ${staffUsers.status}`)
    console.log('🛡️ Blocked: GET /users -> 403 FORBIDDEN (Permission: ADMIN_USERS_VIEW required)')

    // 6.3 Activity Logs
    const staffLogs = await request('GET', '/activity-logs', null, staffCookie)
    if (staffLogs.status !== 403) throw new Error(`Expected 403 for /activity-logs, got ${staffLogs.status}`)
    console.log('🛡️ Blocked: GET /activity-logs -> 403 FORBIDDEN (Permission: ACTIVITY_LOG_VIEW required)')

    // 6.4 Product Creation
    const staffCreateProduct = await request('POST', '/products', { title: 'Unauthorized Book' }, staffCookie)
    if (staffCreateProduct.status !== 403) throw new Error(`Expected 403 for POST /products, got ${staffCreateProduct.status}`)
    console.log('🛡️ Blocked: POST /products -> 403 FORBIDDEN (Permission: PRODUCTS_CREATE required)')

    // 6.5 Store Config Update
    const staffUpdateConfig = await request('PUT', '/store-config', { store: { name: 'Hacked' } }, staffCookie)
    if (staffUpdateConfig.status !== 403) throw new Error(`Expected 403 for PUT /store-config, got ${staffUpdateConfig.status}`)
    console.log('🛡️ Blocked: PUT /store-config -> 403 FORBIDDEN (Permission: STORE_SETTINGS_UPDATE required)')

    // 6.6 Shipping Config Update
    const staffUpdateShipping = await request('PUT', '/shipping/config', { flatFee: 100 }, staffCookie)
    if (staffUpdateShipping.status !== 403) throw new Error(`Expected 403 for PUT /shipping/config, got ${staffUpdateShipping.status}`)
    console.log('🛡️ Blocked: PUT /shipping/config -> 403 FORBIDDEN (Permission: SHIPPING_UPDATE required)')

    // --- STEP 7: Privilege Escalation Protection ---
    console.log('\n--- STEP 7: Privilege Escalation Protection ---')
    const escalateRes = await request('PUT', `/users/${testStaffId}`, {
      role: 'SUPER_ADMIN',
      permissions: ['*'],
    }, staffCookie)
    if (escalateRes.status !== 403) throw new Error(`Expected 403 for self-promotion attempt, got ${escalateRes.status}`)
    console.log('🛡️ Blocked: Staff cannot self-promote or modify admin team -> 403 FORBIDDEN')

    // --- STEP 8: Account Deactivation & Session Invalidation ---
    console.log('\n--- STEP 8: Account Deactivation & Immediate Session Invalidation ---')
    const disableStaffRes = await request('PUT', `/users/${testStaffId}/status`, {
      status: 'INACTIVE',
    }, ownerCookie)
    if (disableStaffRes.status !== 200) throw new Error('Owner failed to deactivate staff account')
    console.log('✅ Owner deactivated staff account')

    // Inactive staff tries to make an API request with existing session
    const disabledStaffReq = await request('GET', '/dashboard', null, staffCookie)
    if (disabledStaffReq.status !== 401 && disabledStaffReq.status !== 403) {
      throw new Error(`Expected 401/403 for deactivated user session, got ${disabledStaffReq.status}`)
    }
    console.log(`🛡️ Blocked: Deactivated staff request rejected with status ${disabledStaffReq.status}`)

    // Inactive staff tries to log in again
    const disabledLogin = await request('POST', '/auth/login', {
      username: testStaffUsername,
      password: testStaffPassword,
    })
    if (disabledLogin.status !== 403) {
      throw new Error(`Expected 403 for deactivated login, got ${disabledLogin.status}`)
    }
    console.log('🛡️ Blocked: Deactivated staff login rejected with 403 LOGIN_BLOCKED')

    // --- STEP 9: Password Reset with Active Session Revocation ---
    console.log('\n--- STEP 9: Password Reset with Active Session Revocation ---')
    // Reactivate user first
    await request('PUT', `/users/${testStaffId}/status`, { status: 'ACTIVE' }, ownerCookie)

    // Login to get fresh session
    const freshLogin = await request('POST', '/auth/login', {
      username: testStaffUsername,
      password: testStaffPassword,
    })
    const activeStaffCookie = freshLogin.cookie

    // Verify session is active
    const checkActive = await request('GET', '/dashboard', null, activeStaffCookie)
    if (checkActive.status !== 200) throw new Error('Active session check failed')
    console.log('✅ Fresh session verified as active')

    // Owner resets password with revokeSessions: true
    const newStaffPassword = 'NewSecretPassword999!'
    const resetRes = await request('POST', `/users/${testStaffId}/reset-password`, {
      newPassword: newStaffPassword,
      revokeSessions: true,
    }, ownerCookie)
    if (resetRes.status !== 200) throw new Error('Password reset failed')
    console.log('✅ Owner reset staff password and requested session revocation')

    // Previous session must now be invalid
    const revokedCheck = await request('GET', '/dashboard', null, activeStaffCookie)
    if (revokedCheck.status !== 401 && revokedCheck.status !== 403) {
      throw new Error(`Expected 401/403 on revoked session, got ${revokedCheck.status}`)
    }
    console.log('🛡️ Revoked: Old session was invalidated from database session store')

    // Login with new password succeeds
    const newLogin = await request('POST', '/auth/login', {
      username: testStaffUsername,
      password: newStaffPassword,
    })
    if (newLogin.status !== 200) throw new Error('Login with new password failed')
    console.log('✅ Staff logged in successfully with new password')

    // --- STEP 10: Verify Activity Log / Audit Trail ---
    console.log('\n--- STEP 10: Verify Activity Log / Audit Trail & Sanitization ---')
    const finalLogsRes = await request('GET', '/activity-logs?limit=50', null, ownerCookie)
    if (finalLogsRes.status !== 200 || !Array.isArray(finalLogsRes.data.logs)) {
      throw new Error('Failed to fetch activity logs for verification')
    }

    const logs = finalLogsRes.data.logs
    console.log(`📋 Total logged entries retrieved: ${logs.length}`)

    const actionsRecorded = logs.map(l => l.action)
    console.log('   Recent actions recorded:', [...new Set(actionsRecorded)].slice(0, 10))

    // Check that user creation was logged
    const userCreatedLog = logs.find(l => l.action === 'USER_CREATED')
    if (!userCreatedLog) throw new Error('USER_CREATED action was not logged in activity_logs')
    console.log('✅ USER_CREATED log entry confirmed with actor:', userCreatedLog.actorName)

    // Check that login actions were logged
    const loginLog = logs.find(l => l.action === 'LOGIN_SUCCESS')
    if (!loginLog) throw new Error('LOGIN_SUCCESS action was not logged in activity_logs')
    console.log('✅ LOGIN_SUCCESS log entry confirmed')

    // Check that password reset was logged
    const pwResetLog = logs.find(l => l.action === 'PASSWORD_RESET')
    if (!pwResetLog) throw new Error('PASSWORD_RESET action was not logged in activity_logs')
    console.log('✅ PASSWORD_RESET log entry confirmed')

    // Verify sanitization: NO sensitive secrets in details
    for (const log of logs) {
      const detailsStr = JSON.stringify(log.details || {})
      if (detailsStr.includes('password') || detailsStr.includes('StaffPassword123') || detailsStr.includes('NewSecretPassword999')) {
        throw new Error(`CRITICAL SECURITY FAILURE: Sensitive password found in log details: ${detailsStr}`)
      }
    }
    console.log('🔒 Security Audit Verified: 100% of activity log entries are properly sanitized (zero leaked passwords/secrets)')

    console.log('\n🎉 ALL 10 RBAC, SECURITY, PERMISSIONS, AND AUDIT TRAIL TESTS PASSED 100%!')

  } finally {
    // Cleanup test staff user from database
    if (testStaffId) {
      console.log(`\n🧹 Cleaning up test staff user (ID: ${testStaffId})...`)
      try {
        await prisma.admin.delete({ where: { id: testStaffId } })
        console.log('✅ Test user cleaned up successfully.')
      } catch (err) {
        console.warn('Could not delete test user:', err.message)
      }
    }

    server.close()
    await prisma.$disconnect()
  }
}

runTest().catch((err) => {
  console.error('\n❌ E2E VERIFICATION TEST FAILED:', err)
  process.exit(1)
})
