import { prisma } from '../../lib/prisma.js'
import { MetaClient } from './meta-client.js'
import { getMarketingSettingsInternal, getOrCreateConnection } from './meta-auth.service.js'

/**
 * Fetch and synchronize Campaigns from Meta Marketing API
 */
export async function syncMetaCampaigns() {
  const settings = await getMarketingSettingsInternal()
  const conn = await getOrCreateConnection()

  if (!settings.accessToken || !settings.adAccountId) {
    // Return cached campaigns without fabricating live API data
    const cached = await prisma.marketingCampaignCache.findMany({
      orderBy: { updatedAt: 'desc' },
    })
    return {
      success: true,
      connected: false,
      message: 'حساب Meta Ads غير مهيأ بعد',
      campaigns: cached,
    }
  }

  const client = new MetaClient({
    apiVersion: settings.apiVersion,
    accessToken: settings.accessToken,
  })

  const adAccId = settings.adAccountId.startsWith('act_') ? settings.adAccountId : `act_${settings.adAccountId}`

  try {
    // 1. Fetch campaigns from Meta Marketing API
    const res = await client.get(`/${adAccId}/campaigns`, {
      params: {
        fields: 'id,name,objective,status,effective_status,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,created_time,updated_time',
        limit: 100,
      },
    })

    const rawCampaigns = res?.data || []

    // 2. Fetch insights per campaign
    let insightsMap = new Map()
    try {
      const insightsRes = await client.get(`/${adAccId}/insights`, {
        params: {
          level: 'campaign',
          fields: 'campaign_id,campaign_name,spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values',
          date_preset: 'maximum',
        },
      })
      if (insightsRes?.data) {
        for (const item of insightsRes.data) {
          insightsMap.set(item.campaign_id, item)
        }
      }
    } catch {
      // Insights query fallback
    }

    // 3. Fetch local PostgreSQL attribution data per campaign
    const attributions = await prisma.marketingAttribution.findMany({
      include: {
        order: {
          select: { total: true, status: true },
        },
      },
    })

    const localAttributionMap = new Map()
    for (const attr of attributions) {
      const key = (attr.metaCampaignId || attr.utmCampaign || '').toLowerCase().trim()
      if (!key) continue

      if (!localAttributionMap.has(key)) {
        localAttributionMap.set(key, { orders: 0, revenue: 0 })
      }
      const g = localAttributionMap.get(key)
      g.orders++
      g.revenue += attr.order?.total || 0
    }

    // 4. Upsert into MarketingCampaignCache
    const syncedCampaigns = []
    for (const c of rawCampaigns) {
      const ins = insightsMap.get(c.id) || {}
      const spend = ins.spend ? parseFloat(ins.spend) : 0
      const impressions = ins.impressions ? parseInt(ins.impressions, 10) : 0
      const reach = ins.reach ? parseInt(ins.reach, 10) : 0
      const clicks = ins.clicks ? parseInt(ins.clicks, 10) : 0
      const cpc = ins.cpc ? parseFloat(ins.cpc) : clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0
      const cpm = ins.cpm ? parseFloat(ins.cpm) : impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : 0
      const ctr = ins.ctr ? parseFloat(ins.ctr) : impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0

      // Match local attribution by Meta ID or campaign name
      const localDataById = localAttributionMap.get(c.id.toLowerCase().trim())
      const localDataByName = localAttributionMap.get((c.name || '').toLowerCase().trim())
      const attributedOrders = (localDataById?.orders || 0) + (localDataByName?.orders || 0)
      const attributedRevenue = (localDataById?.revenue || 0) + (localDataByName?.revenue || 0)

      const roas = spend > 0 ? Number((attributedRevenue / spend).toFixed(2)) : 0
      const cpa = attributedOrders > 0 && spend > 0 ? Number((spend / attributedOrders).toFixed(2)) : 0

      const campaignData = {
        externalId: c.id,
        name: c.name || 'Untitled Campaign',
        objective: c.objective || null,
        status: c.status || 'PAUSED',
        effectiveStatus: c.effective_status || null,
        dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null, // Meta returns in cents
        lifetimeBudget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
        budgetRemaining: c.budget_remaining ? parseFloat(c.budget_remaining) / 100 : null,
        startTime: c.start_time ? new Date(c.start_time) : null,
        stopTime: c.stop_time ? new Date(c.stop_time) : null,
        spend,
        impressions,
        reach,
        clicks,
        cpc,
        cpm,
        ctr,
        conversions: attributedOrders,
        metaRevenue: 0,
        attributedOrders,
        attributedRevenue,
        roas,
        cpa,
        lastSyncedAt: new Date(),
      }

      const upserted = await prisma.marketingCampaignCache.upsert({
        where: { externalId: c.id },
        create: campaignData,
        update: campaignData,
      })

      syncedCampaigns.push(upserted)
    }

    return {
      success: true,
      connected: true,
      count: syncedCampaigns.length,
      campaigns: syncedCampaigns,
    }
  } catch (err) {
    // If live call fails, return cached campaigns with error diagnostic
    const cached = await prisma.marketingCampaignCache.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    return {
      success: false,
      connected: conn.status === 'CONNECTED',
      error: err.metaUserMsg || err.message || 'تعذر جلب الحملات من Meta API',
      campaigns: cached,
    }
  }
}

