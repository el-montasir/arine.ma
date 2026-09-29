import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import { prisma } from '../../lib/prisma.js'
import {
  listOrders,
  getOrder,
  updateOrderStatus,
  deleteOrder,
  getPendingOrdersCount,
} from '../../services/admin/order.service.js'
import { StockConflictError } from '../../services/stock/stock.service.js'
import { logActivity } from '../../services/admin/activity-log.service.js'

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