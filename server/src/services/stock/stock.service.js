import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { buildDeductions, validateDeductions } from './stock-rules.js'
import { randomUUID } from 'crypto'

/**
 * Fetch the global stock settings singleton (id=1).
 * Always returns an object — falls back to safe defaults on missing row.
 * Accepts optional transaction client.
 */
export async function getStockSettings(client = prisma) {
  const row = await client.stockSettings.findUnique({ where: { id: 1 } })
  return row ?? {
    stockManagementEnabled: false,
    allowOverselling: false,
    lowStockAlertEnabled: true,
    defaultLowStockThreshold: 5,
  }
}

/**
 * Update the stock settings singleton. Creates it if it doesn't exist.
 */
export async function updateStockSettings(data) {
  return prisma.stockSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  })
}

/**
 * Deduct stock for a confirmed order within a given transaction client.
 * Called from updateOrderStatus which owns the wrapping Serializable transaction.
 * Idempotent: if stockDeducted=true on the order row (already locked by caller), returns.
 *
 * @param {object} tx - Prisma transaction client (must hold a Serializable transaction)
 * @param {object} orderRow - already-locked order row: { id, stockDeducted, stockDeductionCycleId }
 * @param {object} settings - stock settings object
 * @param {number|null} actorAdminId
 */
async function _deductStockInTx(tx, orderRow, settings, actorAdminId) {
  const orderId = orderRow.id
  if (orderRow.stockDeducted) return // idempotent exit

  const orderItems = await tx.orderItem.findMany({
    where: { orderId },
    include: { product: { select: { id: true, trackStock: true, currentStock: true } } },
  })

  const packageItems = await tx.packageOrderItem.findMany({
    where: { orderId },
    include: {
      package: {
        include: {
          items: {
            include: {
              product: { select: { id: true, trackStock: true, currentStock: true } },
            },
          },
        },
      },
    },
  })

  // Collect all candidate product IDs from book items and package items (including snapshots)
  const candidateIds = new Set()
  for (const item of orderItems) {
    if (item.productId) candidateIds.add(item.productId)
  }
  for (const pkgItem of packageItems) {
    const snapshot = Array.isArray(pkgItem.itemsSnapshot) && pkgItem.itemsSnapshot.length > 0
      ? pkgItem.itemsSnapshot
      : null
    if (snapshot) {
      for (const comp of snapshot) {
        if (comp.productId) candidateIds.add(comp.productId)
      }
    } else if (pkgItem.package?.items) {
      for (const comp of pkgItem.package.items) {
        if (comp.productId) candidateIds.add(comp.productId)
      }
    }
  }

  if (candidateIds.size === 0) {
    await tx.order.update({
      where: { id: orderId },
      data: { stockDeducted: true, stockDeductionCycleId: randomUUID() },
    })
    return
  }

  const candidateList = Array.from(candidateIds).sort((a, b) => a - b)
  const productMeta = await tx.product.findMany({
    where: { id: { in: candidateList } },
    select: { id: true, trackStock: true },
  })
  const productMap = new Map(productMeta.map((p) => [p.id, p]))

  const deductions = buildDeductions(orderItems, packageItems, productMap)
  if (deductions.length === 0) {
    await tx.order.update({
      where: { id: orderId },
      data: { stockDeducted: true, stockDeductionCycleId: randomUUID() },
    })
    return
  }

  const productIds = deductions.map((d) => d.productId).sort((a, b) => a - b)
  const products = await tx.$queryRaw`
    SELECT id, "currentStock"
    FROM products
    WHERE id = ANY(${productIds}::int[])
    ORDER BY id ASC
    FOR UPDATE
  `

  const stockMap = new Map(products.map((p) => [p.id, p.currentStock]))

  const { valid, conflicts } = validateDeductions(deductions, stockMap, settings.allowOverselling)
  if (!valid) {
    const detail = conflicts.map((c) => `product ${c.productId}: requested ${c.requested}, available ${c.available}`).join('; ')
    throw new StockConflictError(`Insufficient stock: ${detail}`, conflicts)
  }

  const cycleId = randomUUID()

  for (const { productId, delta } of deductions) {
    const previous = stockMap.get(productId) ?? 0
    const next = previous + delta

    await tx.product.update({
      where: { id: productId },
      data: { currentStock: next },
    })

    await tx.stockMovement.create({
      data: {
        productId,
        orderId,
        cycleId,
        reason: 'ORDER_CONFIRMED',
        delta,
        previousStock: previous,
        newStock: next,
        actorAdminId,
      },
    })
  }

  await tx.order.update({
    where: { id: orderId },
    data: { stockDeducted: true, stockDeductionCycleId: cycleId },
  })
}

