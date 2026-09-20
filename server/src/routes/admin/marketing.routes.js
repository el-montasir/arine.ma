import { Router } from 'express'
import { requirePermission } from '../../middleware/auth.middleware.js'
import { validate } from '../../middleware/validate.middleware.js'
import { PERMISSIONS } from '../../constants/permissions.js'
import {
  updateMarketingSettingsSchema,
  updateCampaignStatusSchema,
  sendTestEventSchema,
  syncCatalogSchema,
} from '../../validators/admin/marketing.validator.js'
import {
  getOverviewHandler,
  getSettingsHandler,
  updateSettingsHandler,
  testConnectionHandler,
  disconnectMetaHandler,
  getCampaignsHandler,
  syncCampaignsHandler,
  updateCampaignStatusHandler,
  getAdSetsHandler,
  getAdsHandler,
  getInsightsHandler,
  getEventsHandler,
  getEventDetailsHandler,
  retryEventHandler,
  retryAllFailedEventsHandler,
  sendTestEventHandler,
  getTrackingHealthHandler,
  getAttributionOverviewHandler,
  getAttributedOrdersHandler,
  getCatalogItemsHandler,
  syncCatalogHandler,
} from '../../controllers/admin/marketing.controller.js'

const router = Router()

// All routes require at least MARKETING_VIEW
router.use(requirePermission(PERMISSIONS.MARKETING_VIEW))

// Overview
router.get('/overview', getOverviewHandler)

// Settings & Connection
router.get('/settings', getSettingsHandler)
router.put(
  '/settings',
  requirePermission(PERMISSIONS.MARKETING_SETTINGS_UPDATE, PERMISSIONS.MARKETING_MANAGE),
  validate(updateMarketingSettingsSchema),
  updateSettingsHandler
)
router.post(
  '/meta/test',
  requirePermission(PERMISSIONS.MARKETING_SETTINGS_UPDATE, PERMISSIONS.MARKETING_MANAGE),
  testConnectionHandler
)
router.post(
  '/meta/disconnect',
  requirePermission(PERMISSIONS.MARKETING_SETTINGS_UPDATE, PERMISSIONS.MARKETING_MANAGE),
  disconnectMetaHandler
)

// Campaigns, Ad Sets, Ads
router.get('/campaigns', getCampaignsHandler)
router.post(
  '/campaigns/sync',
  requirePermission(PERMISSIONS.MARKETING_CAMPAIGNS_MANAGE, PERMISSIONS.MARKETING_MANAGE),
  syncCampaignsHandler
)
router.patch(
  '/campaigns/:id/status',
  requirePermission(PERMISSIONS.MARKETING_CAMPAIGNS_MANAGE, PERMISSIONS.MARKETING_MANAGE),
  validate(updateCampaignStatusSchema),
  updateCampaignStatusHandler
)
router.get('/adsets', getAdSetsHandler)
router.get('/ads', getAdsHandler)

// Insights
router.get('/insights', getInsightsHandler)

// Tracking, Events, Diagnostics, Test Events
router.get('/tracking/health', getTrackingHealthHandler)
router.get('/events', getEventsHandler)
router.get('/events/:id', getEventDetailsHandler)
router.post(
  '/events/retry-failed',
  requirePermission(PERMISSIONS.MARKETING_EVENTS_RETRY, PERMISSIONS.MARKETING_MANAGE),
  retryAllFailedEventsHandler
)
router.post(
  '/events/:id/retry',
  requirePermission(PERMISSIONS.MARKETING_EVENTS_RETRY, PERMISSIONS.MARKETING_MANAGE),
  retryEventHandler
)
router.post(
  '/events/test',
  requirePermission(PERMISSIONS.MARKETING_MANAGE, PERMISSIONS.MARKETING_SETTINGS_UPDATE),
  validate(sendTestEventSchema),
  sendTestEventHandler
)

// Attribution
router.get('/attribution/overview', getAttributionOverviewHandler)
router.get('/attribution/orders', getAttributedOrdersHandler)

// Catalog Sync
router.get('/catalog', getCatalogItemsHandler)
router.post(
  '/catalog/sync',
  requirePermission(PERMISSIONS.MARKETING_CATALOG_SYNC, PERMISSIONS.MARKETING_MANAGE),
  validate(syncCatalogSchema),
  syncCatalogHandler
)

export default router
