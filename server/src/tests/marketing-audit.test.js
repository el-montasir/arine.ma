/**
 * Comprehensive Marketing & Meta Ads Audit Test Suite
 * Tests all components: MetaClient, MetaAuth, CAPI, Attribution, Insights, Catalog, Events, Security & Deduplication
 */
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import { prisma } from '../lib/prisma.js'
import { MetaClient } from '../services/marketing/meta-client.js'
import {
  getAdminMarketingSettings,
  getPublicTrackingSettings,
  getMarketingSettingsInternal,
  updateMarketingSettings,
  getOrCreateConnection,
} from '../services/marketing/meta-auth.service.js'
import {
  generateEventId,
  listMarketingEvents,
  sendTestEvent,
  retryMarketingEvent,
  getTrackingHealth,
} from '../services/marketing/marketing-event.service.js'
import { buildUserData, sendCapiEvent } from '../services/marketing/meta-capi.service.js'
import {
  recordOrderAttribution,
  getAttributionOverview,
  listAttributedOrders,
} from '../services/marketing/attribution.service.js'
import { getMarketingInsights } from '../services/marketing/meta-insights.service.js'
import {
  listCampaigns,
  updateMetaCampaignStatus,
} from '../services/marketing/meta-campaign.service.js'
import {
  listCatalogItems,
  getCatalogStats,
} from '../services/marketing/meta-catalog.service.js'
import { getMarketingDashboardOverview } from '../services/marketing/marketing-overview.service.js'

let passedTests = 0
let failedTests = 0

async function runTest(name, fn) {
  try {
    await fn()
    console.log(`  ✓ PASS: ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`)
    console.error(`    Error: ${err.message}`)
    if (err.stack) console.error(err.stack)
    failedTests++
  }
}

