import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  getAdminNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../services/admin/notification.service.js'

export const listNotifications = asyncHandler(async (req, res) => {
  const adminId = req.admin.id
  const { limit, cursor, unreadOnly } = req.query

  const result = await getAdminNotifications(adminId, {
    limit,
    cursor,
    unreadOnly: unreadOnly === 'true',
  })

  res.json({
    success: true,
    data: {
      items: result.items,
      unreadCount: result.unreadCount,
      totalCount: result.totalCount,
      nextCursor: result.nextCursor,
    },
  })
})

export const getUnreadNotificationsCount = asyncHandler(async (req, res) => {
  const adminId = req.admin.id
  const count = await getUnreadCount(adminId)
  res.json({ success: true, count })
})

export const markAsRead = asyncHandler(async (req, res) => {
  const adminId = req.admin.id
  const notificationId = Number(req.params.id)

  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف الإشعار غير صحيح')
  }

  const updated = await markNotificationAsRead(adminId, notificationId)
  if (!updated) {
    return errorResponse(res, 404, 'NOT_FOUND', 'الإشعار غير موجود')
  }

  res.json({ success: true, data: updated })
})

export const markAllAsRead = asyncHandler(async (req, res) => {
  const adminId = req.admin.id
  const result = await markAllNotificationsAsRead(adminId)
  res.json({ success: true, ...result })
})
