import { prisma } from '../../lib/prisma.js'
import { MetaClient } from './meta-client.js'
import { getMarketingSettingsInternal } from './meta-auth.service.js'

/**
 * Normalizes and hashes customer user data according to Meta Conversions API specification.
 */
export function buildUserData({
  email = null,
  phone = null,
  firstName = null,
  lastName = null,
  fullName = null,
  city = null,
  country = 'MA', // Morocco default
  zip = null,
  clientIp = null,
  userAgent = null,
  fbp = null,
  fbc = null,
} = {}) {
  const userData = {}

  // 1. Email (em)
  if (email) {
    const hashedEmail = MetaClient.hashUserData(email)
    if (hashedEmail) userData.em = [hashedEmail]
  }

  // 2. Phone (ph)
  if (phone) {
    const hashedPhone = MetaClient.hashPhone(phone)
    if (hashedPhone) userData.ph = [hashedPhone]
  }

  // 3. Name (fn / ln)
  if (firstName) {
    const h = MetaClient.hashUserData(firstName)
    if (h) userData.fn = [h]
  } else if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    if (parts[0]) {
      const h = MetaClient.hashUserData(parts[0])
      if (h) userData.fn = [h]
    }
    if (parts.length > 1) {
      const h = MetaClient.hashUserData(parts.slice(1).join(' '))
      if (h) userData.ln = [h]
    }
  }

  if (lastName) {
    const h = MetaClient.hashUserData(lastName)
    if (h) userData.ln = [h]
  }

  // 4. City (ct)
  if (city) {
    const h = MetaClient.hashUserData(city)
    if (h) userData.ct = [h]
  }

  // 5. Country (country) - 2-letter ISO code
  if (country) {
    const h = MetaClient.hashUserData(country)
    if (h) userData.country = [h]
  }

  // 6. Postal Code (zp)
  if (zip) {
    const h = MetaClient.hashUserData(zip)
    if (h) userData.zp = [h]
  }

  // 7. Plaintext identifiers (Do NOT hash client_ip_address, client_user_agent, fbp, fbc)
  if (clientIp) userData.client_ip_address = String(clientIp)
  if (userAgent) userData.client_user_agent = String(userAgent)
  if (fbp) userData.fbp = String(fbp)
  if (fbc) userData.fbc = String(fbc)

  return userData
}

/**
 * Send Conversions API event to Meta
 */
export async function sendCapiEvent({
  eventName,
  eventId,
  eventTime = Math.floor(Date.now() / 1000),
  eventSourceUrl = null,
  actionSource = 'website',
  userData = {},
  customData = {},
  testEventCode = null,
  orderId = null,
  productId = null,
  packageId = null,
  attributionId = null,
}) {
  const settings = await getMarketingSettingsInternal()

  const pixelId = settings.pixelId
  const token = settings.capiToken || settings.accessToken
  const isCapiEnabled = settings.capiEnabled

  // Format custom data
  const formattedCustomData = {
    currency: customData.currency || settings.currency || 'MAD',
    value: typeof customData.value === 'number' ? Number(customData.value.toFixed(2)) : undefined,
    content_type: customData.content_type || 'product',
    contents: customData.contents || [],
    content_ids: customData.content_ids || [],
    num_items: customData.num_items || (customData.contents ? customData.contents.length : undefined),
    order_id: customData.order_id || (orderId ? String(orderId) : undefined),
  }

  // Filter out undefined keys
  Object.keys(formattedCustomData).forEach(
    (key) => formattedCustomData[key] === undefined && delete formattedCustomData[key]
  )

  // Ensure unique event record in DB
  let dbEvent = await prisma.marketingEvent.findUnique({
    where: { eventId },
  })

  if (!dbEvent) {
    dbEvent = await prisma.marketingEvent.create({
      data: {
        eventId,
        eventName,
        eventTime: new Date(eventTime * 1000),
        source: 'SERVER',
        actionSource,
        eventSourceUrl: eventSourceUrl ? String(eventSourceUrl).slice(0, 1000) : null,
        status: 'PENDING',
        orderId: orderId ? Number(orderId) : null,
        productId: productId ? Number(productId) : null,
        packageId: packageId ? Number(packageId) : null,
        attributionId: attributionId ? Number(attributionId) : null,
        value: formattedCustomData.value ?? null,
        currency: formattedCustomData.currency || 'MAD',
        userData: userData || {},
        customData: formattedCustomData || {},
      },
    })
  }

  // If CAPI is not configured or disabled, mark as SKIPPED
  if (!isCapiEnabled || !pixelId || !token) {
    const updated = await prisma.marketingEvent.update({
      where: { id: dbEvent.id },
      data: {
        status: 'SKIPPED',
        errorMessage: !pixelId
          ? 'Pixel ID غير مهيأ'
          : !token
          ? 'رمز الوصول لـ CAPI غير مهيأ'
          : 'خدمة CAPI معطلة في الإعدادات',
      },
    })
    return {
      success: true,
      skipped: true,
      event: updated,
      message: 'تم تخطي الإرسال لعدم توفر تهيئة Meta CAPI',
    }
  }

  const client = new MetaClient({
    apiVersion: settings.apiVersion,
    accessToken: token,
  })

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        event_id: eventId,
        event_source_url: eventSourceUrl || undefined,
        action_source: actionSource,
        user_data: userData,
        custom_data: formattedCustomData,
        opt_out: false,
      },
    ],
  }

  const activeTestCode = testEventCode || settings.testEventCode
  if (activeTestCode) {
    payload.test_event_code = activeTestCode
  }

  try {
    const result = await client.post(`/${pixelId}/events`, payload)

    const updated = await prisma.marketingEvent.update({
      where: { id: dbEvent.id },
      data: {
        status: 'SENT',
        fbtraceId: result?.fbtrace_id || null,
        responseBody: result || null,
        errorMessage: null,
      },
    })

    return {
      success: true,
      event: updated,
      fbtrace_id: result?.fbtrace_id,
      events_received: result?.events_received,
    }
  } catch (err) {
    const errorMsg = err.metaUserMsg || err.message || 'فشل إرسال الحدث إلى Meta CAPI'

    const updated = await prisma.marketingEvent.update({
      where: { id: dbEvent.id },
      data: {
        status: 'FAILED',
        retryCount: { increment: 1 },
        fbtraceId: err.fbtrace_id || null,
        errorMessage: errorMsg,
        responseBody: {
          error: {
            code: err.metaCode,
            subcode: err.metaSubcode,
            type: err.metaType,
            message: errorMsg,
          },
        },
      },
    })

    return {
      success: false,
      event: updated,
      error: errorMsg,
    }
  }
}