/**
 * Restore stock when an order is cancelled, within a given transaction client.
 * Called from updateOrderStatus which owns the wrapping Serializable transaction.
 *
 * @param {object} tx - Prisma transaction client
 * @param {object} orderRow - already-locked order row
 * @param {number|null} actorAdminId
 */
async function _restoreStockInTx(tx, orderRow, actorAdminId) {
  const orderId = orderRow.id
  if (!orderRow.stockDeducted || !orderRow.stockDeductionCycleId) return

  const cycleId = orderRow.stockDeductionCycleId

  const alreadyRestored = await tx.stockMovement.findFirst({
    where: { cycleId, reason: 'ORDER_CANCELLED' },
  })
  if (alreadyRestored) return

  const deductions = await tx.stockMovement.findMany({
    where: { cycleId, reason: 'ORDER_CONFIRMED' },
    orderBy: { productId: 'asc' },
  })
  if (deductions.length === 0) return

  const productIds = deductions.map((d) => d.productId).sort((a, b) => a - b)
  const products = await tx.$queryRaw`
    SELECT id, "currentStock"
    FROM products
    WHERE id = ANY(${productIds}::int[])
    ORDER BY id ASC
    FOR UPDATE
  `
  const stockMap = new Map(products.map((p) => [p.id, p.currentStock]))

  for (const movement of deductions) {
    const previous = stockMap.get(movement.productId) ?? 0
    const restorationDelta = Math.abs(movement.delta)
    const next = previous + restorationDelta

    await tx.product.update({
      where: { id: movement.productId },
      data: { currentStock: next },
    })

    await tx.stockMovement.create({
      data: {
        productId: movement.productId,
        orderId,
        cycleId,
        reason: 'ORDER_CANCELLED',
        delta: restorationDelta,
        previousStock: previous,
        newStock: next,
        actorAdminId,
      },
    })
  }

  await tx.order.update({
    where: { id: orderId },
    data: { stockDeducted: false },
  })
}

/**
 * Execute a transaction block with automatic retry for PostgreSQL serialization conflicts
 * (SQLSTATE 40001 / Prisma P2034) or deadlocks (40P01).
 *
 * @param {Function} fn - async function executing the transaction
 * @param {number} maxRetries - maximum retry attempts (default: 3)
 */
async function executeWithSerializationRetry(fn, maxRetries = 3) {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err) {
      attempt++
      const isRetryable =
        err?.code === 'P2034' ||
        (err?.code === 'P2010' && (err?.message?.includes('40001') || err?.message?.includes('40P01'))) ||
        err?.message?.includes('could not serialize access')

      if (isRetryable && attempt <= maxRetries) {
        const delay = Math.floor(Math.random() * 40) + 15 * attempt
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
      throw err
    }
  }
}

/**
 * Apply stock side-effects for an order status transition and update the order status,
 * all within one Serializable transaction with automatic retry on serialization conflicts.
 *
 * Returns the updated order row (with items included), or null if no stock-aware
 * transition applies (caller must update status themselves).
 *
 * @param {number} orderId
 * @param {string} newStatus
 * @param {object} includeClause - Prisma include for the final order.findUnique
 * @param {number|null} actorAdminId
 * @returns {Promise<object>} updated order with items
 */
export async function applyStockAndUpdateOrderStatus(orderId, newStatus, includeClause, actorAdminId = null) {
  return executeWithSerializationRetry(() =>
    prisma.$transaction(async (tx) => {
      // Lock the order row to serialize concurrent mutations
      const rows = await tx.$queryRaw`
        SELECT id, status, "stockDeducted", "stockDeductionCycleId"
        FROM orders
        WHERE id = ${orderId}
        FOR UPDATE
      `
      const orderRow = rows[0]
      if (!orderRow) throw new Error(`Order ${orderId} not found`)

      const settings = await getStockSettings(tx)

      if (settings.stockManagementEnabled) {
        if (newStatus === 'CONFIRMED') {
          await _deductStockInTx(tx, orderRow, settings, actorAdminId)
        } else if (newStatus === 'CANCELLED' && orderRow.stockDeducted) {
          await _restoreStockInTx(tx, orderRow, actorAdminId)
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        include: includeClause,
      })
    }, {
      timeout: 15000,
      isolationLevel: 'Serializable',
    })
  )
}

/**
 * @deprecated Use applyStockAndUpdateOrderStatus. Kept for external callers if any.
 */
