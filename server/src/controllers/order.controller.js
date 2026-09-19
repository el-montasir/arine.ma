import { createOrder, findOrders, findOrder, OrderError } from '../services/order.service.js'
import { errorResponse } from '../utils/api-response.js'

// Public-facing orders must never leak the admin-only cost snapshot. The
// whitelist below keeps future OrderItem fields invisible by default: only
// fields explicitly listed here reach the customer Store.
function publicOrder(order) {
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
    items: (order.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productTitle: item.productTitle,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    packageItems: (order.packageItems || []).map((item) => ({
      id: item.id,
      packageId: item.packageId,
      packageTitle: item.packageTitle,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
  }
}

// GET /api/orders — list all orders (Admin Panel uses /api/admin/orders instead).
export async function getOrdersHandler(req, res, next) {
  try {
    const orders = await findOrders()
    return res.json({ success: true, data: orders.map(publicOrder), count: orders.length })
  } catch (err) {
    next(err)
  }
}

// POST /api/orders
export async function createOrderHandler(req, res, next) {
  try {
    const order = await createOrder(req.validated)
    return res.status(201).json({
      success: true,
      order: { orderNumber: order.orderNumber, total: order.total },
    })
  } catch (err) {
    if (err instanceof OrderError) {
      return errorResponse(res, err.status, err.code, err.message)
    }
    next(err)
  }
}

// GET /api/orders/:orderNumber
export async function getOrderByNumber(req, res, next) {
  try {
    const order = await findOrder(req.params.orderNumber)
    if (!order) {
      return errorResponse(res, 404, 'NOT_FOUND', 'الطلب غير موجود')
    }
    return res.json({ success: true, order: publicOrder(order) })
  } catch (err) {
    next(err)
  }
}