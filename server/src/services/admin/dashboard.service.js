import { prisma } from '../../lib/prisma.js'
import { orderFinance } from '../../utils/admin-finance.js'
import { hasPermission, PERMISSIONS } from '../../constants/permissions.js'

const FINANCIAL = ['CONFIRMED', 'SHIPPING', 'DELIVERED']

function isFinancial(order) {
  return FINANCIAL.includes(order.status)
}

export async function getDashboardStats(admin = null) {
  const canViewFinance = hasPermission(admin, PERMISSIONS.FINANCE_VIEW)

  const [orderCount, productCount, categoryCount, orders] = await Promise.all([
    prisma.order.count(),
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.findMany({ include: { items: true, packageItems: true } }),
  ])

  // Status counts (all orders).
  const byStatus = { PENDING: 0, CONFIRMED: 0, SHIPPING: 0, DELIVERED: 0, CANCELLED: 0 }
  orders.forEach((o) => {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1
  })

  // Finance over non-cancelled orders.
  let revenue = 0 // goods revenue (subtotal basis)
  let cost = 0 // known purchase cost
  let collectedShipping = 0
  let totalSales = 0 // full order totals (goods + shipping), non-cancelled
  let costUnknownItems = 0

  orders.filter(isFinancial).forEach((order) => {
    const f = orderFinance(order)
    revenue += f.revenue
    cost += f.cost
    costUnknownItems += f.costUnknownItems
    collectedShipping += order.shipping
    totalSales += order.total
  })

  const profit = costUnknownItems === 0 ? revenue - cost : null // null = estimate

  // Recent orders + derived activity feed (newest first).
  const recentOrders = orders
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8)
    .map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      fullName: o.fullName,
      status: o.status,
      total: canViewFinance ? o.total : null,
      createdAt: o.createdAt,
    }))

  const recentActivity = orders
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map((o) => ({
      type: 'ORDER_CREATED',
      orderId: o.id,
      orderNumber: o.orderNumber,
      customerName: o.fullName,
      createdAt: o.createdAt,
    }))

  return {
    orderCount,
    productCount,
    categoryCount,
    pendingOrders: byStatus.PENDING,
    confirmedOrders: byStatus.CONFIRMED,
    shippingOrders: byStatus.SHIPPING,
    deliveredOrders: byStatus.DELIVERED,
    cancelledOrders: byStatus.CANCELLED,
    byStatus,
    canViewFinance,
    totalSales: canViewFinance ? totalSales : null,
    revenue: canViewFinance ? revenue : null,
    cost: canViewFinance ? cost : null,
    collectedShipping: canViewFinance ? collectedShipping : null,
    profit: canViewFinance ? profit : null,
    profitMargin:
      canViewFinance && revenue > 0 && profit != null
        ? Math.round((profit / revenue) * 1000) / 10
        : null,
    costUnknownItems: canViewFinance ? costUnknownItems : null,
    recentOrders,
    recentActivity,
  }
}
