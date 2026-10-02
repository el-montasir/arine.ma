import { prisma } from '../../lib/prisma.js'
import { generatePurchaseNumber } from './numbering.service.js'
import { receiveStockInTx, executeWithSerializationRetry } from '../stock/stock.service.js'
import { logActivity } from '../admin/activity-log.service.js'

export class PurchaseError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

/**
 * Recompute subtotal, line totals, and grandTotal safely on the server.
 */
function computePurchaseTotals(items, shippingCost = 0, discount = 0, otherCost = 0) {
  let subtotal = 0
  const computedItems = items.map((item) => {
    const qty = Number(item.quantityOrdered)
    const cost = Number(item.unitCost)
    const itemDiscount = Number(item.discount || 0)
    const lineTotal = Math.max(0, qty * cost - itemDiscount)
    subtotal += lineTotal
    return {
      productId: item.productId,
      quantityOrdered: qty,
      quantityReceived: item.quantityReceived || 0,
      unitCost: cost,
      discount: itemDiscount,
      lineTotal: Number(lineTotal.toFixed(2)),
    }
  })

  const grandTotal = Math.max(
    0,
    subtotal + Number(shippingCost || 0) + Number(otherCost || 0) - Number(discount || 0)
  )

  return {
    computedItems,
    subtotal: Number(subtotal.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  }
}

/**
 * List purchases with filtering, search, pagination, and derived payment statuses.
 */
export async function listPurchases({
  search = '',
  supplierId = undefined,
  status = undefined,
  paymentStatus = undefined,
  startDate = undefined,
  endDate = undefined,
  sortBy = 'recent',
  page = 1,
  limit = 20,
}) {
  const skip = (page - 1) * limit
  const where = {}

  if (supplierId) {
    where.supplierId = Number(supplierId)
  }

  if (status) {
    where.status = status
  }

  if (startDate || endDate) {
    where.purchaseDate = {}
    if (startDate) where.purchaseDate.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      where.purchaseDate.lte = end
    }
  }

  if (search && search.trim()) {
    const q = search.trim()
    where.OR = [
      { purchaseNumber: { contains: q, mode: 'insensitive' } },
      { supplier: { name: { contains: q, mode: 'insensitive' } } },
    ]
  }

  let orderBy = { purchaseDate: 'desc' }
  if (sortBy === 'oldest') {
    orderBy = { purchaseDate: 'asc' }
  } else if (sortBy === 'total_desc') {
    orderBy = { grandTotal: 'desc' }
  } else if (sortBy === 'total_asc') {
    orderBy = { grandTotal: 'asc' }
  }

  const [purchases, total, summary] = await Promise.all([
    prisma.purchase.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, city: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, title: true, author: true, currentStock: true, image: true },
            },
          },
        },
        payments: {
          select: { id: true, amount: true, paymentDate: true },
        },
        createdByAdmin: {
          select: { id: true, name: true, username: true },
        },
      },
    }),
    prisma.purchase.count({ where }),
    getPurchasesGlobalSummary(),
  ])

  // Attach calculated items, receipt progress, and payment status
  const formattedItems = purchases.map((p) => {
    const totalOrdered = p.items.reduce((sum, item) => sum + item.quantityOrdered, 0)
    const totalReceived = p.items.reduce((sum, item) => sum + item.quantityReceived, 0)
    const paidAmount = p.payments.reduce((sum, pay) => sum + Number(pay.amount), 0)
    const grandTotal = Number(p.grandTotal)
    const remainingBalance = Math.max(0, grandTotal - paidAmount)

    let computedPaymentStatus = 'UNPAID'
    if (paidAmount >= grandTotal && grandTotal > 0) {
      computedPaymentStatus = 'PAID'
    } else if (paidAmount > 0) {
      computedPaymentStatus = 'PARTIALLY_PAID'
    }

    return {
      id: p.id,
      purchaseNumber: p.purchaseNumber,
      supplierId: p.supplierId,
      supplier: p.supplier,
      status: p.status,
      purchaseDate: p.purchaseDate,
      expectedDate: p.expectedDate,
      receivedAt: p.receivedAt,
      subtotal: Number(p.subtotal),
      shippingCost: Number(p.shippingCost),
      discount: Number(p.discount),
      otherCost: Number(p.otherCost),
      grandTotal,
      paidAmount: Number(paidAmount.toFixed(2)),
      remainingBalance: Number(remainingBalance.toFixed(2)),
      paymentStatus: computedPaymentStatus,
      totalOrdered,
      totalReceived,
      itemsCount: p.items.length,
      items: p.items,
      notes: p.notes,
      createdByAdmin: p.createdByAdmin,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }
  })

  // In-memory filter for computed paymentStatus if query parameter is provided
  let filteredItems = formattedItems
  if (paymentStatus) {
    filteredItems = formattedItems.filter((i) => i.paymentStatus === paymentStatus)
  }

  return {
    items: filteredItems,
    total: paymentStatus ? filteredItems.length : total,
    page,
    limit,
    totalPages: Math.ceil((paymentStatus ? filteredItems.length : total) / limit),
    summary,
  }
}

