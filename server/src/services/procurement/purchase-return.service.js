import { prisma } from '../../lib/prisma.js'
import { generateReturnNumber } from './numbering.service.js'
import { returnStockInTx, executeWithSerializationRetry } from '../stock/stock.service.js'
import { logActivity } from '../admin/activity-log.service.js'

export class PurchaseReturnError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

/**
 * List purchase returns with filtering and pagination.
 */
export async function listPurchaseReturns({
  supplierId = undefined,
  purchaseId = undefined,
  status = undefined,
  startDate = undefined,
  endDate = undefined,
  page = 1,
  limit = 20,
}) {
  const skip = (page - 1) * limit
  const where = {}

  if (supplierId) {
    where.supplierId = Number(supplierId)
  }

  if (purchaseId) {
    where.purchaseId = Number(purchaseId)
  }

  if (status) {
    where.status = status
  }

  if (startDate || endDate) {
    where.returnDate = {}
    if (startDate) where.returnDate.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      where.returnDate.lte = end
    }
  }

  const [returns, total, summary] = await Promise.all([
    prisma.purchaseReturn.findMany({
      where,
      skip,
      take: limit,
      orderBy: { returnDate: 'desc' },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, city: true },
        },
        purchase: {
          select: { id: true, purchaseNumber: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, title: true, currentStock: true, image: true },
            },
          },
        },
        createdByAdmin: {
          select: { id: true, name: true, username: true },
        },
      },
    }),
    prisma.purchaseReturn.count({ where }),
    prisma.purchaseReturn.aggregate({
      where: { ...where, status: 'CONFIRMED' },
      _sum: { refundAmount: true },
    }),
  ])

  return {
    items: returns.map((r) => ({
      ...r,
      refundAmount: Number(r.refundAmount),
      totalItems: r.items.reduce((sum, i) => sum + i.quantity, 0),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalConfirmedRefund: Number((summary._sum.refundAmount ?? 0).toFixed(2)),
  }
}

/**
 * Get purchase return details by ID.
 */
export async function getPurchaseReturnById(id) {
  const purchaseReturn = await prisma.purchaseReturn.findUnique({
    where: { id },
    include: {
      supplier: true,
      purchase: {
        select: { id: true, purchaseNumber: true, status: true, grandTotal: true },
      },
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
              sku: true,
              isbn: true,
              price: true,
              currentStock: true,
              image: true,
            },
          },
        },
      },
    },
  })

  if (!purchaseReturn) return null

  return {
    ...purchaseReturn,
    refundAmount: Number(purchaseReturn.refundAmount),
    totalItems: purchaseReturn.items.reduce((sum, i) => sum + i.quantity, 0),
  }
}

/**
 * Create a new purchase return.
 * If status is CONFIRMED, inventory stock is reduced atomically in a Serializable transaction.
 */
