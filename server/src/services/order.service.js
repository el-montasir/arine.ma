import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { generateOrderNumber } from '../utils/order-number.js'
import { calcShipping } from '../utils/shipping.js'

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
 */
export async function createOrder(input) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch the products that the frontend claims are in the cart.
    const ids = input.items.map((i) => i.productId)
    const products = await tx.product.findMany({
      where: { id: { in: ids } },
      include: { category: true },
    })
    const byId = new Map(products.map((p) => [p.id, p]))

    // 2. Validate every product exists and is available.
    for (const item of input.items) {
      const product = byId.get(item.productId)
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

    // 3. Server-side pricing — never trust the browser.
    let subtotal = 0
    const orderItems = input.items.map((item) => {
      const product = byId.get(item.productId)
      const unitPrice = product.price
      const totalPrice = unitPrice * item.quantity
      subtotal += totalPrice
      return {
        productId: product.id,
        productTitle: product.title, // snapshot
        quantity: item.quantity,
        unitPrice, // snapshot
        totalPrice,
        // Cost snapshot (Admin-only, never public). NULL until the admin sets a
        // costPrice on the product — existing/historical accuracy is preserved.
        unitCostPrice: product.costPrice ?? null,
      }
    })

    const shipping = calcShipping(subtotal)
    const total = subtotal + shipping

    // 4. Create the order + items with a collision-safe order number.
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
            note: input.note && input.note.length > 0 ? input.note : null,
            paymentMethod: input.paymentMethod,
            status: 'PENDING',
            subtotal,
            shipping,
            total,
            items: { create: orderItems },
          },
          include: { items: true },
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

    return order
  })
}

/**
 * List all orders, newest first. Used by the Admin Panel.
 */
export async function findOrders() {
  return prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Look up an order by its human-readable order number.
 */
export async function findOrder(orderNumber) {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  })
}