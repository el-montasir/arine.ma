import { prisma } from '../../lib/prisma.js'

/**
 * Record attribution snapshot for a newly created order
 */
export async function recordOrderAttribution({
  orderId,
  utmSource = null,
  utmMedium = null,
  utmCampaign = null,
  utmContent = null,
  utmTerm = null,
  fbclid = null,
  fbp = null,
  fbc = null,
  metaCampaignId = null,
  metaCampaignName = null,
  metaAdSetId = null,
  metaAdSetName = null,
  metaAdId = null,
  metaAdName = null,
  firstTouch = null,
  lastTouch = null,
  landingPage = null,
  referrer = null,
  deviceType = null,
  ipAddress = null,
  userAgent = null,
}) {
  if (!orderId) return null

  try {
    // If attribution already exists for this order, do not overwrite historical snapshot
    const existing = await prisma.marketingAttribution.findUnique({
      where: { orderId: Number(orderId) },
    })

    if (existing) return existing

    const data = {
      orderId: Number(orderId),
      utmSource: utmSource ? String(utmSource).slice(0, 100) : null,
      utmMedium: utmMedium ? String(utmMedium).slice(0, 100) : null,
      utmCampaign: utmCampaign ? String(utmCampaign).slice(0, 150) : null,
      utmContent: utmContent ? String(utmContent).slice(0, 150) : null,
      utmTerm: utmTerm ? String(utmTerm).slice(0, 150) : null,
      fbclid: fbclid ? String(fbclid).slice(0, 255) : null,
      fbp: fbp ? String(fbp).slice(0, 100) : null,
      fbc: fbc ? String(fbc).slice(0, 100) : null,
      metaCampaignId: metaCampaignId ? String(metaCampaignId) : null,
      metaCampaignName: metaCampaignName ? String(metaCampaignName) : null,
      metaAdSetId: metaAdSetId ? String(metaAdSetId) : null,
      metaAdSetName: metaAdSetName ? String(metaAdSetName) : null,
      metaAdId: metaAdId ? String(metaAdId) : null,
      metaAdName: metaAdName ? String(metaAdName) : null,
      firstTouchSource: firstTouch?.source || utmSource || (fbclid ? 'facebook' : null),
      firstTouchMedium: firstTouch?.medium || utmMedium || (fbclid ? 'paid_social' : null),
      firstTouchCampaign: firstTouch?.campaign || utmCampaign || null,
      firstTouchTimestamp: firstTouch?.timestamp ? new Date(firstTouch.timestamp) : new Date(),
      lastTouchSource: lastTouch?.source || utmSource || (fbclid ? 'facebook' : null),
      lastTouchMedium: lastTouch?.medium || utmMedium || (fbclid ? 'paid_social' : null),
      lastTouchCampaign: lastTouch?.campaign || utmCampaign || null,
      lastTouchTimestamp: lastTouch?.timestamp ? new Date(lastTouch.timestamp) : new Date(),
      landingPage: landingPage ? String(landingPage).slice(0, 500) : null,
      referrer: referrer ? String(referrer).slice(0, 500) : null,
      deviceType: deviceType ? String(deviceType).slice(0, 50) : null,
      ipAddress: ipAddress ? String(ipAddress).slice(0, 100) : null,
      userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
    }

    return await prisma.marketingAttribution.create({ data })
  } catch (err) {
    console.error('[ATTRIBUTION_ERROR] Failed to record order attribution:', err.message)
    return null
  }
}

/**
 * Get Attribution Analytics and Channel Breakdown
 */
