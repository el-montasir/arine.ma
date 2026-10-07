import webpush from 'web-push'
import { prisma } from '../../lib/prisma.js'

let isVapidConfigured = false

/**
 * Configure VAPID details for web-push if environment variables are available.
 */
function ensureVapidConfigured() {
  if (isVapidConfigured) return true

  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@arine.ma'

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey)
      isVapidConfigured = true
      return true
    } catch (err) {
      console.error('[ADMIN_PUSH] Failed to configure VAPID details:', err.message)
      return false
    }
  }

  return false
}

/**
 * Return public VAPID key and configuration status.
 */
export function getVapidPublicKey() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || null
  const isConfigured = Boolean(publicKey && process.env.VAPID_PRIVATE_KEY)
  return { publicKey, isConfigured }
}

/**
 * Save or update a push subscription for an admin user.
 */
export async function saveSubscription(adminId, { endpoint, keys, userAgent }) {
  if (!endpoint || typeof endpoint !== 'string') {
    throw new Error('Push subscription endpoint is required')
  }
  if (!keys || !keys.p256dh || !keys.auth) {
    throw new Error('Push subscription p256dh and auth keys are required')
  }

  return prisma.adminPushSubscription.upsert({
    where: { endpoint },
    create: {
      adminId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent || null,
    },
    update: {
      adminId,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent || null,
    },
  })
}

/**
 * Remove a push subscription by endpoint for a specific admin.
 */
export async function removeSubscription(adminId, endpoint) {
  if (!endpoint) return { count: 0 }

  return prisma.adminPushSubscription.deleteMany({
    where: {
      adminId,
      endpoint,
    },
  })
}

/**
 * Query unseen NEW_ORDER notifications count for the authenticated administrator.
 * Strictly checks Notification table for type='NEW_ORDER' and isRead=false.
 */
export async function getUnseenOrderCount(adminId) {
  return prisma.notification.count({
    where: {
      adminId,
      type: 'NEW_ORDER',
      isRead: false,
    },
  })
}

/**
 * Post-order creation hook to dispatch background Web Push notifications and
 * updated unseen NEW_ORDER badge count to all subscribed active administrators.
 * This runs outside the DB transaction with safe error isolation.
 */
export async function sendOrderPushNotificationToAdmins({ order }) {
  try {
    if (!order || !order.id) {
      return
    }

    if (!ensureVapidConfigured()) {
      return
    }

    // Find all active subscriptions belonging to active admins
    const subscriptions = await prisma.adminPushSubscription.findMany({
      where: {
        admin: {
          isActive: true,
          status: 'ACTIVE',
        },
      },
      include: {
        admin: {
          select: { id: true },
        },
      },
    })

    if (!subscriptions || subscriptions.length === 0) {
      return
    }

    // Cache unread NEW_ORDER badge counts per admin ID
    const adminBadgeCounts = new Map()

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        let badgeCount = adminBadgeCounts.get(sub.adminId)
        if (badgeCount === undefined) {
          badgeCount = await getUnseenOrderCount(sub.adminId)
          adminBadgeCounts.set(sub.adminId, badgeCount)
        }

        const payload = JSON.stringify({
          title: 'طلب جديد',
          body: `طلب جديد رقم #${order.orderNumber} من ${order.fullName} (${order.city}) بقيمة ${order.total} د.م`,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: `new-order-${order.id}`,
          data: {
            url: `/orders/${order.id}`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            badgeCount,
            type: 'NEW_ORDER',
          },
        })

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        try {
          await webpush.sendNotification(pushSubscription, payload, {
            urgency: 'high',
            TTL: 86400, // 24 hours
          })
        } catch (err) {
          // If subscription has expired or unsubscribed, delete it from DB (410 Gone / 404 Not Found)
          if (err.statusCode === 410 || err.statusCode === 404) {
            try {
              await prisma.adminPushSubscription.delete({
                where: { id: sub.id },
              })
            } catch {
              // Ignore deletion error
            }
          }
          throw err
        }
      })
    )

    const rejected = results.filter((r) => r.status === 'rejected')
    if (rejected.length > 0) {
      console.warn(`[ADMIN_PUSH] ${rejected.length}/${subscriptions.length} push deliveries failed`)
    }
  } catch (err) {
    console.error('[ADMIN_PUSH] Unexpected error in sendOrderPushNotificationToAdmins:', err.message)
  }
}
