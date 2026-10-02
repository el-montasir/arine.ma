import { prisma } from '../../lib/prisma.js'
import { getSupplierFinancials } from './supplier.service.js'
import { executeWithSerializationRetry } from '../stock/stock.service.js'
import { logActivity } from '../admin/activity-log.service.js'

export class PaymentError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

/**
 * List supplier payments with filtering and pagination.
 */
export async function listPayments({
  supplierId = undefined,
  purchaseId = undefined,
  paymentMethod = undefined,
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

  if (paymentMethod) {
    where.paymentMethod = paymentMethod
  }

  if (startDate || endDate) {
    where.paymentDate = {}
    if (startDate) where.paymentDate.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      where.paymentDate.lte = end
    }
  }

  const [payments, total, summary] = await Promise.all([
    prisma.purchasePayment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { paymentDate: 'desc' },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, city: true },
        },
        purchase: {
          select: { id: true, purchaseNumber: true, grandTotal: true, status: true },
        },
        createdByAdmin: {
          select: { id: true, name: true, username: true },
        },
      },
    }),
    prisma.purchasePayment.count({ where }),
    prisma.purchasePayment.aggregate({
      where,
      _sum: { amount: true },
    }),
  ])

  return {
    items: payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalAmount: Number((summary._sum.amount ?? 0).toFixed(2)),
  }
}

/**
 * Record a new payment to a supplier with strict validation against overpayment.
 * Uses atomic Serializable transaction with FOR UPDATE locks to prevent concurrent overpayments.
 */
export async function createPayment(data, actor = null, req = null) {
  const supplierId = Number(data.supplierId)
  const purchaseId = data.purchaseId ? Number(data.purchaseId) : null
  const amount = Number(data.amount)

  if (amount <= 0) {
    throw new PaymentError(400, 'INVALID_AMOUNT', 'مبلغ الدفعة يجب أن يكون أكبر من صفر')
  }

  return executeWithSerializationRetry(async () => {
    return prisma.$transaction(
      async (tx) => {
        // Lock supplier row for update to serialize payments for this supplier
        const supplierRows = await tx.$queryRaw`
          SELECT id, name FROM suppliers WHERE id = ${supplierId} FOR UPDATE
        `
        const supplier = supplierRows[0]
        if (!supplier) {
          throw new PaymentError(404, 'SUPPLIER_NOT_FOUND', 'المورد غير موجود')
        }

        // If tied to a specific purchase, lock purchase row for update
        if (purchaseId) {
          const purchaseRows = await tx.$queryRaw`
            SELECT id, "supplierId", "grandTotal", status, "purchaseNumber"
            FROM purchases
            WHERE id = ${purchaseId}
            FOR UPDATE
          `
          const purchase = purchaseRows[0]

          if (!purchase) {
            throw new PaymentError(404, 'PURCHASE_NOT_FOUND', 'طلب الشراء غير موجود')
          }

          if (purchase.supplierId !== supplierId) {
            throw new PaymentError(400, 'PURCHASE_SUPPLIER_MISMATCH', 'طلب الشراء لا ينتمي إلى هذا المورد')
          }

          if (purchase.status === 'CANCELLED') {
            throw new PaymentError(400, 'PURCHASE_CANCELLED', 'لا يمكن سداد دفعة لطلب شراء ملغي')
          }

          const existingPayments = await tx.purchasePayment.findMany({
            where: { purchaseId },
          })

          const grandTotal = Number(purchase.grandTotal)
          const paidSoFar = existingPayments.reduce((sum, p) => sum + Number(p.amount), 0)
          const remainingBalance = Number(Math.max(0, grandTotal - paidSoFar).toFixed(2))

          if (amount > remainingBalance) {
            throw new PaymentError(
              400,
              'OVERPAYMENT_NOT_ALLOWED',
              `مبلغ الدفعة (${amount} د.م) يتجاوز الرصيد المتبقي لطلب الشراء (${remainingBalance} د.م)`
            )
          }
        } else {
          // General supplier payment - check against overall supplier outstanding balance
          const financials = await getSupplierFinancials(supplierId, tx)
          if (financials.balance <= 0) {
            throw new PaymentError(400, 'NO_OUTSTANDING_BALANCE', 'المورد ليس لديه أي مستحقات مالية متبقية')
          }

          if (amount > financials.balance) {
            throw new PaymentError(
              400,
              'OVERPAYMENT_NOT_ALLOWED',
              `مبلغ الدفعة (${amount} د.م) يتجاوز إجمالي الرصيد المستحق للمورد (${financials.balance} د.م)`
            )
          }
        }

        const payment = await tx.purchasePayment.create({
          data: {
            supplierId,
            purchaseId,
            amount,
            paymentMethod: data.paymentMethod,
            paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
            reference: data.reference || data.referenceNumber || null,
            note: data.note || data.notes || null,
            createdByAdminId: actor?.id ?? null,
          },
          include: {
            supplier: true,
            purchase: true,
            createdByAdmin: {
              select: { id: true, name: true, username: true },
            },
          },
        })

        await logActivity({
          actor,
          action: 'PURCHASE_PAYMENT_CREATED',
          resourceType: 'PURCHASE_PAYMENT',
          resourceId: payment.id,
          details: {
            supplierName: supplier.name,
            amount,
            paymentMethod: data.paymentMethod,
            purchaseNumber: payment.purchase?.purchaseNumber || null,
          },
          req,
        })

        return {
          ...payment,
          amount: Number(payment.amount),
        }
      },
      {
        isolationLevel: 'Serializable',
        timeout: 15000,
      }
    )
  })
}