export async function getAttributionOverview({
  startDate = null,
  endDate = null,
  source = null,
  campaign = null,
} = {}) {
  const whereOrder = {}
  if (startDate || endDate) {
    whereOrder.createdAt = {}
    if (startDate) {
      const s = new Date(startDate)
      if (!isNaN(s.getTime())) whereOrder.createdAt.gte = s
    }
    if (endDate) {
      const e = new Date(endDate)
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999)
        whereOrder.createdAt.lte = e
      }
    }
  }

  // Fetch all orders with attribution in range
  const orders = await prisma.order.findMany({
    where: whereOrder,
    select: {
      id: true,
      orderNumber: true,
      total: true,
      subtotal: true,
      status: true,
      createdAt: true,
      marketingAttribution: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch Meta campaigns cache to blend ad spend
  const campaignsCache = await prisma.marketingCampaignCache.findMany()
  const campaignSpendMap = new Map()
  let totalMetaSpend = 0
  for (const c of campaignsCache) {
    totalMetaSpend += c.spend || 0
    if (c.name) campaignSpendMap.set(c.name.toLowerCase().trim(), c.spend || 0)
    if (c.externalId) campaignSpendMap.set(c.externalId, c.spend || 0)
  }

  // Aggregate by Source, Medium, Campaign
  const sourceMap = new Map()
  const campaignMap = new Map()
  let totalAttributedOrders = 0
  let totalAttributedRevenue = 0
  let directOrders = 0
  let directRevenue = 0

  for (const order of orders) {
    const attr = order.marketingAttribution
    const orderTotal = order.total || 0

    if (attr && (attr.utmSource || attr.fbclid || attr.metaCampaignId)) {
      totalAttributedOrders++
      totalAttributedRevenue += orderTotal

      const src = (attr.utmSource || (attr.fbclid ? 'facebook' : 'organic')).toLowerCase()
      const med = (attr.utmMedium || (attr.fbclid ? 'paid_social' : 'referral')).toLowerCase()
      const cmp = attr.utmCampaign || attr.metaCampaignName || 'Direct / None'

      // Source group
      if (!sourceMap.has(src)) {
        sourceMap.set(src, {
          source: src,
          medium: med,
          ordersCount: 0,
          revenue: 0,
          spend: src === 'facebook' || src === 'instagram' || src === 'meta' ? totalMetaSpend : 0,
        })
      }
      const sGroup = sourceMap.get(src)
      sGroup.ordersCount++
      sGroup.revenue += orderTotal

      // Campaign group
      if (!campaignMap.has(cmp)) {
        const matchedSpend = campaignSpendMap.get(cmp.toLowerCase().trim()) || 0
        campaignMap.set(cmp, {
          campaign: cmp,
          source: src,
          ordersCount: 0,
          revenue: 0,
          spend: matchedSpend,
        })
      }
      const cGroup = campaignMap.get(cmp)
      cGroup.ordersCount++
      cGroup.revenue += orderTotal
    } else {
      directOrders++
      directRevenue += orderTotal
    }
  }

  // Format sources list with ROAS & CPA
  const sources = Array.from(sourceMap.values()).map((s) => {
    const roas = s.spend > 0 ? Number((s.revenue / s.spend).toFixed(2)) : 0
    const cpa = s.ordersCount > 0 && s.spend > 0 ? Number((s.spend / s.ordersCount).toFixed(2)) : 0
    return {
      ...s,
      roas,
      cpa,
    }
  })

  // Format campaigns list with ROAS & CPA
  const campaigns = Array.from(campaignMap.values()).map((c) => {
    const roas = c.spend > 0 ? Number((c.revenue / c.spend).toFixed(2)) : 0
    const cpa = c.ordersCount > 0 && c.spend > 0 ? Number((c.spend / c.ordersCount).toFixed(2)) : 0
    return {
      ...c,
      roas,
      cpa,
    }
  })

  const overallRoas = totalMetaSpend > 0 ? Number((totalAttributedRevenue / totalMetaSpend).toFixed(2)) : 0
  const overallCpa = totalAttributedOrders > 0 && totalMetaSpend > 0 ? Number((totalMetaSpend / totalAttributedOrders).toFixed(2)) : 0

  const summary = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    totalAttributedOrders,
    attributedOrders: totalAttributedOrders,
    totalAttributedRevenue,
    attributedRevenue: totalAttributedRevenue,
    directOrders,
    directRevenue,
    totalMetaSpend,
    spend: totalMetaSpend,
    ordersPercentage: orders.length > 0 ? Math.round((totalAttributedOrders / orders.length) * 100) : 0,
    overallRoas,
    blendedRoas: overallRoas,
    overallCpa,
    blendedCpa: overallCpa,
  }

  return {
    summary,
    totals: summary,
    sources,
    bySource: sources,
    campaigns,
    byCampaign: campaigns,
  }
}

/**
 * List orders with attribution data for the Attribution Orders sub-tab
 */
export async function listAttributedOrders({
  page = 1,
  limit = 25,
  source = null,
  campaign = null,
  startDate = null,
  endDate = null,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25))
  const skip = (pageNum - 1) * limitNum

  const where = {}

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      const s = new Date(startDate)
      if (!isNaN(s.getTime())) where.createdAt.gte = s
    }
    if (endDate) {
      const e = new Date(endDate)
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999)
        where.createdAt.lte = e
      }
    }
  }

  if (source || campaign) {
    where.marketingAttribution = {}
    if (source && source !== 'ALL') {
      where.marketingAttribution.utmSource = { contains: source, mode: 'insensitive' }
    }
    if (campaign && campaign !== 'ALL') {
      where.marketingAttribution.utmCampaign = { contains: campaign, mode: 'insensitive' }
    }
  }

  const [total, rawOrders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      select: {
        id: true,
        orderNumber: true,
        fullName: true,
        phone: true,
        city: true,
        status: true,
        total: true,
        subtotal: true,
        shipping: true,
        createdAt: true,
        marketingAttribution: true,
      },
    }),
  ])

  const orders = rawOrders.map((o) => ({
    ...o,
    customerName: o.fullName,
    customerPhone: o.phone,
  }))

  return {
    orders,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  }
}
