import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import { prisma } from '../../lib/prisma.js'
import {
  listOrders,
  getOrder,
  updateOrderStatus,
  deleteOrder,
  getPendingOrdersCount,
  createManualOrder,
} from '../../services/admin/order.service.js'
import { StockConflictError } from '../../services/stock/stock.service.js'
import { logActivity } from '../../services/admin/activity-log.service.js'
import { shippingService } from '../../services/shipping/index.js'
import { syncShipment } from '../../services/shipping/shipment.service.js'
import { DigylogError, resolveCity } from '../../services/shipping/digylog.client.js'

export const getOrders = asyncHandler(async (req, res) => {
  const orders = await listOrders({
    search: req.query.search?.trim() || '',
    status: req.query.status?.trim() || '',
  })
  res.json({ success: true, data: orders, count: orders.length })
})

export const getPendingOrdersCountHandler = asyncHandler(async (req, res) => {
  const count = await getPendingOrdersCount()
  res.json({ success: true, data: { pendingCount: count } })
})

export const getOrderById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف الطلب غير صحيح')
  }
  const order = await getOrder(id)
  res.json({ success: true, data: order })
})

async function stockConflictResponse(res, err) {
  const productIds = err.conflicts.map((c) => c.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true },
  })
  const titleMap = new Map(products.map((p) => [p.id, p.title]))
  return res.status(409).json({
    success: false,
    code: 'STOCK_CONFLICT',
    message: 'لا يمكن تأكيد الطلب: المخزون غير كافٍ لبعض المنتجات',
    conflicts: err.conflicts.map((c) => ({ ...c, productTitle: titleMap.get(c.productId) ?? null })),
  })
}

export const createManualOrderHandler = asyncHandler(async (req, res) => {
  let order
  try {
    order = await createManualOrder(req.validated, req.admin)
  } catch (err) {
    if (err instanceof StockConflictError) return stockConflictResponse(res, err)
    throw err
  }

  await logActivity({
    actor: req.admin,
    action: 'ORDER_CREATED_MANUAL',
    resourceType: 'ORDER',
    resourceId: order.id,
    details: { orderNumber: order.orderNumber, source: order.source, status: order.status, total: order.total },
    req,
  })

  res.status(201).json({ success: true, data: order })
})

export const patchOrderStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف الطلب غير صحيح')
  }

  let order
  try {
    order = await updateOrderStatus(id, req.validated.status, req.admin?.id ?? null)
  } catch (err) {
    if (err instanceof StockConflictError) {
      const productIds = err.conflicts.map((c) => c.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, title: true },
      })
      const titleMap = new Map(products.map((p) => [p.id, p.title]))
      const enrichedConflicts = err.conflicts.map((c) => ({
        ...c,
        productTitle: titleMap.get(c.productId) ?? null,
      }))
      return res.status(409).json({
        success: false,
        code: 'STOCK_CONFLICT',
        message: 'لا يمكن تأكيد الطلب: المخزون غير كافٍ لبعض المنتجات',
        conflicts: enrichedConflicts,
      })
    }
    throw err
  }

  await logActivity({
    actor: req.admin,
    action: 'ORDER_STATUS_UPDATED',
    resourceType: 'ORDER',
    resourceId: id,
    details: { status: req.validated.status, orderNumber: order.orderNumber },
    req,
  })

  res.json({ success: true, data: order })
})

export const deleteOrderHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف الطلب غير صحيح')
  }
  const order = await deleteOrder(id)

  await logActivity({
    actor: req.admin,
    action: 'ORDER_DELETED',
    resourceType: 'ORDER',
    resourceId: id,
    details: {
      orderId: id,
      orderNumber: order.orderNumber,
      customerName: order.fullName,
      phone: order.phone,
      total: order.total,
      status: order.status,
    },
    req,
  })

  res.json({
    success: true,
    message: 'تم حذف الطلب بنجاح',
    orderNumber: order.orderNumber,
  })
})

// POST /admin/orders/:id/shipment/send — (re)send a confirmed order whose
// automatic dispatch failed (unknown city, courier down…).
export const sendShipmentHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return errorResponse(res, 400, 'INVALID_ID', 'معرف الطلب غير صحيح')

  const order = await getOrder(id)
  if (!['CONFIRMED', 'SHIPPING'].includes(order.status)) {
    return errorResponse(res, 409, 'NOT_CONFIRMED', 'أكّد الطلب أولاً قبل إرساله لشركة التوصيل')
  }
  if (order.shipment?.tracking) {
    return errorResponse(res, 409, 'ALREADY_SENT', 'الطلب أُرسل من قبل')
  }
  const provider = await shippingService.getActiveProvider()
  if (provider.id === 'manual') {
    return errorResponse(res, 409, 'NO_COURIER', 'اختر شركة التوصيل في إعدادات الشحن أولاً')
  }
  // The admin may correct a city the courier did not recognise.
  const newCity = typeof req.body?.city === 'string' ? req.body.city.trim() : ''
  if (newCity && newCity !== order.city) {
    if (!(await resolveCity(newCity))) {
      return errorResponse(res, 400, 'UNKNOWN_CITY', `المدينة «${newCity}» غير موجودة في لائحة DIGYLOG`)
    }
    await prisma.order.update({ where: { id }, data: { city: newCity } })
  }
  const shipment = await shippingService.onOrderStatusChange(order, 'CONFIRMED')

  await logActivity({
    actor: req.admin,
    action: 'ORDER_SHIPMENT_SENT',
    resourceType: 'ORDER',
    resourceId: id,
    details: { orderNumber: order.orderNumber, tracking: shipment?.tracking || null, error: shipment?.error || null, ...(newCity && newCity !== order.city ? { cityFrom: order.city, cityTo: newCity } : {}) },
    req,
  })
  res.json({ success: true, data: await getOrder(id) })
})

// POST /admin/orders/:id/shipment/sync — pull the courier's status now.
export const syncShipmentHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return errorResponse(res, 400, 'INVALID_ID', 'معرف الطلب غير صحيح')

  const order = await getOrder(id)
  if (!order.shipment?.tracking) return errorResponse(res, 409, 'NOT_SENT', 'الطلب لم يُرسل بعد')
  try {
    await syncShipment(order.shipment.tracking)
  } catch (err) {
    if (err instanceof DigylogError) return errorResponse(res, 502, 'COURIER_ERROR', err.message)
    throw err
  }
  res.json({ success: true, data: await getOrder(id) })
})