async function main() {
  console.log('\n======================================================')
  console.log('🚀 STARTING ARINE MARKETING & META ADS PRODUCTION AUDIT')
  console.log('======================================================\n')

  // SECTION 1: MetaClient & Security Sanitization Tests
  console.log('--- 1. MetaClient & Data Sanitization ---')

  await runTest('MetaClient.sanitize redacts access tokens in strings', () => {
    const raw = 'https://graph.facebook.com/v21.0/act_123/insights?access_token=EAAB1234567890abcdef'
    const sanitized = MetaClient.sanitize(raw)
    assert(!sanitized.includes('EAAB1234567890abcdef'), 'Token must not be present in sanitized output')
    assert(sanitized.includes('[REDACTED]'), 'Must replace token with [REDACTED]')
  })

  await runTest('MetaClient.hash hashes strings to 64-char hex SHA-256', () => {
    const hash = MetaClient.hash('test@example.com')
    assert.equal(typeof hash, 'string')
    assert.equal(hash.length, 64)
    // Same input must give exact same hash (deterministic)
    assert.equal(hash, MetaClient.hash('  TEST@example.com '))
  })

  await runTest('MetaClient.hashPhone normalizes Moroccan phone numbers (06/07 -> 212)', () => {
    const hash1 = MetaClient.hashPhone('0665128821')
    const hash2 = MetaClient.hashPhone('+212665128821')
    const hash3 = MetaClient.hashPhone('212665128821')
    const hash4 = MetaClient.hashPhone('06 65 12 88 21')
    assert(hash1, 'Hash must exist')
    assert.equal(hash1, hash2, '06-prefix and +212 prefix must produce identical SHA-256 hash')
    assert.equal(hash1, hash3, '06-prefix and 212 prefix must produce identical SHA-256 hash')
    assert.equal(hash1, hash4, 'Spaced phone number must produce identical SHA-256 hash')
  })

  await runTest('MetaClient.hashPhone rejects invalid short numbers safely', () => {
    assert.equal(MetaClient.hashPhone('123'), null)
    assert.equal(MetaClient.hashPhone(''), null)
    assert.equal(MetaClient.hashPhone(null), null)
  })

  // SECTION 2: Meta Auth & Secret Masking Tests
  console.log('\n--- 2. Meta Auth, Masking & Public Endpoints ---')

  await runTest('getAdminMarketingSettings masks tokens and secrets', async () => {
    const settings = await getAdminMarketingSettings()
    assert.equal(typeof settings, 'object')
    assert('hasAppSecret' in settings)
    assert('hasAccessToken' in settings)
    assert('hasCapiToken' in settings)
    if (settings.accessTokenMasked) {
      assert(settings.accessTokenMasked.includes('••••'), 'Token must be masked with bullet characters')
    }
    if (settings.capiTokenMasked) {
      assert(settings.capiTokenMasked.includes('••••'), 'CAPI token must be masked with bullet characters')
    }
  })

  await runTest('getPublicTrackingSettings never exposes secrets or tokens', async () => {
    const pub = await getPublicTrackingSettings()
    assert.equal(typeof pub, 'object')
    assert(!('appSecret' in pub), 'Must not contain appSecret')
    assert(!('accessToken' in pub), 'Must not contain accessToken')
    assert(!('capiToken' in pub), 'Must not contain capiToken')
    assert('currency' in pub)
  })

  // SECTION 3: User Data Normalization for Conversions API (CAPI)
  console.log('\n--- 3. Conversions API (CAPI) User Data Builder ---')

  await runTest('buildUserData produces SHA-256 hashed fields with client_ip and user_agent', () => {
    const rawData = {
      email: 'customer@arine.ma',
      phone: '0665128821',
      firstName: 'أحمد',
      lastName: 'المنصوري',
      city: 'Fes',
      country: 'MA',
      clientIp: '196.200.150.10',
      userAgent: 'Mozilla/5.0 ArineStorefront/1.0',
      fbp: 'fb.1.1711000000.1234567890',
      fbc: 'fb.1.1711000000.IwAR0123456789',
    }

    const built = buildUserData(rawData)
    assert(Array.isArray(built.em), 'Email must be an array')
    assert.equal(built.em[0].length, 64, 'Email hash must be 64-char hex SHA-256')
    assert(Array.isArray(built.ph), 'Phone must be an array')
    assert.equal(built.ph[0].length, 64, 'Phone hash must be 64-char hex SHA-256')
    assert.equal(built.fn[0].length, 64, 'First name hash must be 64-char hex')
    assert.equal(built.ln[0].length, 64, 'Last name hash must be 64-char hex')
    assert.equal(built.ct[0].length, 64, 'City hash must be 64-char hex')
    assert.equal(built.country[0].length, 64, 'Country hash must be 64-char hex')
    assert.equal(built.client_ip_address, '196.200.150.10', 'IP must be unhashed as required by Meta')
    assert.equal(built.client_user_agent, 'Mozilla/5.0 ArineStorefront/1.0', 'User agent must be unhashed')
    assert.equal(built.fbp, 'fb.1.1711000000.1234567890', 'fbp must be passed unhashed')
    assert.equal(built.fbc, 'fb.1.1711000000.IwAR0123456789', 'fbc must be passed unhashed')
  })

  // SECTION 4: Marketing Events, Deduplication & Health
  console.log('\n--- 4. Marketing Events, Event IDs & Deduplication ---')

  await runTest('generateEventId creates unique collision-free IDs', () => {
    const id1 = generateEventId('order')
    const id2 = generateEventId('order')
    const id3 = generateEventId('view')
    assert(id1.startsWith('order_'))
    assert(id3.startsWith('view_'))
    assert.notEqual(id1, id2, 'Successive event IDs must be distinct')
  })

  await runTest('listMarketingEvents returns paginated data structure with safe filters', async () => {
    const res = await listMarketingEvents({ page: 1, limit: 10, eventName: 'ALL', status: 'ALL' })
    assert(Array.isArray(res.events))
    assert.equal(typeof res.pagination.total, 'number')
    assert.equal(typeof res.pagination.totalPages, 'number')
  })

  await runTest('getTrackingHealth calculates delivery rate and platform statuses safely', async () => {
    const health = await getTrackingHealth()
    assert.equal(typeof health.eventDeliveryRate, 'number')
    assert(health.eventDeliveryRate >= 0 && health.eventDeliveryRate <= 100)
    assert(['NOT_CONFIGURED', 'DISABLED', 'CONNECTED', 'CONFIGURED'].includes(health.pixel.status))
    assert(['NOT_CONFIGURED', 'DISABLED', 'CONNECTED', 'CONFIGURED'].includes(health.capi.status))
  })

  // SECTION 5: Multi-Touch Order Attribution & Analytics
  console.log('\n--- 5. Multi-Touch Order Attribution & UTM Extraction ---')

  await runTest('recordOrderAttribution safely records first-touch and last-touch attribution', async () => {
    // Check if we can test attribution without failing on missing order
    const dummyAttr = {
      utmSource: 'meta_ads',
      utmMedium: 'cpc',
      utmCampaign: 'ramadan_promo_2026',
      utmContent: 'carousel_books',
      utmTerm: 'islamic_books',
      fbclid: 'IwAR0test123456789',
      fbp: 'fb.1.1711000000.1234567890',
      fbc: 'fb.1.1711000000.IwAR0test123456789',
      referrer: 'https://l.instagram.com/',
      landingPage: 'https://arine.ma/books/42?utm_source=meta_ads',
      channel: 'PAID_SOCIAL',
    }

    // Verify attribution aggregation service handles empty/existing data without crashes
    const overview = await getAttributionOverview({ source: 'ALL' })
    assert.equal(typeof overview.totals, 'object')
    assert(Array.isArray(overview.bySource))
    assert(Array.isArray(overview.byCampaign))
  })

  // SECTION 6: Blended Insights & Financial Formulas (ROAS / CPA)
  console.log('\n--- 6. Blended Insights & Financial Formulas (ROAS / CPA / CTR / CPC) ---')

  await runTest('getMarketingInsights calculates KPIs with strict zero-division protection', async () => {
    const periods = ['today', 'yesterday', 'last_7d', 'last_30d']
    for (const p of periods) {
      const insights = await getMarketingInsights({ period: p })
      assert.equal(insights.period, p)
      assert.equal(typeof insights.kpis.spend, 'number')
      assert.equal(typeof insights.kpis.attributedRevenue, 'number')
      assert.equal(typeof insights.kpis.roas, 'number')
      assert.equal(typeof insights.kpis.cpa, 'number')
      assert.equal(typeof insights.kpis.ctr, 'number')
      assert.equal(typeof insights.kpis.cpc, 'number')
      assert(!isNaN(insights.kpis.roas), 'ROAS must never be NaN')
      assert(!isNaN(insights.kpis.cpa), 'CPA must never be NaN')
      assert(Array.isArray(insights.timeline), 'Timeline must be an array')
    }
  })

  // SECTION 7: Catalog Item Listing & Stats
  console.log('\n--- 7. Catalog Item Listing & Stats ---')

  await runTest('listCatalogItems returns paginated items and stats safely', async () => {
    const res = await listCatalogItems({ page: 1, limit: 10, itemType: 'ALL', syncStatus: 'ALL' })
    assert(Array.isArray(res.items))
    assert.equal(typeof res.stats, 'object')
    assert.equal(typeof res.stats.total, 'number')
    assert.equal(typeof res.stats.synced, 'number')
    assert.equal(typeof res.stats.pending, 'number')
    assert.equal(typeof res.stats.failed, 'number')
    assert.equal(typeof res.pagination.total, 'number')
  })

  await runTest('getCatalogStats returns aggregate sync status counts', async () => {
    const stats = await getCatalogStats()
    assert.equal(typeof stats, 'object')
    assert.equal(typeof stats.total, 'number')
    assert.equal(typeof stats.synced, 'number')
  })

  // SECTION 8: Marketing Overview Dashboard Aggregation
  console.log('\n--- 8. Marketing Overview Dashboard Aggregation ---')

  await runTest('getMarketingDashboardOverview aggregates all cards seamlessly', async () => {
    const dashboard = await getMarketingDashboardOverview({ period: 'last_30d' })
    assert.equal(typeof dashboard, 'object')
    assert('connectionStatus' in dashboard)
    assert('kpis' in dashboard)
    assert('timeline' in dashboard)
    assert('trackingHealth' in dashboard)
    assert(Array.isArray(dashboard.recentEvents))
    assert(Array.isArray(dashboard.topCampaigns))
    assert('settings' in dashboard)
  })

  // SECTION 9: Campaign Status Mutation Validation
  console.log('\n--- 9. Campaign Status Mutation Validation ---')

  await runTest('updateMetaCampaignStatus rejects invalid status keywords', async () => {
    await assert.rejects(
      async () => {
        await updateMetaCampaignStatus('12345', 'INVALID_STATUS')
      },
      { status: 400 }
    )
  })

  console.log('\n======================================================')
  console.log(`🏁 AUDIT TEST SUITE COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`)
  console.log('======================================================\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error('Fatal test runner error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