/**
 * Top summary statistics for the Purchases page.
 */
export async function getPurchasesGlobalSummary() {
  const [totalPurchases, orderedCount, partialCount, draftCount, receivedCount, purchasesAgg, paymentsAgg] =
    await Promise.all([
      prisma.purchase.count({ where: { status: { not: 'CANCELLED' } } }),
      prisma.purchase.count({ where: { status: 'ORDERED' } }),
      prisma.purchase.count({ where: { status: 'PARTIALLY_RECEIVED' } }),
      prisma.purchase.count({ where: { status: 'DRAFT' } }),
      prisma.purchase.count({ where: { status: 'RECEIVED' } }),
      prisma.purchase.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { grandTotal: true },
      }),
      prisma.purchasePayment.aggregate({
        _sum: { amount: true },
      }),
    ])

  const totalValue = Number(purchasesAgg._sum.grandTotal ?? 0)
  const totalPaid = Number(paymentsAgg._sum.amount ?? 0)
  const outstandingPayments = Math.max(0, totalValue - totalPaid)

  return {
    totalPurchases,
    orderedCount,
    partialCount,
    draftCount,
    receivedCount,
    totalValue: Number(totalValue.toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
    outstandingPayments: Number(outstandingPayments.toFixed(2)),
  }
}

/**
 * Get single purchase details by ID with items, payments, returns, and history.
 */
export async function getPurchaseById(id) {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      createdByAdmin: {
        select: { id: true, name: true, username: true },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              author: true,
              price: true,
              currentStock: true,
              image: true,
            },
          },
        },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        include: {
          createdByAdmin: {
            select: { id: true, name: true, username: true },
          },
        },
      },
      returns: {
        orderBy: { returnDate: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, title: true },
              },
            },
          },
        },
      },
    },
  })

  if (!purchase) return null

  const grandTotal = Number(purchase.grandTotal)
  const paidAmount = purchase.payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const remainingBalance = Math.max(0, grandTotal - paidAmount)

  let paymentStatus = 'UNPAID'
  if (paidAmount >= grandTotal && grandTotal > 0) {
    paymentStatus = 'PAID'
  } else if (paidAmount > 0) {
    paymentStatus = 'PARTIALLY_PAID'
  }

  const totalOrdered = purchase.items.reduce((sum, i) => sum + i.quantityOrdered, 0)
  const totalReceived = purchase.items.reduce((sum, i) => sum + i.quantityReceived, 0)

  return {
    ...purchase,
    subtotal: Number(purchase.subtotal),
    shippingCost: Number(purchase.shippingCost),
    discount: Number(purchase.discount),
    otherCost: Number(purchase.otherCost),
    grandTotal,
    paidAmount: Number(paidAmount.toFixed(2)),
    remainingBalance: Number(remainingBalance.toFixed(2)),
    paymentStatus,
    totalOrdered,
    totalReceived,
  }
}

/**
 * Create a new purchase in DRAFT or ORDERED status.
 * Note: Creating a purchase NEVER modifies inventory stock.
 */
