import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import { orderFinance } from '../../utils/admin-finance.js'
import { ORDER_STATUSES } from '../../validators/admin/order.validator.js'
import { shippingService } from '../shipping/index.js'

const INCLUDE_ITEMS = { items: true, packageItems: true }

// Admin-only order shape. Embeds the finance block (per-line + order totals)
// that is never sent to the public store API.
export function serializeAdminOrder(order) {
  const finance = orderFinance(order)
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    fullName: order.fullName,
    phone: order.phone,
    city: order.city,
    address: order.address,
    note: order.note,
    paymentMethod: order.paymentMethod,
    status: order.status,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    finance: {
      revenue: finance.revenue,
      cost: finance.cost,
      profit: finance.profit,
      costUnknownItems: finance.costUnknownItems,
    },
    items: finance.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productTitle: item.productTitle,
      productImage: item.productImage || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      unitCostPrice: item.unitCostPrice ?? null,
      lineRevenue: item.revenue,
      lineCost: item.cost,
      lineProfit: item.lineProfit,
      type: 'book',
    })),
    packageItems: finance.packageItems.map((item) => ({
      id: item.id,
      packageId: item.packageId,
      packageTitle: item.packageTitle,
      packageImage: item.packageImage || null,
      itemsSnapshot: item.itemsSnapshot || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      unitCostPrice: item.unitCostPrice ?? null,
      lineRevenue: item.revenue,
      lineCost: item.cost,
      lineProfit: item.lineProfit,
      type: 'package',
    })),
  }
}

export async function listOrders({ search, status }) {
  const where = {}
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status) where.status = status

  const orders = await prisma.order.findMany({
    where,
    include: INCLUDE_ITEMS,
    orderBy: { createdAt: 'desc' },
  })
  return orders.map(serializeAdminOrder)
}

export async function getOrder(id) {
  const order = await prisma.order.findUnique({ where: { id }, include: INCLUDE_ITEMS })
  if (!order) throw new ApiError(404, 'NOT_FOUND', 'الطلب غير موجود')
  return serializeAdminOrder(order)
}

// Single admin-facing status change. Validates the enum server-side so the
// frontend can never inject an unknown status. Delegates dispatch to the
// active shipping provider via shippingService abstraction.
export async function updateOrderStatus(id, status) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new ApiError(400, 'INVALID_STATUS', 'الحالة غير صحيحة')
  }
  const order = await prisma.order.findUnique({ where: { id }, include: INCLUDE_ITEMS })
  if (!order) throw new ApiError(404, 'NOT_FOUND', 'الطلب غير موجود')

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
    include: INCLUDE_ITEMS,
  })

  // Provider-independent dispatch hook (safe, logs errors without blocking status update)
  await shippingService.onOrderStatusChange(updated, status).catch(() => {})

  return serializeAdminOrder(updated)
}