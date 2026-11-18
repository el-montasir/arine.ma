import { createOrder, findOrders, findOrder, OrderError } from '../services/order.service.js'
import { errorResponse } from '../utils/api-response.js'

// "محمد أمين العلوي" -> "محمد أ."; enough for the customer to recognise the order.
function maskName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[1].charAt(0)}.`
}

// Public-facing orders must never leak the admin-only cost snapshot. The
// whitelist below keeps future OrderItem fields invisible by default: only
// fields explicitly listed here reach the customer Store.
//
// Anyone who knows (or guesses) an order number can call the public lookup, so
// it carries no contact data: no phone, street address or note, and only a
// shortened name. The admin API still has the full record.
// Courier statuses (DIGYLOG ids) translated into what a customer cares about:
// a delivery stage for the progress bar, and an optional short note. Internal
// labels (hubs, call-centre, "suspect client"…) are never shown.
const PICKED_UP = new Set([15, 16, 37, 49, 50, 76])
const ON_THE_WAY = new Set([1, 2, 3, 14, 17, 18, 19, 26, 31, 39, 53, 54, 73, 77])
const NOTES = [
  ['UNREACHABLE', [4, 21, 22, 43, 72]],
  ['POSTPONED', [5, 23, 44]],
  ['ADDRESS_ISSUE', [24, 55, 64, 65, 70, 71, 74, 75]],
  ['RETURNING', [9, 10, 11, 30, 32, 40, 41, 42, 47, 78, 79, 81]],
]

function courierProgress(statusId) {
  if (statusId == null) return { courierStage: null, courierNote: null }
  const courierStage = PICKED_UP.has(statusId) ? 'PICKED_UP' : ON_THE_WAY.has(statusId) ? 'ON_THE_WAY' : null
  const courierNote = NOTES.find(([, ids]) => ids.includes(statusId))?.[0] ?? null
  return { courierStage, courierNote }
}

function publicOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    fullName: maskName(order.fullName),
    city: order.city,
    paymentMethod: order.paymentMethod,
    status: order.status,
    // Courier tracking number (DIGYLOG), so the customer can follow the parcel.
    trackingNumber: order.shipment?.tracking ?? null,
    ...courierProgress(order.shipment?.statusId ?? null),
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: (order.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productTitle: item.productTitle,
      productImage: item.productImage || null,
      productImageVariantWidths: item.productImageVariantWidths || [],
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    packageItems: (order.packageItems || []).map((item) => ({
      id: item.id,
      packageId: item.packageId,
      packageTitle: item.packageTitle,
      packageImage: item.packageImage || null,
      packageImageVariantWidths: item.packageImageVariantWidths || [],
      itemsSnapshot: item.itemsSnapshot || null,
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
    const inputWithContext = {
      ...req.validated,
      _clientIp: req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || null,
      _userAgent: req.headers?.['user-agent'] || null,
    }
    const order = await createOrder(inputWithContext)
    return res.status(201).json({
      success: true,
      order: { orderNumber: order.orderNumber, total: order.total },
    })
  } catch (err) {
    if (err instanceof OrderError) {
      const body = { success: false, error: { code: err.code, message: err.message } }
      if (err.conflicts) body.conflicts = err.conflicts
      return res.status(err.status).json(body)
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