export async function createPurchase(data, actor = null, req = null) {
  // Validate supplier exists and is active
  const supplier = await prisma.supplier.findUnique({
    where: { id: data.supplierId },
  })
  if (!supplier) {
    throw new PurchaseError(404, 'SUPPLIER_NOT_FOUND', 'المورد المحدد غير موجود')
  }

  // Verify all products exist
  const productIds = data.items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true },
  })
  if (products.length !== productIds.length) {
    throw new PurchaseError(400, 'PRODUCT_NOT_FOUND', 'أحد المنتجات المحددة غير موجود')
  }

  // Recompute calculations server-side
  const { computedItems, subtotal, grandTotal } = computePurchaseTotals(
    data.items,
    data.shippingCost,
    data.discount,
    data.otherCost
  )

  const initialStatus = data.status === 'ORDERED' ? 'ORDERED' : 'DRAFT'

  return executeWithSerializationRetry(async () => {
    return prisma.$transaction(async (tx) => {
      const purchaseNumber = await generatePurchaseNumber(tx)

      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId: data.supplierId,
          status: initialStatus,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          subtotal,
          shippingCost: data.shippingCost || 0,
          discount: data.discount || 0,
          otherCost: data.otherCost || 0,
          grandTotal,
          notes: data.notes || null,
          createdByAdminId: actor?.id ?? null,
          items: {
            create: computedItems,
          },
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      // Link supplier to products with purchase price if not already linked
      for (const item of computedItems) {
        await tx.supplierProduct.upsert({
          where: {
            supplierId_productId: {
              supplierId: data.supplierId,
              productId: item.productId,
            },
          },
          update: {
            lastPurchasePrice: item.unitCost,
            lastPurchasedAt: new Date(),
          },
          create: {
            supplierId: data.supplierId,
            productId: item.productId,
            purchasePrice: item.unitCost,
            lastPurchasePrice: item.unitCost,
            lastPurchasedAt: new Date(),
          },
        })
      }

      await logActivity({
        actor,
        action: 'PURCHASE_CREATED',
        resourceType: 'PURCHASE',
        resourceId: purchase.id,
        details: {
          purchaseNumber: purchase.purchaseNumber,
          supplierName: supplier.name,
          grandTotal,
          status: initialStatus,
        },
        req,
      })

      return purchase
    })
  })
}

/**
 * Update an existing purchase.
 * Items can only be updated when purchase is in DRAFT status.
 */
export async function updatePurchase(id, data, actor = null, req = null) {
  const existing = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!existing) {
    throw new PurchaseError(404, 'PURCHASE_NOT_FOUND', 'طلب الشراء غير موجود')
  }

  if (existing.status !== 'DRAFT' && data.items) {
    throw new PurchaseError(
      400,
      'CANNOT_EDIT_ITEMS',
      'لا يمكن تعديل عناصر طلب الشراء بعد اعتماده أو استلامه'
    )
  }

  if (existing.status === 'CANCELLED') {
    throw new PurchaseError(400, 'PURCHASE_CANCELLED', 'لا يمكن تعديل طلب شراء ملغي')
  }

  return executeWithSerializationRetry(async () => {
    return prisma.$transaction(async (tx) => {
      let updateData = {
        notes: data.notes !== undefined ? data.notes : existing.notes,
        expectedDate: data.expectedDate !== undefined ? (data.expectedDate ? new Date(data.expectedDate) : null) : existing.expectedDate,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : existing.purchaseDate,
      }

      if (existing.status === 'DRAFT') {
        if (data.supplierId && data.supplierId !== existing.supplierId) {
          const supplierExists = await tx.supplier.findUnique({ where: { id: data.supplierId } })
          if (!supplierExists) throw new PurchaseError(404, 'SUPPLIER_NOT_FOUND', 'المورد غير موجود')
          updateData.supplierId = data.supplierId
        }

        const itemsToUse = data.items || existing.items
        const shipping = data.shippingCost !== undefined ? data.shippingCost : Number(existing.shippingCost)
        const discount = data.discount !== undefined ? data.discount : Number(existing.discount)
        const other = data.otherCost !== undefined ? data.otherCost : Number(existing.otherCost)

        const { computedItems, subtotal, grandTotal } = computePurchaseTotals(
          itemsToUse,
          shipping,
          discount,
          other
        )

        updateData.shippingCost = shipping
        updateData.discount = discount
        updateData.otherCost = other
        updateData.subtotal = subtotal
        updateData.grandTotal = grandTotal

        if (data.items) {
          await tx.purchaseItem.deleteMany({ where: { purchaseId: id } })
          updateData.items = {
            create: computedItems,
          }
        }
      }

      const updated = await tx.purchase.update({
        where: { id },
        data: updateData,
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      })

      await logActivity({
        actor,
        action: 'PURCHASE_UPDATED',
        resourceType: 'PURCHASE',
        resourceId: id,
        details: { purchaseNumber: updated.purchaseNumber },
        req,
      })

      return updated
    })
  })
}

