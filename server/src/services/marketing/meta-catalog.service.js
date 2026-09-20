import { prisma } from '../../lib/prisma.js'
import { MetaClient } from './meta-client.js'
import { getMarketingSettingsInternal, getOrCreateConnection } from './meta-auth.service.js'

/**
 * Format image URL to fully qualified URL for Meta Catalog consumption
 */
function resolveMediaUrl(pathOrUrl, baseUrl) {
  if (!pathOrUrl) return null
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }
  const cleanBase = (baseUrl || 'http://localhost:4000').replace(/\/+$/, '')
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${cleanBase}${cleanPath}`
}

/**
 * Synchronize local Books and Packages into MarketingCatalogItem and dispatch to Meta
 */
export async function syncCatalogItems({ scope = 'ALL' } = {}) {
  const settings = await getMarketingSettingsInternal()
  const conn = await getOrCreateConnection()
  const serverBase = process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`
  const storeBase = process.env.FRONTEND_URL || 'http://localhost:5173'

  // Create Sync Job
  const syncJob = await prisma.marketingSyncJob.create({
    data: {
      jobType: 'CATALOG_SYNC',
      status: 'IN_PROGRESS',
      details: { scope, startedBy: 'admin' },
    },
  })

  try {
    const itemsToProcess = []

    // 1. Process Books / Products
    if (scope === 'ALL' || scope === 'BOOKS') {
      const products = await prisma.product.findMany({
        include: { category: true, images: { orderBy: { sortOrder: 'asc' } } },
      })

      for (const p of products) {
        const image = p.images?.[0]?.url || p.image || null
        const resolvedImage = resolveMediaUrl(image, serverBase)
        const itemLink = `${storeBase}/book/${p.id}`

        itemsToProcess.push({
          itemId: `book-${p.id}`,
          itemType: 'BOOK',
          productId: p.id,
          packageId: null,
          title: p.title,
          description: p.description || `${p.title} - ${p.author}`,
          price: p.price,
          currency: settings.currency || 'MAD',
          availability: p.availability === 'in-stock' ? 'in stock' : 'out of stock',
          imageUrl: resolvedImage,
          linkUrl: itemLink,
          category: p.category?.name || 'كتب إسلامية',
        })
      }
    }

    // 2. Process Packages
    if (scope === 'ALL' || scope === 'PACKAGES') {
      const packages = await prisma.package.findMany({
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      })

      for (const pkg of packages) {
        const image = pkg.images?.[0]?.url || pkg.image || null
        const resolvedImage = resolveMediaUrl(image, serverBase)
        const itemLink = `${storeBase}/package/${pkg.id}`

        itemsToProcess.push({
          itemId: `pkg-${pkg.id}`,
          itemType: 'PACKAGE',
          productId: null,
          packageId: pkg.id,
          title: pkg.title,
          description: pkg.description || `باقة ${pkg.title}`,
          price: pkg.price,
          currency: settings.currency || 'MAD',
          availability: pkg.availability === 'in-stock' ? 'in stock' : 'out of stock',
          imageUrl: resolvedImage,
          linkUrl: itemLink,
          category: 'باقات وعروض خاصة',
        })
      }
    }

    let syncedCount = 0
    let failedCount = 0
    const errors = []

    // 3. Upsert into local database
    for (const item of itemsToProcess) {
      try {
        await prisma.marketingCatalogItem.upsert({
          where: { itemId: item.itemId },
          create: {
            ...item,
            syncStatus: settings.catalogId && settings.accessToken ? 'PENDING' : 'SYNCED',
            lastSyncedAt: new Date(),
          },
          update: {
            ...item,
            syncStatus: settings.catalogId && settings.accessToken ? 'PENDING' : 'SYNCED',
            lastSyncedAt: new Date(),
          },
        })
        syncedCount++
      } catch (e) {
        failedCount++
        errors.push({ itemId: item.itemId, error: e.message })
      }
    }

    // 4. If Meta Catalog ID and Access Token are configured, dispatch batch to Meta Catalog API
    let metaBatchResult = null
    if (settings.accessToken && settings.catalogId) {
      const client = new MetaClient({
        apiVersion: settings.apiVersion,
        accessToken: settings.accessToken,
      })

      const batchRequests = itemsToProcess.map((item) => ({
        method: 'UPDATE',
        retailer_id: item.itemId,
        data: {
          id: item.itemId,
          title: item.title,
          description: item.description,
          availability: item.availability,
          condition: 'new',
          price: `${item.price} ${item.currency}`,
          link: item.linkUrl,
          image_link: item.imageUrl,
          brand: 'مكتبة أرين',
          category: item.category,
        },
      }))

      try {
        metaBatchResult = await client.post(`/${settings.catalogId}/items_batch`, {
          requests: batchRequests,
        })

        await prisma.marketingCatalogItem.updateMany({
          where: { itemId: { in: itemsToProcess.map((i) => i.itemId) } },
          data: {
            syncStatus: 'SYNCED',
            errorMessage: null,
            lastSyncedAt: new Date(),
            syncDetails: metaBatchResult,
          },
        })
      } catch (metaErr) {
        const errMsg = metaErr.metaUserMsg || metaErr.message || 'فشل إرسال الدفعة إلى Meta Catalog API'
        await prisma.marketingCatalogItem.updateMany({
          where: { itemId: { in: itemsToProcess.map((i) => i.itemId) } },
          data: {
            syncStatus: 'FAILED',
            errorMessage: errMsg,
          },
        })
        errors.push({ meta: true, error: errMsg })
      }
    }

    // Complete Job
    const finalStatus = errors.length === 0 ? 'COMPLETED' : syncedCount > 0 ? 'PARTIAL_SUCCESS' : 'FAILED'
    await prisma.marketingSyncJob.update({
      where: { id: syncJob.id },
      data: {
        status: finalStatus,
        totalItems: itemsToProcess.length,
        syncedItems: syncedCount,
        failedItems: failedCount,
        completedAt: new Date(),
        errorMessage: errors.length > 0 ? JSON.stringify(errors.slice(0, 5)) : null,
        details: {
          scope,
          syncedCount,
          failedCount,
          metaBatchResult,
        },
      },
    })

    return {
      success: true,
      jobId: syncJob.id,
      status: finalStatus,
      total: itemsToProcess.length,
      synced: syncedCount,
      failed: failedCount,
      errors: errors.slice(0, 10),
    }
  } catch (err) {
    await prisma.marketingSyncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'FAILED',
        errorMessage: err.message,
        completedAt: new Date(),
      },
    })
    throw err
  }
}