/**
 * List campaigns for Admin UI (with search, filter, pagination)
 */
export async function listCampaigns({
  page = 1,
  limit = 20,
  status = null,
  search = null,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
  const skip = (pageNum - 1) * limitNum

  const where = {}
  if (status && status !== 'ALL') {
    where.status = status
  }
  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim()
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { externalId: { contains: term, mode: 'insensitive' } },
      { objective: { contains: term, mode: 'insensitive' } },
    ]
  }

  const [total, rawCampaigns] = await Promise.all([
    prisma.marketingCampaignCache.count({ where }),
    prisma.marketingCampaignCache.findMany({
      where,
      orderBy: { spend: 'desc' },
      skip,
      take: limitNum,
    }),
  ])

  const campaigns = rawCampaigns.map((c) => ({
    ...c,
    metaCampaignId: c.externalId,
  }))

  return {
    campaigns,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  }
}

/**
 * Update Campaign Status in Meta Marketing API (ACTIVE / PAUSED)
 */
export async function updateMetaCampaignStatus(campaignId, status) {
  const targetStatus = String(status).toUpperCase()
  if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(targetStatus)) {
    const err = new Error('حالة الحملة غير صحيحة')
    err.status = 400
    throw err
  }

  // Resolve numeric ID to external Meta ID if needed
  let resolvedExternalId = String(campaignId)
  if (/^\d+$/.test(String(campaignId))) {
    const cached = await prisma.marketingCampaignCache.findUnique({
      where: { id: Number(campaignId) },
    })
    if (cached?.externalId) {
      resolvedExternalId = cached.externalId
    }
  }

  const settings = await getMarketingSettingsInternal()
  if (!settings.accessToken) {
    const err = new Error('رمز وصول Meta غير مهيأ')
    err.status = 400
    throw err
  }

  const client = new MetaClient({
    apiVersion: settings.apiVersion,
    accessToken: settings.accessToken,
  })

  // Call Meta Graph API POST /{campaign_id}
  await client.post(`/${resolvedExternalId}`, {
    status: targetStatus,
  })

  // Update local cache
  const orConditions = [{ externalId: resolvedExternalId }]
  if (/^\d+$/.test(String(campaignId))) {
    orConditions.push({ id: Number(campaignId) })
  }

  const updated = await prisma.marketingCampaignCache.updateMany({
    where: {
      OR: orConditions,
    },
    data: {
      status: targetStatus,
      updatedAt: new Date(),
    },
  })

  return {
    success: true,
    campaignId: resolvedExternalId,
    status: targetStatus,
    updated,
  }
}

/**
 * Fetch Ad Sets from Meta Marketing API
 */
export async function getMetaAdSets({ campaignId = null } = {}) {
  const settings = await getMarketingSettingsInternal()
  if (!settings.accessToken || !settings.adAccountId) {
    return { success: true, connected: false, adSets: [] }
  }

  const client = new MetaClient({
    apiVersion: settings.apiVersion,
    accessToken: settings.accessToken,
  })

  const endpoint = campaignId
    ? `/${campaignId}/adsets`
    : `/${settings.adAccountId.startsWith('act_') ? settings.adAccountId : `act_${settings.adAccountId}`}/adsets`

  try {
    const res = await client.get(endpoint, {
      params: {
        fields: 'id,campaign_id,name,status,effective_status,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,start_time,end_time,targeting,created_time,updated_time',
        limit: 100,
      },
    })
    return { success: true, connected: true, adSets: res?.data || [] }
  } catch (err) {
    return { success: false, connected: false, error: err.message, adSets: [] }
  }
}

/**
 * Fetch Ads from Meta Marketing API
 */
export async function getMetaAds({ adSetId = null, campaignId = null } = {}) {
  const settings = await getMarketingSettingsInternal()
  if (!settings.accessToken || !settings.adAccountId) {
    return { success: true, connected: false, ads: [] }
  }

  const client = new MetaClient({
    apiVersion: settings.apiVersion,
    accessToken: settings.accessToken,
  })

  let endpoint = `/${settings.adAccountId.startsWith('act_') ? settings.adAccountId : `act_${settings.adAccountId}`}/ads`
  if (adSetId) endpoint = `/${adSetId}/ads`
  else if (campaignId) endpoint = `/${campaignId}/ads`

  try {
    const res = await client.get(endpoint, {
      params: {
        fields: 'id,adset_id,campaign_id,name,status,effective_status,creative{id,name,title,body,image_url,thumbnail_url},created_time,updated_time',
        limit: 100,
      },
    })
    return { success: true, connected: true, ads: res?.data || [] }
  } catch (err) {
    return { success: false, connected: false, error: err.message, ads: [] }
  }
}
