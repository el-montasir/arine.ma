import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { generateOrderNumber } from '../utils/order-number.js'
import { calcShipping } from '../utils/shipping.js'
import { recordOrderAttribution } from './marketing/attribution.service.js'
import { sendCapiEvent, buildUserData } from './marketing/meta-capi.service.js'

export class OrderError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

/**
 * Create an order in a single Prisma transaction.
 *
 * CRITICAL: prices, shipping, and total are computed entirely server-side
 * from the canonical product prices in PostgreSQL. Nothing from the frontend
 * is trusted for monetary calculations.
 *
 * Supports both regular book items and package items in the same cart.
 */
export async function createOrder(input) {
  const order = await prisma.$transaction(async (tx) => {
    // 1. Fetch the products (books) that the frontend claims are in the cart.
    const bookIds = (input.items || []).map((i) => i.productId)
    const products = await tx.product.findMany({
      where: { id: { in: bookIds } },
      include: { category: true },
    })
    const productById = new Map(products.map((p) => [p.id, p]))

    // 2. Fetch the packages that the frontend claims are in the cart.
    const packageIds = (input.packages || []).map((i) => i.packageId)
    const packages = await tx.package.findMany({
      where: { id: { in: packageIds } },
      include: {
        items: {
          include: {
            product: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
    const packageById = new Map(packages.map((p) => [p.id, p]))

    // 3. Validate every book exists and is available.
    for (const item of input.items || []) {
      const product = productById.get(item.productId)
      if (!product) {
        throw new OrderError(404, 'PRODUCT_NOT_FOUND', 'أحد الكتب المطلوبة غير موجود')
      }
      if (product.availability !== 'in-stock') {
        throw new OrderError(
          409,
          'PRODUCT_UNAVAILABLE',
          `الكتاب «${product.title}» غير متوفر حالياً`
        )
      }
    }

    // 4. Validate every package exists and is available.
    for (const item of input.packages || []) {
      const pkg = packageById.get(item.packageId)
      if (!pkg) {
        throw new OrderError(404, 'PACKAGE_NOT_FOUND', 'إحدى الباقات المطلوبة غير موجودة')
      }
      if (pkg.availability !== 'in-stock') {
        throw new OrderError(
          409,
          'PACKAGE_UNAVAILABLE',
          `الباقة «${pkg.title}» غير متوفرة حالياً`
        )
      }
    }

    // 5. Server-side pricing — never trust the browser.
    let subtotal = 0
    const orderItems = (input.items || []).map((item) => {
      const product = productById.get(item.productId)
      const unitPrice = product.price
      const totalPrice = unitPrice * item.quantity
      subtotal += totalPrice
      return {
        productId: product.id,
        productTitle: product.title, // snapshot
        productImage: product.image || null, // snapshot
        quantity: item.quantity,
        unitPrice, // snapshot
        totalPrice,
        // Cost snapshot (Admin-only, never public). NULL until the admin sets a
        // costPrice on the product — existing/historical accuracy is preserved.
        unitCostPrice: product.costPrice ?? null,
      }
    })

    const packageItems = (input.packages || []).map((item) => {
      const pkg = packageById.get(item.packageId)
      const unitPrice = pkg.price
      const totalPrice = unitPrice * item.quantity
      subtotal += totalPrice
      const itemsSnapshot = (pkg.items || []).map((pi) => ({
        productId: pi.productId,
        title: pi.product?.title || null,
        author: pi.product?.author || null,
      }))
      return {
        packageId: pkg.id,
        packageTitle: pkg.title, // snapshot
        packageImage: pkg.image || null, // snapshot
        itemsSnapshot: itemsSnapshot.length > 0 ? itemsSnapshot : null, // snapshot
        quantity: item.quantity,
        unitPrice, // snapshot
        totalPrice,
        unitCostPrice: pkg.costPrice ?? null,
      }
    })

    // Collect product-level and package-level shipping overrides for calcShipping
    const shippingOverrides = [
      ...products.map((p) => ({
        shippingMode: p.shippingMode,
        customShipping: p.customShipping,
      })),
      ...packages.map((p) => ({
        shippingMode: p.shippingMode,
        customShipping: p.customShipping,
      })),
    ]

    const shipping = await calcShipping(subtotal, shippingOverrides)
    const total = subtotal + shipping

    // 6. Find or link customer based on phone
    const normalizedPhone = String(input.phone || '').trim().replace(/\s+/g, '')
    let customer = null
    if (normalizedPhone) {
      customer = await tx.customer.upsert({
        where: { phone: normalizedPhone },
        update: {
          fullName: input.fullName,
          city: input.city,
          address: input.address,
        },
        create: {
          fullName: input.fullName,
          phone: normalizedPhone,
          city: input.city,
          address: input.address,
          status: 'ACTIVE',
        },
      })
    }

    // 7. Create the order + items with a collision-safe order number.
    let order = null
    for (let attempt = 0; attempt < 5 && !order; attempt++) {
      try {
        order = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            fullName: input.fullName,
            phone: input.phone,
            city: input.city,
            address: input.address,
            customerId: customer ? customer.id : null,
            note: input.note && input.note.length > 0 ? input.note : null,
            paymentMethod: input.paymentMethod,
            status: 'PENDING',
            subtotal,
            shipping,
            total,
            items: { create: orderItems },
            packageItems: { create: packageItems },
          },
          include: { items: true, packageItems: true },
        })
      } catch (e) {
        // Unique-violation on orderNumber → retry with a fresh random suffix.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          continue
        }
        throw e
      }
    }

    if (!order) {
      throw new OrderError(500, 'ORDER_NUMBER_FAILED', 'تعذر إنشاء رقم الطلب')
    }

    // 8. Create real admin notifications for active admins
    const activeAdmins = await tx.admin.findMany({
      where: { isActive: true, status: 'ACTIVE' },
      select: { id: true },
    })

    if (activeAdmins.length > 0) {
      await tx.notification.createMany({
        data: activeAdmins.map((adm) => ({
          adminId: adm.id,
          type: 'NEW_ORDER',
          orderId: order.id,
          title: 'طلب جديد',
          message: `طلب جديد رقم #${order.orderNumber} من ${order.fullName} (${order.city}) بقيمة ${order.total} د.م`,
          isRead: false,
        })),
      })
    }

    return order
  })

  // Post-transaction Marketing & CAPI Integration:
  // Runs outside the database transaction so marketing failures NEVER roll back a committed order.
  try {
    const attrInput = input.attribution || {}
    let attributionRecord = null

    // 1. Record marketing attribution snapshot if any context is present
    attributionRecord = await recordOrderAttribution({
      orderId: order.id,
      utmSource: attrInput.utmSource,
      utmMedium: attrInput.utmMedium,
      utmCampaign: attrInput.utmCampaign,
      utmContent: attrInput.utmContent,
      utmTerm: attrInput.utmTerm,
      fbclid: attrInput.fbclid,
      fbp: attrInput.fbp,
      fbc: attrInput.fbc,
      metaCampaignId: attrInput.metaCampaignId,
      metaCampaignName: attrInput.metaCampaignName,
      firstTouch: attrInput.firstTouch,
      lastTouch: attrInput.lastTouch,
      landingPage: attrInput.landingPage,
      referrer: attrInput.referrer,
      deviceType: attrInput.deviceType,
      ipAddress: input._clientIp || null,
      userAgent: input._userAgent || null,
    })

    // 2. Build contents payload for Meta CAPI
    const contents = [
      ...(order.items || []).map((item) => ({
        id: item.productId ? `book-${item.productId}` : `item-${item.id}`,
        item_price: item.unitPrice,
        quantity: item.quantity,
        title: item.productTitle,
      })),
      ...(order.packageItems || []).map((item) => ({
        id: item.packageId ? `pkg-${item.packageId}` : `item-${item.id}`,
        item_price: item.unitPrice,
        quantity: item.quantity,
        title: item.packageTitle,
      })),
    ]

    const userData = buildUserData({
      fullName: order.fullName,
      phone: order.phone,
      city: order.city,
      clientIp: input._clientIp,
      userAgent: input._userAgent,
      fbp: attrInput.fbp,
      fbc: attrInput.fbc,
    })

    // Stable event ID for deduplication with storefront pixel
    const purchaseEventId = input.eventId || order.orderNumber

    // Dispatch Purchase event to Meta Conversions API
    await sendCapiEvent({
      eventName: 'Purchase',
      eventId: purchaseEventId,
      orderId: order.id,
      attributionId: attributionRecord?.id || null,
      eventSourceUrl: attrInput.landingPage || null,
      actionSource: 'website',
      userData,
      customData: {
        value: order.total,
        currency: 'MAD',
        content_type: 'product',
        contents,
        content_ids: contents.map((c) => c.id),
        num_items: contents.length,
        order_id: order.orderNumber,
      },
    })
  } catch (mErr) {
    // Isolated error logging: Marketing failures must not disrupt order response
    console.error('[MARKETING_CAPI_ERROR] Post-order CAPI dispatch failed:', mErr.message)
  }

  return order
}

/**
 * List all orders, newest first. Used by the Admin Panel.
 */
export async function findOrders() {
  return prisma.order.findMany({
    include: { items: true, packageItems: true },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Look up an order by its human-readable order number.
 */
export async function findOrder(orderNumber) {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, packageItems: true },
  })
}