/**
 * Update purchase status with strict state machine validation.
 */
export async function updatePurchaseStatus(id, newStatus, actor = null, req = null) {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!purchase) {
    throw new PurchaseError(404, 'PURCHASE_NOT_FOUND', 'طلب الشراء غير موجود')
  }

  const currentStatus = purchase.status

  // Validate state transitions
  if (currentStatus === 'DRAFT') {
    if (!['ORDERED', 'CANCELLED'].includes(newStatus)) {
      throw new PurchaseError(400, 'INVALID_STATUS_TRANSITION', `لا يمكن التحويل من ${currentStatus} إلى ${newStatus}`)
    }
  } else if (currentStatus === 'ORDERED') {
    if (!['CANCELLED', 'DRAFT'].includes(newStatus)) {
      throw new PurchaseError(400, 'INVALID_STATUS_TRANSITION', `لا يمكن التحويل من ${currentStatus} إلى ${newStatus}`)
    }
  } else if (['PARTIALLY_RECEIVED', 'RECEIVED'].includes(currentStatus)) {
    if (newStatus === 'CANCELLED') {
      throw new PurchaseError(
        400,
        'CANNOT_CANCEL_RECEIVED',
        'لا يمكن إلغاء طلب تم استلام منتجات منه. يرجى استخدام نموذج المرتجعات لإعادة المخزون'
      )
    }
    throw new PurchaseError(400, 'INVALID_STATUS_TRANSITION', 'لا يمكن تعديل حالة طلب مستلم مباشرة')
  } else if (currentStatus === 'CANCELLED') {
    throw new PurchaseError(400, 'INVALID_STATUS_TRANSITION', 'طلب الشراء ملغي ولا يمكن تعديل حالته')
  }

  const updated = await prisma.purchase.update({
    where: { id },
    data: { status: newStatus },
    include: { supplier: true, items: true },
  })

  await logActivity({
    actor,
    action: 'PURCHASE_STATUS_UPDATED',
    resourceType: 'PURCHASE',
    resourceId: id,
    details: {
      purchaseNumber: purchase.purchaseNumber,
      from: currentStatus,
      to: newStatus,
    },
    req,
  })

  return updated
}

/**
 * Receive items for a purchase in an atomic, serialized transaction.
 *
 * Requirements:
 * 1. Lock purchase row.
 * 2. Validate receive quantities <= remaining.
 * 3. Update quantityReceived on items.
 * 4. Adjust inventory stock using trusted receiveStockInTx (locking products in ascending order).
 * 5. Create StockMovement records with reason RESTOCK and descriptive note.
 * 6. Update purchase status (PARTIALLY_RECEIVED or RECEIVED) and receivedAt timestamp.
 * 7. Update supplier product last prices.
 */
