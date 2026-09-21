import { prisma } from '../../lib/prisma.js'
import { MetaClient } from './meta-client.js'
import { getMarketingSettingsInternal } from './meta-auth.service.js'

/**
 * Format a Date object to YYYY-MM-DD string consistently
 */
function formatDateKey(d) {
  if (!d) return ''
  const date = new Date(d)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Fetch Meta Marketing Insights and blend with Arine order attribution
 */
export async function getMarketingInsights({
  period = 'last_30d', // 'today', 'yesterday', 'last_7d', 'last_30d', 'custom'
  startDate = null,
  endDate = null,
} = {}) {
  const settings = await getMarketingSettingsInternal()

  // Calculate local date filters
  let dateSince = new Date()
  let dateUntil = new Date()

  if (period === 'today') {
    dateSince.setHours(0, 0, 0, 0)
    dateUntil.setHours(23, 59, 59, 999)
  } else if (period === 'yesterday') {
    dateSince.setDate(dateSince.getDate() - 1)
    dateSince.setHours(0, 0, 0, 0)
    dateUntil.setDate(dateUntil.getDate() - 1)
    dateUntil.setHours(23, 59, 59, 999)
  } else if (period === 'last_7d') {
    dateSince.setDate(dateSince.getDate() - 7)
    dateSince.setHours(0, 0, 0, 0)
    dateUntil.setHours(23, 59, 59, 999)
  } else if (period === 'last_30d') {
    dateSince.setDate(dateSince.getDate() - 30)
    dateSince.setHours(0, 0, 0, 0)
    dateUntil.setHours(23, 59, 59, 999)
  } else if (period === 'custom' && startDate) {
    dateSince = new Date(startDate)
    dateSince.setHours(0, 0, 0, 0)
    if (endDate) {
      dateUntil = new Date(endDate)
      dateUntil.setHours(23, 59, 59, 999)
    } else {
      dateUntil.setHours(23, 59, 59, 999)
    }
  }

  // 1. Fetch Arine PostgreSQL attributed orders & revenue for this timeframe
  const [attributedOrders, allOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: dateSince, lte: dateUntil },
        marketingAttribution: {
          isNot: null,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        createdAt: true,
        marketingAttribution: true,
      },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: dateSince, lte: dateUntil },
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
      },
    }),
  ])

  const totalStoreOrders = allOrders.length
  const totalStoreRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  const totalAttributedOrders = attributedOrders.length
  const totalAttributedRevenue = attributedOrders.reduce((sum, o) => sum + (o.total || 0), 0)

  // 2. Query Meta API if credentials exist
  let metaSpend = 0
  let impressions = 0
  let reach = 0
  let clicks = 0
  let dailyMetaInsights = []
  let connected = false

  if (settings.accessToken && settings.adAccountId) {
    const client = new MetaClient({
      apiVersion: settings.apiVersion,
      accessToken: settings.accessToken,
    })

    const adAccId = settings.adAccountId.startsWith('act_') ? settings.adAccountId : `act_${settings.adAccountId}`

    const timeRangeParam = {
      since: formatDateKey(dateSince),
      until: formatDateKey(dateUntil),
    }

    try {
      // Aggregate insights
      const res = await client.get(`/${adAccId}/insights`, {
        params: {
          time_range: timeRangeParam,
          fields: 'spend,impressions,reach,clicks,ctr,cpc,cpm',
        },
      })

      if (res?.data && res.data.length > 0) {
        const row = res.data[0]
        metaSpend = row.spend ? parseFloat(row.spend) : 0
        impressions = row.impressions ? parseInt(row.impressions, 10) : 0
        reach = row.reach ? parseInt(row.reach, 10) : 0
        clicks = row.clicks ? parseInt(row.clicks, 10) : 0
      }

      // Time series breakdown (by day)
      const dailyRes = await client.get(`/${adAccId}/insights`, {
        params: {
          time_range: timeRangeParam,
          time_increment: 1,
          fields: 'date_start,spend,impressions,clicks',
        },
      })
      dailyMetaInsights = dailyRes?.data || []
      connected = true
    } catch (e) {
      // If live insights query fails, use cached campaign spend
      const cached = await prisma.marketingCampaignCache.findMany()
      metaSpend = cached.reduce((sum, c) => sum + (c.spend || 0), 0)
      impressions = cached.reduce((sum, c) => sum + (c.impressions || 0), 0)
      clicks = cached.reduce((sum, c) => sum + (c.clicks || 0), 0)
      reach = cached.reduce((sum, c) => sum + (c.reach || 0), 0)
    }
  }

  // Safe KPI calculations
  const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0
  const cpc = clicks > 0 ? Number((metaSpend / clicks).toFixed(2)) : 0
  const cpm = impressions > 0 ? Number(((metaSpend / impressions) * 1000).toFixed(2)) : 0
  const roas = metaSpend > 0 ? Number((totalAttributedRevenue / metaSpend).toFixed(2)) : 0
  const cpa = totalAttributedOrders > 0 && metaSpend > 0 ? Number((metaSpend / totalAttributedOrders).toFixed(2)) : 0

  // 3. Build combined daily chart data
  const dateMap = new Map()

  // Initialize date range buckets
  const curr = new Date(dateSince)
  while (curr <= dateUntil) {
    const dStr = formatDateKey(curr)
    dateMap.set(dStr, {
      date: dStr,
      spend: 0,
      revenue: 0,
      attributedRevenue: 0,
      orders: 0,
      attributedOrders: 0,
      clicks: 0,
      impressions: 0,
    })
    curr.setDate(curr.getDate() + 1)
  }

  // Fill Meta spend from daily insights
  for (const item of dailyMetaInsights) {
    const dStr = item.date_start
    if (dateMap.has(dStr)) {
      const b = dateMap.get(dStr)
      b.spend += item.spend ? parseFloat(item.spend) : 0
      b.clicks += item.clicks ? parseInt(item.clicks, 10) : 0
      b.impressions += item.impressions ? parseInt(item.impressions, 10) : 0
    }
  }

  // Fill orders and revenue
  for (const order of allOrders) {
    const dStr = formatDateKey(order.createdAt)
    if (dateMap.has(dStr)) {
      const b = dateMap.get(dStr)
      b.orders++
      b.revenue += order.total || 0
    }
  }

  for (const attrOrder of attributedOrders) {
    const dStr = formatDateKey(attrOrder.createdAt)
    if (dateMap.has(dStr)) {
      const b = dateMap.get(dStr)
      b.attributedOrders++
      b.attributedRevenue += attrOrder.total || 0
    }
  }

  const timeline = Array.from(dateMap.values())

  return {
    period,
    connected,
    kpis: {
      spend: metaSpend,
      attributedRevenue: totalAttributedRevenue,
      totalRevenue: totalStoreRevenue,
      attributedOrders: totalAttributedOrders,
      totalOrders: totalStoreOrders,
      roas,
      cpa,
      ctr,
      cpc,
      cpm,
      impressions,
      reach,
      clicks,
      conversions: totalAttributedOrders,
    },
    timeline,
  }
}
