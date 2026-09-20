import crypto from 'crypto'
import { prisma } from '../../lib/prisma.js'
import { sendCapiEvent, buildUserData } from './meta-capi.service.js'
import { getMarketingSettingsInternal, getOrCreateConnection } from './meta-auth.service.js'

/**
 * Generate a unique, collision-safe Event ID
 */
export function generateEventId(prefix = 'evt') {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(6).toString('hex')
  return `${prefix}_${timestamp}_${random}`
}

/**
 * List marketing events with filters and pagination for Admin UI
 */
export async function listMarketingEvents({
  page = 1,
  limit = 25,
  eventName = null,
  status = null,
  source = null,
  orderId = null,
  startDate = null,
  endDate = null,
  search = null,
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25))
  const skip = (pageNum - 1) * limitNum

  const where = {}

  if (eventName && eventName !== 'ALL') {
    where.eventName = eventName
  }

  if (status && status !== 'ALL') {
    where.status = status
  }

  if (source && source !== 'ALL') {
    where.source = source
  }

  if (orderId) {
    where.orderId = parseInt(orderId, 10)
  }

  if (startDate || endDate) {
    where.eventTime = {}
    if (startDate) {
      const s = new Date(startDate)
      if (!isNaN(s.getTime())) where.eventTime.gte = s
    }
    if (endDate) {
      const e = new Date(endDate)
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999)
        where.eventTime.lte = e
      }
    }
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim()
    where.OR = [
      { eventId: { contains: term, mode: 'insensitive' } },
      { eventName: { contains: term, mode: 'insensitive' } },
      { eventSourceUrl: { contains: term, mode: 'insensitive' } },
      { errorMessage: { contains: term, mode: 'insensitive' } },
    ]
  }

  const [total, events] = await Promise.all([
    prisma.marketingEvent.count({ where }),
    prisma.marketingEvent.findMany({
      where,
      orderBy: { eventTime: 'desc' },
      skip,
      take: limitNum,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            fullName: true,
            total: true,
            status: true,
          },
        },
        attribution: {
          select: {
            id: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            fbclid: true,
          },
        },
      },
    }),
  ])

  return {
    events,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  }
}

/**
 * Get single event details by ID
 */
export async function getMarketingEventById(id) {
  return prisma.marketingEvent.findUnique({
    where: { id: Number(id) },
    include: {
      order: true,
      product: true,
      package: true,
      attribution: true,
    },
  })
}

/**
 * Retry a single failed or pending event (Safe & Idempotent)
 */
export async function retryMarketingEvent(eventIdOrId) {
  const isNumeric = /^\d+$/.test(String(eventIdOrId))
  const event = await prisma.marketingEvent.findFirst({
    where: isNumeric ? { id: Number(eventIdOrId) } : { eventId: String(eventIdOrId) },
  })

  if (!event) {
    const err = new Error('الحدث غير موجود')
    err.status = 404
    throw err
  }

  if (event.status === 'SENT') {
    return {
      success: true,
      event,
      message: 'تم إرسال هذا الحدث مسبقاً بنجاح (معرف الحدث مكرر)',
    }
  }

  const result = await sendCapiEvent({
    eventName: event.eventName,
    eventId: event.eventId, // Reuse identical event_id for deduplication
    eventTime: Math.floor(event.eventTime.getTime() / 1000),
    eventSourceUrl: event.eventSourceUrl,
    actionSource: event.actionSource,
    userData: event.userData || {},
    customData: event.customData || {},
    orderId: event.orderId,
    productId: event.productId,
    packageId: event.packageId,
    attributionId: event.attributionId,
  })

  return result
}

/**
 * Retry all failed events within max retry bounds
 */
export async function retryAllFailedEvents({ limit = 50 } = {}) {
  const failedEvents = await prisma.marketingEvent.findMany({
    where: {
      status: 'FAILED',
      retryCount: { lt: 5 },
    },
    take: limit,
    orderBy: { eventTime: 'asc' },
  })

  const results = {
    total: failedEvents.length,
    succeeded: 0,
    failed: 0,
  }

  for (const ev of failedEvents) {
    try {
      const res = await retryMarketingEvent(ev.id)
      if (res.success && res.event?.status === 'SENT') {
        results.succeeded++
      } else {
        results.failed++
      }
    } catch {
      results.failed++
    }
  }

  return results
}

/**
 * Send a Test Event to verify Pixel / CAPI connection
 */