export async function deductStockForOrder(orderId, actorAdminId = null) {
  const settings = await getStockSettings()
  if (!settings.stockManagementEnabled) return
  await executeWithSerializationRetry(() =>
    prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`SELECT id, "stockDeducted", "stockDeductionCycleId" FROM orders WHERE id = ${orderId} FOR UPDATE`
      const orderRow = rows[0]
      if (!orderRow) throw new Error(`Order ${orderId} not found`)
      await _deductStockInTx(tx, orderRow, settings, actorAdminId)
    }, { timeout: 10000, isolationLevel: 'Serializable' })
  )
}

/**
 * @deprecated Use applyStockAndUpdateOrderStatus. Kept for external callers if any.
 */
export async function restoreStockForCancelledOrder(orderId, actorAdminId = null) {
  const settings = await getStockSettings()
  if (!settings.stockManagementEnabled) return
  await executeWithSerializationRetry(() =>
    prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`SELECT id, "stockDeducted", "stockDeductionCycleId" FROM orders WHERE id = ${orderId} FOR UPDATE`
      const orderRow = rows[0]
      if (!orderRow) throw new Error(`Order ${orderId} not found`)
      await _restoreStockInTx(tx, orderRow, actorAdminId)
    }, { timeout: 10000, isolationLevel: 'Serializable' })
  )
}


/**
 * Manual stock adjustment (MANUAL_ADJUSTMENT or RESTOCK).
 * Sets currentStock to the new absolute value and writes a movement record.
 */
export async function adjustStock({ productId, newStock, reason, note, actorAdminId }) {
  return prisma.$transaction(async (tx) => {
    const products = await tx.$queryRaw`
      SELECT id, "currentStock"
      FROM products
      WHERE id = ${productId}
      FOR UPDATE
    `
    const product = products[0]
    if (!product) throw new Error(`Product ${productId} not found`)

    const delta = newStock - product.currentStock

    await tx.product.update({
      where: { id: productId },
      data: {
        currentStock: newStock,
        trackStock: true,
      },
    })

    return tx.stockMovement.create({
      data: {
        productId,
        reason,
        delta,
        previousStock: product.currentStock,
        newStock,
        actorAdminId,
        note: note ?? null,
      },
    })
  })
}

/**
 * List stock movements for a product with pagination.
 */
export async function listStockMovements({ productId, page = 1, limit = 50 }) {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        actorAdmin: { select: { id: true, name: true, username: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    }),
    prisma.stockMovement.count({ where: { productId } }),
  ])
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
}

/**
 * Get stock summary with product details for the admin stock page.
 */
export async function getStockSummary({ page = 1, limit = 50, search = '', filter = 'all' }) {
  const skip = (page - 1) * limit

  const whereBase = {
    ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { author: { contains: search, mode: 'insensitive' } }] } : {}),
  }

  let products, total
  if (filter === 'low-stock') {
    const searchCondition = search
      ? Prisma.sql`AND (title ILIKE ${'%' + search + '%'} OR author ILIKE ${'%' + search + '%'})`
      : Prisma.empty

    const raw = await prisma.$queryRaw`
      SELECT id FROM products
      WHERE "trackStock" = true
        AND "currentStock" > 0
        AND "currentStock" <= "lowStockThreshold"
        ${searchCondition}
    `
    const ids = raw.map((r) => r.id)
    ;[products, total] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, author: true, currentStock: true, lowStockThreshold: true, trackStock: true, availability: true, image: true, images: { where: { isPrimary: true }, take: 1 } },
        orderBy: { currentStock: 'asc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where: { id: { in: ids } } }),
    ])
  } else if (filter === 'out-of-stock') {
    const outWhere = {
      ...whereBase,
      trackStock: true,
      currentStock: { lte: 0 },
    }
    ;[products, total] = await Promise.all([
      prisma.product.findMany({
        where: outWhere,
        select: { id: true, title: true, author: true, currentStock: true, lowStockThreshold: true, trackStock: true, availability: true, image: true, images: { where: { isPrimary: true }, take: 1 } },
        orderBy: [{ currentStock: 'asc' }, { title: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.product.count({ where: outWhere }),
    ])
  } else {
    ;[products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereBase,
        select: { id: true, title: true, author: true, currentStock: true, lowStockThreshold: true, trackStock: true, availability: true, image: true, images: { where: { isPrimary: true }, take: 1 } },
        orderBy: [{ currentStock: 'asc' }, { title: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.product.count({ where: whereBase }),
    ])
  }

  return { items: products, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export class StockConflictError extends Error {
  constructor(message, conflicts) {
    super(message)
    this.name = 'StockConflictError'
    this.conflicts = conflicts
    this.code = 'STOCK_CONFLICT'
  }
}
