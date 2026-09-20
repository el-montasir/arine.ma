import { prisma } from '../../lib/prisma.js'
import { MetaClient } from './meta-client.js'

// Known settings keys
export const MARKETING_KEYS = {
  APP_ID: 'meta.app_id',
  APP_SECRET: 'meta.app_secret',
  ACCESS_TOKEN: 'meta.access_token',
  AD_ACCOUNT_ID: 'meta.ad_account_id',
  PIXEL_ID: 'meta.pixel_id',
  CAPI_TOKEN: 'meta.capi_token',
  TEST_EVENT_CODE: 'meta.test_event_code',
  CATALOG_ID: 'meta.catalog_id',
  PIXEL_ENABLED: 'meta.pixel_enabled',
  CAPI_ENABLED: 'meta.capi_enabled',
  AUTO_CATALOG_SYNC: 'meta.auto_catalog_sync',
  CURRENCY: 'meta.currency',
  API_VERSION: 'meta.api_version',
}

/**
 * Mask a token so only prefix and suffix are visible
 */
function maskSecret(val) {
  if (!val || typeof val !== 'string') return ''
  if (val.length <= 8) return '••••••••'
  return `${val.slice(0, 4)}••••••••${val.slice(-4)}`
}

/**
 * Get all marketing settings from database with ENV fallbacks
 */
export async function getMarketingSettingsInternal() {
  const records = await prisma.marketingSetting.findMany()
  const map = {}
  for (const r of records) {
    map[r.key] = r.value
  }

  return {
    appId: map[MARKETING_KEYS.APP_ID] || process.env.META_APP_ID || '',
    appSecret: map[MARKETING_KEYS.APP_SECRET] || process.env.META_APP_SECRET || '',
    accessToken: map[MARKETING_KEYS.ACCESS_TOKEN] || process.env.META_ACCESS_TOKEN || '',
    adAccountId: map[MARKETING_KEYS.AD_ACCOUNT_ID] || process.env.META_AD_ACCOUNT_ID || '',
    pixelId: map[MARKETING_KEYS.PIXEL_ID] || process.env.META_PIXEL_ID || '',
    capiToken: map[MARKETING_KEYS.CAPI_TOKEN] || map[MARKETING_KEYS.ACCESS_TOKEN] || process.env.META_CAPI_TOKEN || process.env.META_ACCESS_TOKEN || '',
    testEventCode: map[MARKETING_KEYS.TEST_EVENT_CODE] || process.env.META_TEST_EVENT_CODE || '',
    catalogId: map[MARKETING_KEYS.CATALOG_ID] || process.env.META_CATALOG_ID || '',
    pixelEnabled: map[MARKETING_KEYS.PIXEL_ENABLED] ? map[MARKETING_KEYS.PIXEL_ENABLED] === 'true' : true,
    capiEnabled: map[MARKETING_KEYS.CAPI_ENABLED] ? map[MARKETING_KEYS.CAPI_ENABLED] === 'true' : true,
    autoCatalogSync: map[MARKETING_KEYS.AUTO_CATALOG_SYNC] === 'true',
    currency: map[MARKETING_KEYS.CURRENCY] || 'MAD',
    apiVersion: map[MARKETING_KEYS.API_VERSION] || 'v21.0',
  }
}

/**
 * Get safe settings for Admin UI (never leak raw appSecret or tokens)
 */
export async function getAdminMarketingSettings() {
  const settings = await getMarketingSettingsInternal()
  const connection = await getOrCreateConnection()

  return {
    appId: settings.appId,
    appSecretMasked: maskSecret(settings.appSecret),
    hasAppSecret: Boolean(settings.appSecret),
    accessTokenMasked: maskSecret(settings.accessToken),
    hasAccessToken: Boolean(settings.accessToken),
    adAccountId: settings.adAccountId,
    pixelId: settings.pixelId,
    capiTokenMasked: maskSecret(settings.capiToken),
    hasCapiToken: Boolean(settings.capiToken),
    testEventCode: settings.testEventCode,
    catalogId: settings.catalogId,
    pixelEnabled: settings.pixelEnabled,
    capiEnabled: settings.capiEnabled,
    autoCatalogSync: settings.autoCatalogSync,
    currency: settings.currency,
    apiVersion: settings.apiVersion,
    connectionStatus: connection.status,
    connectionDetails: connection,
  }
}

/**
 * Get public tracking settings for Storefront (only public non-secret fields)
 */