export async function receivePurchaseItems(id, receiveData, actor = null, req = null) {
  const items = Array.isArray(receiveData) ? receiveData : receiveData?.items || []
  const note = Array.isArray(receiveData) ? null : receiveData?.note

  return executeWithSerializationRetry(async () => {
    return prisma.$transaction(
      async (tx) => {
        // 1. Lock purchase row
        const purchaseRows = await tx.$queryRaw`
          SELECT id, "purchaseNumber", "supplierId", status, "receivedAt"
          FROM purchases
          WHERE id = ${id}
          FOR UPDATE
        `
        const purchase = purchaseRows[0]
        if (!purchase) {
          throw new PurchaseError(404, 'PURCHASE_NOT_FOUND', 'طلب الشراء غير موجود')
        }

        if (purchase.status === 'CANCELLED') {
          throw new PurchaseError(400, 'PURCHASE_CANCELLED', 'لا يمكن استلام بضاعة لطلب شراء ملغي')
        }
        if (purchase.status === 'RECEIVED') {
          throw new PurchaseError(400, 'ALREADY_FULLY_RECEIVED', 'تم استلام هذا الطلب بالكامل مسبقاً')
        }

        // Fetch supplier info for stock movement note
        const supplier = await tx.supplier.findUnique({
          where: { id: purchase.supplierId },
          select: { name: true },
        })

        // Fetch current purchase items
        const currentItems = await tx.purchaseItem.findMany({
          where: { purchaseId: id },
        })
        const itemMap = new Map()
        for (const it of currentItems) {
          // Map by purchaseItemId if specified, or by productId
          itemMap.set(`item_${it.id}`, it)
          itemMap.set(`prod_${it.productId}`, it)
        }

        const stockItemsToReceive = []
        let totalItemsInPurchase = currentItems.length
        let fullyReceivedCount = 0

        for (const toReceive of items) {
          const matchedItem = toReceive.purchaseItemId
            ? itemMap.get(`item_${toReceive.purchaseItemId}`)
            : itemMap.get(`prod_${toReceive.productId}`)

          if (!matchedItem) {
            throw new PurchaseError(
              400,
              'ITEM_NOT_IN_PURCHASE',
              `المنتج ${toReceive.productId} غير موجود في طلب الشراء هذا`
            )
          }

          const alreadyReceived = matchedItem.quantityReceived
          const ordered = matchedItem.quantityOrdered
          const remaining = ordered - alreadyReceived
          const receiveNow = Number(toReceive.quantityReceived)

          if (receiveNow <= 0) {
            continue
          }

          if (receiveNow > remaining) {
            throw new PurchaseError(
              400,
              'RECEIVE_EXCEEDS_REMAINING',
              `الكمية المراد استلامها (${receiveNow}) تتجاوز الكمية المتبقية (${remaining}) للمنتج ${matchedItem.productId}`
            )
          }

          const newReceivedTotal = alreadyReceived + receiveNow

          // Update item quantityReceived in DB
          await tx.purchaseItem.update({
            where: { id: matchedItem.id },
            data: { quantityReceived: newReceivedTotal },
          })

          // Update supplierProduct last price and date
          await tx.supplierProduct.upsert({
            where: {
              supplierId_productId: {
                supplierId: purchase.supplierId,
                productId: matchedItem.productId,
              },
            },
            update: {
              lastPurchasePrice: matchedItem.unitCost,
              lastPurchasedAt: new Date(),
            },
            create: {
              supplierId: purchase.supplierId,
              productId: matchedItem.productId,
              purchasePrice: matchedItem.unitCost,
              lastPurchasePrice: matchedItem.unitCost,
              lastPurchasedAt: new Date(),
            },
          })

          stockItemsToReceive.push({
            productId: matchedItem.productId,
            quantity: receiveNow,
          })
        }

        if (stockItemsToReceive.length === 0) {
          throw new PurchaseError(400, 'NO_ITEMS_TO_RECEIVE', 'لم يتم تحديد أي كميات صالحة للاستلام')
        }

        // Adjust stock atomically via trusted stock service
        await receiveStockInTx(
          tx,
          stockItemsToReceive,
          purchase.purchaseNumber,
          supplier?.name || '',
          actor?.id ?? null
        )

        // Evaluate all purchase items to determine final purchase status
        const updatedItems = await tx.purchaseItem.findMany({
          where: { purchaseId: id },
        })
        let allItemsFullyReceived = true
        let anyItemReceived = false

        for (const it of updatedItems) {
          if (it.quantityReceived < it.quantityOrdered) {
            allItemsFullyReceived = false
          }
          if (it.quantityReceived > 0) {
            anyItemReceived = true
          }
        }

        const newPurchaseStatus = allItemsFullyReceived
          ? 'RECEIVED'
          : anyItemReceived
            ? 'PARTIALLY_RECEIVED'
            : purchase.status

        const updatedPurchase = await tx.purchase.update({
          where: { id },
          data: {
            status: newPurchaseStatus,
            receivedAt: allItemsFullyReceived ? new Date() : purchase.receivedAt || new Date(),
          },
          include: {
            supplier: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        })

        await logActivity({
          actor,
          action: 'PURCHASE_RECEIVED',
          resourceType: 'PURCHASE',
          resourceId: id,
          details: {
            purchaseNumber: purchase.purchaseNumber,
            status: newPurchaseStatus,
            itemsReceived: stockItemsToReceive,
            note,
          },
          req,
        })

        return updatedPurchase
      },
      {
        isolationLevel: 'Serializable',
        timeout: 15000,
      }
    )
  })
}