export async function createPurchaseReturn(data, actor = null, req = null) {
  const supplierId = Number(data.supplierId)
  const purchaseId = data.purchaseId ? Number(data.purchaseId) : null
  const initialStatus = data.status === 'CONFIRMED' ? 'CONFIRMED' : 'DRAFT'

  // Verify supplier exists
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
  })
  if (!supplier) {
    throw new PurchaseReturnError(404, 'SUPPLIER_NOT_FOUND', 'المورد غير موجود')
  }

  if (purchaseId) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
    })
    if (!purchase) {
      throw new PurchaseReturnError(404, 'PURCHASE_NOT_FOUND', 'طلب الشراء غير موجود')
    }
    if (purchase.supplierId !== supplierId) {
      throw new PurchaseReturnError(400, 'PURCHASE_SUPPLIER_MISMATCH', 'طلب الشراء لا ينتمي إلى هذا المورد')
    }
  }

  // Validate items
  let totalRefund = 0
  const computedItems = data.items.map((item) => {
    const qty = Number(item.quantity)
    const cost = Number(item.unitCost)
    if (qty <= 0) {
      throw new PurchaseReturnError(400, 'INVALID_QUANTITY', 'كمية المرتجع يجب أن تكون أكبر من صفر')
    }
    totalRefund += qty * cost
    return {
      productId: item.productId,
      quantity: qty,
      unitCost: cost,
      reason: item.reason || null,
    }
  })

  return executeWithSerializationRetry(async () => {
    return prisma.$transaction(
      async (tx) => {
        const returnNumber = await generateReturnNumber(tx)

        const purchaseReturn = await tx.purchaseReturn.create({
          data: {
            returnNumber,
            supplierId,
            purchaseId,
            status: initialStatus,
            returnDate: data.returnDate ? new Date(data.returnDate) : new Date(),
            refundAmount: Number(totalRefund.toFixed(2)),
            reason: data.reason || null,
            note: data.note || null,
            createdByAdminId: actor?.id ?? null,
            items: {
              create: computedItems,
            },
          },
          include: {
            supplier: true,
            purchase: true,
            items: {
              include: { product: true },
            },
          },
        })

        // If confirmed immediately, deduct inventory stock
        if (initialStatus === 'CONFIRMED') {
          await returnStockInTx(
            tx,
            computedItems,
            returnNumber,
            supplier.name,
            actor?.id ?? null
          )
        }

        await logActivity({
          actor,
          action: 'PURCHASE_RETURN_CREATED',
          resourceType: 'PURCHASE_RETURN',
          resourceId: purchaseReturn.id,
          details: {
            returnNumber,
            supplierName: supplier.name,
            status: initialStatus,
            refundAmount: totalRefund,
          },
          req,
        })

        return {
          ...purchaseReturn,
          refundAmount: Number(purchaseReturn.refundAmount),
        }
      },
      {
        isolationLevel: 'Serializable',
        timeout: 15000,
      }
    )
  })
}

/**
 * Confirm a draft purchase return (deducts stock atomically).
 */
export async function confirmPurchaseReturn(id, actor = null, req = null) {
  return executeWithSerializationRetry(async () => {
    return prisma.$transaction(
      async (tx) => {
        const returnRows = await tx.$queryRaw`
          SELECT id, "returnNumber", "supplierId", status, "refundAmount"
          FROM purchase_returns
          WHERE id = ${id}
          FOR UPDATE
        `
        const existing = returnRows[0]
        if (!existing) {
          throw new PurchaseReturnError(404, 'RETURN_NOT_FOUND', 'سجل المرتجع غير موجود')
        }

        if (existing.status === 'CONFIRMED') {
          throw new PurchaseReturnError(400, 'ALREADY_CONFIRMED', 'تم تأكيد هذا المرتجع مسبقاً')
        }

        if (existing.status === 'CANCELLED') {
          throw new PurchaseReturnError(400, 'RETURN_CANCELLED', 'لا يمكن تأكيد مرتجع ملغي')
        }

        const supplier = await tx.supplier.findUnique({
          where: { id: existing.supplierId },
          select: { name: true },
        })

        const items = await tx.purchaseReturnItem.findMany({
          where: { purchaseReturnId: id },
        })

        // Deduct inventory stock
        await returnStockInTx(
          tx,
          items,
          existing.returnNumber,
          supplier?.name || '',
          actor?.id ?? null
        )

        const updated = await tx.purchaseReturn.update({
          where: { id },
          data: { status: 'CONFIRMED' },
          include: {
            supplier: true,
            items: { include: { product: true } },
          },
        })

        await logActivity({
          actor,
          action: 'PURCHASE_RETURN_CONFIRMED',
          resourceType: 'PURCHASE_RETURN',
          resourceId: id,
          details: {
            returnNumber: existing.returnNumber,
            refundAmount: Number(existing.refundAmount),
          },
          req,
        })

        return {
          ...updated,
          refundAmount: Number(updated.refundAmount),
        }
      },
      {
        isolationLevel: 'Serializable',
        timeout: 15000,
      }
    )
  })
}