export async function getPublicTrackingSettings() {
  const settings = await getMarketingSettingsInternal()
  return {
    pixelId: settings.pixelEnabled && settings.pixelId ? settings.pixelId : null,
    pixelEnabled: settings.pixelEnabled && Boolean(settings.pixelId),
    capiEnabled: settings.capiEnabled && Boolean(settings.pixelId && (settings.capiToken || settings.accessToken)),
    currency: settings.currency || 'MAD',
  }
}

/**
 * Save updated marketing settings
 */
export async function updateMarketingSettings(input) {
  const updates = []

  if (input.appId !== undefined) {
    updates.push({ key: MARKETING_KEYS.APP_ID, value: String(input.appId).trim() })
  }
  if (input.appSecret && !input.appSecret.includes('••••')) {
    updates.push({ key: MARKETING_KEYS.APP_SECRET, value: String(input.appSecret).trim() })
  }
  if (input.accessToken && !input.accessToken.includes('••••')) {
    updates.push({ key: MARKETING_KEYS.ACCESS_TOKEN, value: String(input.accessToken).trim() })
  }
  if (input.adAccountId !== undefined) {
    let cleanAcc = String(input.adAccountId).trim()
    // Standardize ad account ID with 'act_' prefix if numerical only
    if (cleanAcc && !cleanAcc.startsWith('act_') && /^\d+$/.test(cleanAcc)) {
      cleanAcc = `act_${cleanAcc}`
    }
    updates.push({ key: MARKETING_KEYS.AD_ACCOUNT_ID, value: cleanAcc })
  }
  if (input.pixelId !== undefined) {
    updates.push({ key: MARKETING_KEYS.PIXEL_ID, value: String(input.pixelId).trim() })
  }
  if (input.capiToken && !input.capiToken.includes('••••')) {
    updates.push({ key: MARKETING_KEYS.CAPI_TOKEN, value: String(input.capiToken).trim() })
  }
  if (input.testEventCode !== undefined) {
    updates.push({ key: MARKETING_KEYS.TEST_EVENT_CODE, value: String(input.testEventCode).trim() })
  }
  if (input.catalogId !== undefined) {
    updates.push({ key: MARKETING_KEYS.CATALOG_ID, value: String(input.catalogId).trim() })
  }
  if (input.pixelEnabled !== undefined) {
    updates.push({ key: MARKETING_KEYS.PIXEL_ENABLED, value: input.pixelEnabled ? 'true' : 'false' })
  }
  if (input.capiEnabled !== undefined) {
    updates.push({ key: MARKETING_KEYS.CAPI_ENABLED, value: input.capiEnabled ? 'true' : 'false' })
  }
  if (input.autoCatalogSync !== undefined) {
    updates.push({ key: MARKETING_KEYS.AUTO_CATALOG_SYNC, value: input.autoCatalogSync ? 'true' : 'false' })
  }
  if (input.currency !== undefined) {
    updates.push({ key: MARKETING_KEYS.CURRENCY, value: String(input.currency).trim().toUpperCase() })
  }
  if (input.apiVersion !== undefined) {
    updates.push({ key: MARKETING_KEYS.API_VERSION, value: String(input.apiVersion).trim() })
  }

  for (const item of updates) {
    await prisma.marketingSetting.upsert({
      where: { key: item.key },
      create: item,
      update: { value: item.value },
    })
  }

  // Check connection status automatically if token or ad account was updated
  return testMetaConnection()
}

/**
 * Get or initialize MarketingConnection record
 */
export async function getOrCreateConnection() {
  let conn = await prisma.marketingConnection.findUnique({
    where: { platform: 'meta' },
  })

  if (!conn) {
    conn = await prisma.marketingConnection.create({
      data: {
        platform: 'meta',
        status: 'NOT_CONFIGURED',
      },
    })
  }

  return conn
}

/**
 * Test Meta Connection against live Graph API
 */