export async function sendTestEvent({
  eventName = 'PageView',
  testEventCode = null,
  customData = {},
  userData = {},
}) {
  const eventId = generateEventId('test')
  const nowUnix = Math.floor(Date.now() / 1000)

  const builtUserData = buildUserData({
    email: userData.email || 'test@example.com',
    phone: userData.phone || '+212600000000',
    firstName: userData.firstName || 'Arine',
    lastName: userData.lastName || 'Tester',
    city: 'Casablanca',
    country: 'MA',
    clientIp: '127.0.0.1',
    userAgent: 'ArineTestAgent/1.0',
    ...userData,
  })

  const defaultCustomData = {
    currency: 'MAD',
    value: eventName === 'Purchase' ? 250 : eventName === 'AddToCart' ? 120 : undefined,
    content_name: 'كتاب تجريبي - اختبار Meta CAPI',
    content_type: 'product',
    content_ids: ['test-item-1'],
    num_items: 1,
    ...customData,
  }

  const result = await sendCapiEvent({
    eventName,
    eventId,
    eventTime: nowUnix,
    eventSourceUrl: 'http://localhost:5173/test',
    actionSource: 'website',
    userData: builtUserData,
    customData: defaultCustomData,
    testEventCode,
  })

  return {
    ...result,
    testEventId: eventId,
  }
}

/**
 * Diagnostic tracking health aggregator
 */
export async function getTrackingHealth() {
  const settings = await getMarketingSettingsInternal()
  const conn = await getOrCreateConnection()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalEvents,
    sentEvents,
    failedEvents,
    pendingEvents,
    lastSuccessEvent,
    lastFailedEvent,
    totalEvents24h,
    succeededEvents24h,
    failedEvents24h,
    totalEvents7d,
  ] = await Promise.all([
    prisma.marketingEvent.count(),
    prisma.marketingEvent.count({ where: { status: 'SENT' } }),
    prisma.marketingEvent.count({ where: { status: 'FAILED' } }),
    prisma.marketingEvent.count({ where: { status: 'PENDING' } }),
    prisma.marketingEvent.findFirst({
      where: { status: 'SENT' },
      orderBy: { eventTime: 'desc' },
    }),
    prisma.marketingEvent.findFirst({
      where: { status: 'FAILED' },
      orderBy: { eventTime: 'desc' },
    }),
    prisma.marketingEvent.count({
      where: { eventTime: { gte: since24h } },
    }),
    prisma.marketingEvent.count({
      where: { status: 'SENT', eventTime: { gte: since24h } },
    }),
    prisma.marketingEvent.count({
      where: { status: 'FAILED', eventTime: { gte: since24h } },
    }),
    prisma.marketingEvent.count({
      where: { eventTime: { gte: since7d } },
    }),
  ])

  // Pixel status
  const pixelConfigured = Boolean(settings.pixelId && settings.pixelEnabled)
  const pixelStatus = !settings.pixelId
    ? 'NOT_CONFIGURED'
    : !settings.pixelEnabled
    ? 'DISABLED'
    : conn.status === 'CONNECTED'
    ? 'CONNECTED'
    : 'CONFIGURED'

  // CAPI status
  const capiConfigured = Boolean(settings.pixelId && settings.capiEnabled && (settings.capiToken || settings.accessToken))
  const capiStatus = !settings.pixelId || (!settings.capiToken && !settings.accessToken)
    ? 'NOT_CONFIGURED'
    : !settings.capiEnabled
    ? 'DISABLED'
    : conn.status === 'CONNECTED'
    ? 'CONNECTED'
    : 'CONFIGURED'

  // Catalog status
  const catalogStatus = !settings.catalogId
    ? 'NOT_CONFIGURED'
    : conn.status === 'CONNECTED'
    ? 'CONNECTED'
    : 'CONFIGURED'

  // Events overall health
  let eventsHealth = 'HEALTHY'
  if (failedEvents > 0 && failedEvents > sentEvents * 0.2) {
    eventsHealth = 'ERROR'
  } else if (failedEvents > 0) {
    eventsHealth = 'WARNING'
  }

  const deliveryRate = (sentEvents + failedEvents) > 0
    ? Number(((sentEvents / (sentEvents + failedEvents)) * 100).toFixed(1))
    : 100

  return {
    pixelConfigured,
    capiConfigured,
    eventDeliveryRate: deliveryRate,
    totalEvents24h,
    succeededEvents24h,
    failedEvents24h,
    totalEvents7d,
    pixel: {
      status: pixelStatus,
      pixelId: settings.pixelId || null,
      enabled: settings.pixelEnabled,
    },
    capi: {
      status: capiStatus,
      enabled: settings.capiEnabled,
      hasToken: Boolean(settings.capiToken || settings.accessToken),
    },
    catalog: {
      status: catalogStatus,
      catalogId: settings.catalogId || null,
    },
    eventsHealth,
    metrics: {
      totalEvents,
      sentEvents,
      failedEvents,
      pendingEvents,
      recentEvents24h: totalEvents24h,
      totalEvents24h,
      succeededEvents24h,
      failedEvents24h,
      totalEvents7d,
      deliveryRate,
    },
    lastSuccess: lastSuccessEvent ? {
      eventName: lastSuccessEvent.eventName,
      eventId: lastSuccessEvent.eventId,
      time: lastSuccessEvent.eventTime,
    } : null,
    lastError: lastFailedEvent ? {
      eventName: lastFailedEvent.eventName,
      eventId: lastFailedEvent.eventId,
      time: lastFailedEvent.eventTime,
      error: lastFailedEvent.errorMessage,
    } : null,
  }
}