/**
 * List catalog items for Admin UI with pagination and status filters
 */
export async function listCatalogItems({
  page = 1,
  limit = 25,
  itemType = null,
  syncStatus = null,
  search = null,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25))
  const skip = (pageNum - 1) * limitNum

  const where = {}
  if (itemType && itemType !== 'ALL') {
    where.itemType = itemType
  }
  if (syncStatus && syncStatus !== 'ALL') {
    where.syncStatus = syncStatus
  }
  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim()
    where.OR = [
      { itemId: { contains: term, mode: 'insensitive' } },
      { title: { contains: term, mode: 'insensitive' } },
      { category: { contains: term, mode: 'insensitive' } },
    ]
  }

  const [total, items, stats] = await Promise.all([
    prisma.marketingCatalogItem.count({ where }),
    prisma.marketingCatalogItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limitNum,
    }),
    getCatalogStats(),
  ])

  return {
    items,
    stats,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  }
}

/**
 * Get aggregated catalog stats
 */
export async function getCatalogStats() {
  const [total, synced, pending, failed, lastJob] = await Promise.all([
    prisma.marketingCatalogItem.count(),
    prisma.marketingCatalogItem.count({ where: { syncStatus: 'SYNCED' } }),
    prisma.marketingCatalogItem.count({ where: { syncStatus: 'PENDING' } }),
    prisma.marketingCatalogItem.count({ where: { syncStatus: 'FAILED' } }),
    prisma.marketingSyncJob.findFirst({
      where: { jobType: 'CATALOG_SYNC' },
      orderBy: { startedAt: 'desc' },
    }),
  ])

  return {
    total,
    synced,
    pending,
    failed,
    lastSyncAt: lastJob?.completedAt || null,
    lastJobStatus: lastJob?.status || null,
  }
}
