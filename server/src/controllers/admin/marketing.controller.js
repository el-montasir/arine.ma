import { successResponse, errorResponse } from '../../utils/api-response.js'
import { logActivity } from '../../services/admin/activity-log.service.js'
import {
  getAdminMarketingSettings,
  updateMarketingSettings,
  testMetaConnection,
  disconnectMeta,
} from '../../services/marketing/meta-auth.service.js'
import {
  listCampaigns,
  syncMetaCampaigns,
  updateMetaCampaignStatus,
  getMetaAdSets,
  getMetaAds,
} from '../../services/marketing/meta-campaign.service.js'
import { getMarketingInsights } from '../../services/marketing/meta-insights.service.js'
import {
  listMarketingEvents,
  getMarketingEventById,
  retryMarketingEvent,
  retryAllFailedEvents,
  sendTestEvent,
  getTrackingHealth,
} from '../../services/marketing/marketing-event.service.js'
import {
  getAttributionOverview,
  listAttributedOrders,
} from '../../services/marketing/attribution.service.js'
import {
  listCatalogItems,
  syncCatalogItems,
  getCatalogStats,
} from '../../services/marketing/meta-catalog.service.js'
import { getMarketingDashboardOverview } from '../../services/marketing/marketing-overview.service.js'

// GET /api/admin/marketing/overview
export async function getOverviewHandler(req, res, next) {
  try {
    const period = req.query.period || 'last_30d'
    const data = await getMarketingDashboardOverview({ period })
    return successResponse(res, { data })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/marketing/settings
export async function getSettingsHandler(_req, res, next) {
  try {
    const settings = await getAdminMarketingSettings()
    return successResponse(res, { data: settings })
  } catch (err) {
    next(err)
  }
}

// PUT /api/admin/marketing/settings
export async function updateSettingsHandler(req, res, next) {
  try {
    const result = await updateMarketingSettings(req.validated)

    await logActivity({
      actor: req.admin,
      action: 'UPDATE_MARKETING_SETTINGS',
      resourceType: 'MARKETING_SETTINGS',
      resourceId: 'meta',
      details: {
        appIdUpdated: req.validated.appId !== undefined,
        pixelIdUpdated: req.validated.pixelId !== undefined,
        adAccountIdUpdated: req.validated.adAccountId !== undefined,
        pixelEnabled: req.validated.pixelEnabled,
        capiEnabled: req.validated.capiEnabled,
      },
      req,
    })

    return successResponse(res, {
      message: 'تم تحديث إعدادات التسويق و Meta Ads بنجاح',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/marketing/meta/test
export async function testConnectionHandler(req, res, next) {
  try {
    const result = await testMetaConnection()

    await logActivity({
      actor: req.admin,
      action: 'TEST_META_CONNECTION',
      resourceType: 'MARKETING_CONNECTION',
      resourceId: 'meta',
      details: { status: result.status, success: result.success },
      req,
    })

    return successResponse(res, { data: result })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/marketing/meta/disconnect
export async function disconnectMetaHandler(req, res, next) {
  try {
    const result = await disconnectMeta()

    await logActivity({
      actor: req.admin,
      action: 'DISCONNECT_META',
      resourceType: 'MARKETING_CONNECTION',
      resourceId: 'meta',
      details: { disconnected: true },
      req,
    })

    return successResponse(res, {
      message: 'تم إلغاء ربط حساب Meta بنجاح',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/marketing/campaigns
export async function getCampaignsHandler(req, res, next) {
  try {
    const { page, limit, status, search } = req.query
    const result = await listCampaigns({ page, limit, status, search })
    return successResponse(res, result)
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/marketing/campaigns/sync
export async function syncCampaignsHandler(req, res, next) {
  try {
    const result = await syncMetaCampaigns()

    await logActivity({
      actor: req.admin,
      action: 'SYNC_META_CAMPAIGNS',
      resourceType: 'MARKETING_CAMPAIGNS',
      resourceId: 'meta',
      details: { count: result.count, success: result.success },
      req,
    })

    return successResponse(res, {
      message: 'تمت مزامنة الحملات مع Meta Ads بنجاح',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/admin/marketing/campaigns/:id/status
export async function updateCampaignStatusHandler(req, res, next) {
  try {
    const { id } = req.params
    const { status } = req.validated
    const result = await updateMetaCampaignStatus(id, status)

    await logActivity({
      actor: req.admin,
      action: 'UPDATE_CAMPAIGN_STATUS',
      resourceType: 'MARKETING_CAMPAIGN',
      resourceId: String(id),
      details: { status },
      req,
    })

    return successResponse(res, {
      message: `تم تغيير حالة الحملة إلى ${status} بنجاح`,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/marketing/adsets
export async function getAdSetsHandler(req, res, next) {
  try {
    const { campaignId } = req.query
    const result = await getMetaAdSets({ campaignId })
    return successResponse(res, { data: result })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/marketing/ads
export async function getAdsHandler(req, res, next) {
  try {
    const { adSetId, campaignId } = req.query
    const result = await getMetaAds({ adSetId, campaignId })
    return successResponse(res, { data: result })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/marketing/insights
export async function getInsightsHandler(req, res, next) {
  try {
    const { period, startDate, endDate } = req.query
    const insights = await getMarketingInsights({ period, startDate, endDate })
    return successResponse(res, { data: insights })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/marketing/events
export async function getEventsHandler(req, res, next) {
  try {
    const { page, limit, eventName, status, source, orderId, startDate, endDate, search } = req.query
    const result = await listMarketingEvents({
      page,
      limit,
      eventName,
      status,
      source,
      orderId,
      startDate,
      endDate,
      search,
    })
    return successResponse(res, result)
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/marketing/events/:id
export async function getEventDetailsHandler(req, res, next) {
  try {
    const event = await getMarketingEventById(req.params.id)
    if (!event) {
      return errorResponse(res, 404, 'NOT_FOUND', 'الحدث غير موجود')
    }
    return successResponse(res, { data: event })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/marketing/events/:id/retry
export async function retryEventHandler(req, res, next) {
  try {
    const result = await retryMarketingEvent(req.params.id)

    await logActivity({
      actor: req.admin,
      action: 'RETRY_MARKETING_EVENT',
      resourceType: 'MARKETING_EVENT',
      resourceId: String(req.params.id),
      details: { eventId: req.params.id, success: result.success },
      req,
    })

    return successResponse(res, {
      message: 'تمت إعادة محاولة إرسال الحدث إلى Meta CAPI بنجاح',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/marketing/events/retry-failed
export async function retryAllFailedEventsHandler(req, res, next) {
  try {
    const result = await retryAllFailedEvents({ limit: 50 })

    await logActivity({
      actor: req.admin,
      action: 'RETRY_ALL_FAILED_MARKETING_EVENTS',
      resourceType: 'MARKETING_EVENTS',
      resourceId: 'batch',
      details: result,
      req,
    })

    return successResponse(res, {
      message: `تمت معالجة إعادة الإرسال: نجح ${result.succeeded} من أصل ${result.total}`,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/marketing/events/test
export async function sendTestEventHandler(req, res, next) {
  try {
    const { eventName, testEventCode, customData, userData } = req.validated
    const result = await sendTestEvent({
      eventName,
      testEventCode,
      customData,
      userData,
    })

    await logActivity({
      actor: req.admin,
      action: 'SEND_TEST_MARKETING_EVENT',
      resourceType: 'MARKETING_EVENT',
      resourceId: result.testEventId,
      details: { eventName, success: result.success, fbtrace_id: result.fbtrace_id },
      req,
    })

    return successResponse(res, {
      message: `تم إرسال حدث الاختبار (${eventName}) بنجاح`,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/marketing/tracking/health
export async function getTrackingHealthHandler(_req, res, next) {
  try {
    const health = await getTrackingHealth()
    return successResponse(res, { data: health })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/marketing/attribution/overview
export async function getAttributionOverviewHandler(req, res, next) {
  try {
    const { startDate, endDate, source, campaign } = req.query
    const overview = await getAttributionOverview({ startDate, endDate, source, campaign })
    return successResponse(res, { data: overview })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/marketing/attribution/orders
export async function getAttributedOrdersHandler(req, res, next) {
  try {
    const { page, limit, source, campaign, startDate, endDate } = req.query
    const result = await listAttributedOrders({ page, limit, source, campaign, startDate, endDate })
    return successResponse(res, result)
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/marketing/catalog
export async function getCatalogItemsHandler(req, res, next) {
  try {
    const { page, limit, itemType, syncStatus, search } = req.query
    const result = await listCatalogItems({ page, limit, itemType, syncStatus, search })
    return successResponse(res, result)
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/marketing/catalog/sync
export async function syncCatalogHandler(req, res, next) {
  try {
    const scope = req.validated?.scope || 'ALL'
    const result = await syncCatalogItems({ scope })

    await logActivity({
      actor: req.admin,
      action: 'SYNC_CATALOG_ITEMS',
      resourceType: 'MARKETING_CATALOG',
      resourceId: scope,
      details: {
        total: result.total,
        synced: result.synced,
        failed: result.failed,
        jobId: result.jobId,
      },
      req,
    })

    return successResponse(res, {
      message: `تمت مزامنة الكتالوج بنجاح (${result.synced}/${result.total} عنصر)`,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}
