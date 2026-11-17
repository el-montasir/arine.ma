import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import { orderFinance } from '../../utils/admin-finance.js'
import { generateOrderNumber } from '../../utils/order-number.js'
import { calcShipping } from '../../utils/shipping.js'
import { resolveCity } from '../shipping/digylog.client.js'
import { pickPrimaryImageUrl, widthsForImageUrl } from '../../lib/image-metadata.js'
import { ORDER_STATUSES } from '../../validators/admin/order.validator.js'
import { shippingService } from '../shipping/index.js'
import { applyStockAndUpdateOrderStatus, StockConflictError } from '../stock/stock.service.js'

const INCLUDE_ITEMS = {
  items: true,
  packageItems: true,
  createdByAdmin: { select: { name: true, username: true } },
  shipment: true,
}

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
    source: order.source,
    createdBy: order.createdByAdmin ? order.createdByAdmin.name || order.createdByAdmin.username : null,
    shipment: order.shipment
      ? {
          provider: order.shipment.provider,
          tracking: order.shipment.tracking,
          statusId: order.shipment.statusId,
          statusLabel: order.shipment.statusLabel,
          motif: order.shipment.motif,
          driverPhone: order.shipment.driverPhone,
          costCents: order.shipment.costCents,
          city: order.shipment.city,
          error: order.shipment.error,
          sentAt: order.shipment.sentAt,
          lastSyncAt: order.shipment.lastSyncAt,
        }
      : null,
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

// Stock side-effects and order status update commit in one Serializable transaction.
// applyStockAndUpdateOrderStatus locks the order row, runs stock deduction/restoration
// if needed, then updates order.status — all atomically, preventing partial commits.
export async function updateOrderStatus(id, status, actorAdminId = null) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new ApiError(400, 'INVALID_STATUS', 'الحالة غير صحيحة')
  }
  const existing = await prisma.order.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'الطلب غير موجود')

  const updated = await applyStockAndUpdateOrderStatus(id, status, INCLUDE_ITEMS, actorAdminId)

  // Provider-independent dispatch hook (safe, logs errors without blocking status update)
  await shippingService.onOrderStatusChange(updated, status).catch(() => {})

  return serializeAdminOrder(updated)
}

export async function getPendingOrdersCount() {
  return prisma.order.count({
    where: { status: 'PENDING' },
  })
}

export async function deleteOrder(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: INCLUDE_ITEMS,
  })
  if (!order) {
    throw new ApiError(404, 'NOT_FOUND', 'الطلب غير موجود')
  }

  await prisma.order.delete({
    where: { id },
  })

  return order
}

// Steps a new order walks through so stock moves exactly as if an admin had
// confirmed it by hand (deduction happens on CONFIRMED).
const MANUAL_STATUS_PATH = {
  PENDING: [],
  CONFIRMED: ['CONFIRMED'],
  SHIPPING: ['CONFIRMED', 'SHIPPING'],
  DELIVERED: ['CONFIRMED', 'DELIVERED'],
}

/**
 * Order typed by an admin (WhatsApp, phone, in-store…). Separate from the
 * storefront checkout: catalog prices are the default but may be overridden
 * per line, shipping is computed like the storefront unless given, and no
 * customer notification, push or Meta event is sent.
 */
export async function createManualOrder(input, admin) {
  const cityKey = (await resolveCity(input.city))?.name ?? null

  const created = await prisma.$transaction(async (tx) => {
    const [products, packages] = await Promise.all([
      tx.product.findMany({ where: { id: { in: input.items.map((i) => i.productId) } }, include: { images: true } }),
      tx.package.findMany({ where: { id: { in: input.packages.map((i) => i.packageId) } }, include: { images: true, items: { include: { product: true }, orderBy: { sortOrder: 'asc' } } } }),
    ])
    const productById = new Map(products.map((p) => [p.id, p]))
    const packageById = new Map(packages.map((p) => [p.id, p]))

    let subtotal = 0
    const orderItems = input.items.map((item) => {
      const product = productById.get(item.productId)
      if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'أحد الكتب غير موجود')
      const unitPrice = item.unitPrice ?? product.price
      subtotal += unitPrice * item.quantity
      const image = pickPrimaryImageUrl(product.images, product.image)
      return {
        productId: product.id,
        productTitle: product.title,
        productImage: image || null,
        productImageVariantWidths: widthsForImageUrl(product.images || [], image),
        quantity: item.quantity,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
        unitCostPrice: product.costPrice ?? null,
      }
    })
    const packageItems = input.packages.map((item) => {
      const pkg = packageById.get(item.packageId)
      if (!pkg) throw new ApiError(404, 'PACKAGE_NOT_FOUND', 'إحدى الباقات غير موجودة')
      const unitPrice = item.unitPrice ?? pkg.price
      subtotal += unitPrice * item.quantity
      const image = pickPrimaryImageUrl(pkg.images, pkg.image)
      const snapshot = (pkg.items || []).map((pi) => ({
        productId: pi.productId,
        title: pi.product?.title || null,
        author: pi.product?.author || null,
        componentQuantity: pi.quantity ?? 1,
      }))
      return {
        packageId: pkg.id,
        packageTitle: pkg.title,
        packageImage: image || null,
        packageImageVariantWidths: widthsForImageUrl(pkg.images || [], image),
        itemsSnapshot: snapshot.length > 0 ? snapshot : null,
        quantity: item.quantity,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
        unitCostPrice: pkg.costPrice ?? null,
      }
    })

    const shipping =
      input.shipping ??
      (await calcShipping(
        subtotal,
        [...products, ...packages].map((p) => ({ shippingMode: p.shippingMode, customShipping: p.customShipping })),
        null,
        { cityKey }
      ))

    const phone = input.phone.replace(/\s+/g, '')
    const customer = await tx.customer.upsert({
      where: { phone },
      update: { fullName: input.fullName, ...(input.city ? { city: input.city } : {}), ...(input.address ? { address: input.address } : {}) },
      create: { fullName: input.fullName, phone, city: input.city || null, address: input.address || null, status: 'ACTIVE' },
    })

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            fullName: input.fullName,
            phone: input.phone,
            city: input.city,
            address: input.address,
            note: input.note || null,
            customerId: customer.id,
            status: 'PENDING',
            source: input.source,
            createdByAdminId: admin?.id ?? null,
            subtotal,
            shipping,
            total: subtotal + shipping,
            items: { create: orderItems },
            packageItems: { create: packageItems },
          },
        })
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue
        throw e
      }
    }
    throw new ApiError(500, 'ORDER_NUMBER_FAILED', 'تعذر إنشاء رقم الطلب')
  })

  // Walk the normal status flow (stock deduction on CONFIRMED). No shipping
  // dispatch here: the admin is recording a sale, not requesting a courier.
  try {
    for (const step of MANUAL_STATUS_PATH[input.status]) {
      await applyStockAndUpdateOrderStatus(created.id, step, INCLUDE_ITEMS, admin?.id ?? null)
    }
  } catch (err) {
    // Not enough stock: nothing was deducted, so drop the half-made order.
    if (err instanceof StockConflictError) await prisma.order.delete({ where: { id: created.id } })
    throw err
  }

  // Confirmed typed orders go to the courier like storefront ones; shop sales
  // are skipped inside the dispatch.
  if (input.status !== 'PENDING') {
    await shippingService.onOrderStatusChange(created, 'CONFIRMED').catch(() => {})
  }

  return getOrder(created.id)
}