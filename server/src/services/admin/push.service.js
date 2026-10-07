import webpush from 'web-push'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import { validateSubscriptionInput } from '../../utils/push-validator.js'

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
 * Check if a push subscription endpoint is registered and owned by the specified admin.
 */
export async function getSubscriptionStatus(adminId, endpoint) {
  if (!endpoint || typeof endpoint !== 'string') {
    return { isSubscribed: false, isOwner: false }
  }

  const sub = await prisma.adminPushSubscription.findUnique({
    where: { endpoint: endpoint.trim() },
    select: { id: true, adminId: true },
  })

  if (!sub) {
    return { isSubscribed: false, isOwner: false }
  }

  const isOwner = sub.adminId === adminId
  return {
    isSubscribed: isOwner,
    isOwner,
  }
}

/**
 * Save or update a push subscription for an admin user.
 * Atomic transaction ensures cross-admin ownership cannot be hijacked.
 * Catches Prisma P2002 race conditions cleanly.
 */
export async function saveSubscription(adminId, { endpoint, keys, userAgent }) {
  const validated = validateSubscriptionInput({ endpoint, keys, userAgent })

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.adminPushSubscription.findUnique({
        where: { endpoint: validated.endpoint },
      })

      if (existing) {
        if (existing.adminId !== adminId) {
          throw new ApiError(
            409,
            'SUBSCRIPTION_OWNERSHIP_CONFLICT',
            'معرف الاشتراك مرتبط بحساب إداري آخر. يرجى إلغاء الاشتراك من المتصفح أولاً'
          )
        }

        return tx.adminPushSubscription.update({
          where: { id: existing.id },
          data: {
            p256dh: validated.keys.p256dh,
            auth: validated.keys.auth,
            userAgent: validated.userAgent,
          },
        })
      }

      return tx.adminPushSubscription.create({
        data: {
          adminId,
          endpoint: validated.endpoint,
          p256dh: validated.keys.p256dh,
          auth: validated.keys.auth,
          userAgent: validated.userAgent,
        },
      })
    })
  } catch (err) {
    if (err instanceof ApiError) throw err
    // Handle Prisma unique constraint race condition gracefully (code P2002)
    if (err?.code === 'P2002') {
      const existing = await prisma.adminPushSubscription.findUnique({
        where: { endpoint: validated.endpoint },
      })
      if (existing && existing.adminId === adminId) {
        return prisma.adminPushSubscription.update({
          where: { id: existing.id },
          data: {
            p256dh: validated.keys.p256dh,
            auth: validated.keys.auth,
            userAgent: validated.userAgent,
          },
        })
      }
      throw new ApiError(
        409,
        'SUBSCRIPTION_OWNERSHIP_CONFLICT',
        'معرف الاشتراك مرتبط بحساب إداري آخر. يرجى إلغاء الاشتراك من المتصفح أولاً'
      )
    }
    throw err
  }
}

/**
 * Remove a push subscription by endpoint for a specific admin.
 * Only deletes if the subscription is owned by the authenticated admin.
 */
export async function removeSubscription(adminId, endpoint) {
  if (!endpoint || typeof endpoint !== 'string') {
    return { count: 0 }
  }

  return prisma.adminPushSubscription.deleteMany({
    where: {
      adminId,
      endpoint: endpoint.trim(),
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
 * Customer privacy is preserved: payload contains strictly generic text without PII.
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

        // Generic push notification payload strictly protecting customer privacy
        const payload = JSON.stringify({
          title: 'طلب جديد',
          body: 'وصل طلب جديد إلى أرين',
          icon: '/logo.png',
          badge: '/logo.png',
          tag: `new-order-${order.id}`,
          data: {
            url: `/orders/${order.id}`,
            orderId: order.id,
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
              // Ignore cleanup deletion error
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