export async function testMetaConnection() {
  const settings = await getMarketingSettingsInternal()
  const conn = await getOrCreateConnection()

  if (!settings.accessToken && !settings.adAccountId && !settings.pixelId) {
    const updated = await prisma.marketingConnection.update({
      where: { id: conn.id },
      data: {
        status: 'NOT_CONFIGURED',
        accountName: null,
        accountId: null,
        pixelId: null,
        catalogId: null,
        errorMessage: null,
        lastCheckedAt: new Date(),
      },
    })
    return {
      success: true,
      status: 'NOT_CONFIGURED',
      message: 'بيانات Meta Ads غير مهيأة بعد',
      connection: updated,
    }
  }

  if (!settings.accessToken) {
    const updated = await prisma.marketingConnection.update({
      where: { id: conn.id },
      data: {
        status: 'NOT_CONFIGURED',
        errorMessage: 'رمز الوصول (Meta Access Token) مطلوب لإتمام الاتصال',
        lastCheckedAt: new Date(),
      },
    })
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      message: 'رمز الوصول غير موجود',
      connection: updated,
    }
  }

  const client = new MetaClient({
    apiVersion: settings.apiVersion,
    accessToken: settings.accessToken,
  })

  try {
    // 1. Verify Token & User / App info via /me
    let meData = null
    try {
      meData = await client.get('/me', {
        params: { fields: 'id,name' },
      })
    } catch (e) {
      // If /me fails, test if token works for ad account directly
    }

    // 2. Verify Ad Account access if configured
    let adAccountData = null
    if (settings.adAccountId) {
      const adAccId = settings.adAccountId.startsWith('act_') ? settings.adAccountId : `act_${settings.adAccountId}`
      adAccountData = await client.get(`/${adAccId}`, {
        params: {
          fields: 'id,name,account_status,currency,timezone_name,amount_spent',
        },
      })
    }

    // 3. Verify Pixel ID if configured
    let pixelData = null
    if (settings.pixelId) {
      try {
        pixelData = await client.get(`/${settings.pixelId}`, {
          params: { fields: 'id,name,is_unavailable' },
        })
      } catch {
        // Pixel verification might require specific pixel permissions, ignore if ad account succeeds
      }
    }

    // 4. Verify Catalog if configured
    let catalogData = null
    if (settings.catalogId) {
      try {
        catalogData = await client.get(`/${settings.catalogId}`, {
          params: { fields: 'id,name,product_count' },
        })
      } catch {
        // Catalog check
      }
    }

    const accountName = adAccountData?.name || meData?.name || 'Meta Ad Account'
    const accountId = adAccountData?.id || settings.adAccountId || null

    const updated = await prisma.marketingConnection.update({
      where: { id: conn.id },
      data: {
        status: 'CONNECTED',
        accountName,
        accountId,
        pixelId: settings.pixelId || null,
        catalogId: settings.catalogId || null,
        errorMessage: null,
        lastCheckedAt: new Date(),
        details: {
          adAccount: adAccountData,
          pixel: pixelData,
          catalog: catalogData,
          user: meData,
        },
      },
    })

    return {
      success: true,
      status: 'CONNECTED',
      message: 'تم التحقق من الاتصال بحساب Meta بنجاح',
      connection: updated,
    }
  } catch (err) {
    let status = 'ERROR'
    if (err.metaCode === 190 || err.status === 401) {
      status = 'EXPIRED'
    } else if (err.metaCode === 100 || err.metaCode === 200 || err.status === 403) {
      status = 'INVALID'
    }

    const errorMessage = err.metaUserMsg || err.message || 'فشل الاتصال بـ Meta Graph API'

    const updated = await prisma.marketingConnection.update({
      where: { id: conn.id },
      data: {
        status,
        errorMessage,
        lastCheckedAt: new Date(),
        details: {
          error: {
            code: err.metaCode,
            subcode: err.metaSubcode,
            type: err.metaType,
            fbtrace_id: err.fbtrace_id,
            message: errorMessage,
          },
        },
      },
    })

    return {
      success: false,
      status,
      message: errorMessage,
      connection: updated,
    }
  }
}

/**
 * Disconnect Meta integration and clear tokens
 */
export async function disconnectMeta() {
  const keysToDelete = [
    MARKETING_KEYS.ACCESS_TOKEN,
    MARKETING_KEYS.APP_SECRET,
    MARKETING_KEYS.CAPI_TOKEN,
    MARKETING_KEYS.APP_ID,
    MARKETING_KEYS.AD_ACCOUNT_ID,
    MARKETING_KEYS.PIXEL_ID,
    MARKETING_KEYS.CATALOG_ID,
    MARKETING_KEYS.TEST_EVENT_CODE,
  ]

  await prisma.marketingSetting.deleteMany({
    where: { key: { in: keysToDelete } },
  })

  const conn = await getOrCreateConnection()
  const updated = await prisma.marketingConnection.update({
    where: { id: conn.id },
    data: {
      status: 'NOT_CONFIGURED',
      accountName: null,
      accountId: null,
      pixelId: null,
      catalogId: null,
      tokenScope: null,
      errorMessage: null,
      details: null,
      lastCheckedAt: new Date(),
    },
  })

  return {
    success: true,
    status: 'NOT_CONFIGURED',
    message: 'تم إلغاء ربط حساب Meta بنجاح',
    connection: updated,
  }
}
