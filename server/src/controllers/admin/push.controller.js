import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  getUnseenOrderCount,
} from '../../services/admin/push.service.js'

/**
 * Get VAPID public key to initialize PushManager subscription in Admin client.
 */
export const getPublicKey = asyncHandler(async (req, res) => {
  const data = getVapidPublicKey()
  res.json({
    success: true,
    data,
  })
})

/**
 * Register or update push subscription for current authenticated admin.
 */
export const subscribe = asyncHandler(async (req, res) => {
  const adminId = req.admin.id
  const { endpoint, keys, userAgent } = req.body || {}

  if (!endpoint || typeof endpoint !== 'string') {
    return errorResponse(res, 400, 'INVALID_SUBSCRIPTION', 'معرف الاشتراك (endpoint) مطلوب')
  }

  if (!keys || !keys.p256dh || !keys.auth) {
    return errorResponse(res, 400, 'INVALID_KEYS', 'مفاتيح التشفير (p256dh, auth) مطلوبة')
  }

  const subscription = await saveSubscription(adminId, {
    endpoint,
    keys,
    userAgent: userAgent || req.headers['user-agent'] || null,
  })

  res.json({
    success: true,
    message: 'تم حفظ اشتراك الإشعارات بنجاح',
    data: {
      id: subscription.id,
      endpoint: subscription.endpoint,
    },
  })
})

/**
 * Unsubscribe push subscription for current authenticated admin.
 */
export const unsubscribe = asyncHandler(async (req, res) => {
  const adminId = req.admin.id
  const { endpoint } = req.body || {}

  if (!endpoint || typeof endpoint !== 'string') {
    return errorResponse(res, 400, 'INVALID_ENDPOINT', 'معرف الاشتراك مطلوب')
  }

  await removeSubscription(adminId, endpoint)

  res.json({
    success: true,
    message: 'تم إلغاء اشتراك الإشعارات بنجاح',
  })
})

/**
 * Fetch current unseen NEW_ORDER badge count for current admin.
 */
export const getUnseenCount = asyncHandler(async (req, res) => {
  const adminId = req.admin.id
  const count = await getUnseenOrderCount(adminId)

  res.json({
    success: true,
    data: {
      count,
    },
  })
})
