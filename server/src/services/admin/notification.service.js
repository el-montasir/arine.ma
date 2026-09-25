import { prisma } from '../../lib/prisma.js'

/**
 * Get notifications for a specific admin with optional pagination.
 */
export async function getAdminNotifications(adminId, { limit = 20, cursor = null, unreadOnly = false } = {}) {
  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100)

  const where = {
    adminId,
    ...(unreadOnly ? { isRead: false } : {}),
  }

  const [notifications, unreadCount, totalCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      take: parsedLimit,
      ...(cursor ? { skip: 1, cursor: { id: Number(cursor) } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            fullName: true,
            phone: true,
            city: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.notification.count({
      where: {
        adminId,
        isRead: false,
      },
    }),
    prisma.notification.count({
      where: {
        adminId,
      },
    }),
  ])

  return {
    items: notifications,
    unreadCount,
    totalCount,
    nextCursor: notifications.length === parsedLimit ? notifications[notifications.length - 1].id : null,
  }
}

/**
 * Get unread notification count for an admin.
 */
export async function getUnreadCount(adminId) {
  const count = await prisma.notification.count({
    where: {
      adminId,
      isRead: false,
    },
  })
  return count
}

/**
 * Mark a single notification as read for an admin.
 */
export async function markNotificationAsRead(adminId, notificationId) {
  const id = Number(notificationId)
  if (isNaN(id)) return null

  const notification = await prisma.notification.findFirst({
    where: { id, adminId },
  })

  if (!notification) return null

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          fullName: true,
          phone: true,
          city: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
    },
  })

  return updated
}

/**
 * Mark all notifications as read for an admin.
 */
export async function markAllNotificationsAsRead(adminId) {
  const result = await prisma.notification.updateMany({
    where: {
      adminId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  })

  return { updatedCount: result.count }
}
