import { prisma } from '../../lib/prisma.js'
import { getMarketingInsights } from './meta-insights.service.js'
import { getTrackingHealth } from './marketing-event.service.js'
import { getAdminMarketingSettings, getOrCreateConnection } from './meta-auth.service.js'

/**
 * Get comprehensive Marketing Dashboard Overview
 */
export async function getMarketingDashboardOverview({ period = 'last_30d' } = {}) {
  const [insights, trackingHealth, connection, settings, recentEvents, topCampaigns] = await Promise.all([
    getMarketingInsights({ period }),
    getTrackingHealth(),
    getOrCreateConnection(),
    getAdminMarketingSettings(),
    prisma.marketingEvent.findMany({
      orderBy: { eventTime: 'desc' },
      take: 8,
      include: {
        order: {
          select: { orderNumber: true, total: true },
        },
      },
    }),
    prisma.marketingCampaignCache.findMany({
      orderBy: { spend: 'desc' },
      take: 5,
    }),
  ])

  return {
    period,
    connectionStatus: connection.status,
    accountName: connection.accountName,
    accountId: connection.accountId,
    kpis: insights.kpis,
    timeline: insights.timeline,
    trackingHealth,
    recentEvents,
    topCampaigns,
    settings: {
      pixelId: settings.pixelId,
      pixelEnabled: settings.pixelEnabled,
      capiEnabled: settings.capiEnabled,
      currency: settings.currency,
    },
  }
}
