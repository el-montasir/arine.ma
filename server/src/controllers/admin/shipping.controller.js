import { prisma } from '../../lib/prisma.js'
import {
  shippingService,
  getShippingConfig,
  invalidateShippingCache,
} from '../../services/shipping/index.js'
import { ApiError } from '../../utils/api-error.js'

// GET /api/admin/shipping/status
export async function getShippingStatusHandler(_req, res, next) {
  try {
    const overview = await shippingService.getShippingOverview()
    const config = await getShippingConfig()
    return res.json({
      success: true,
      data: {
        ...overview,
        pricingRules: {
          enabled: config.enabled ?? true,
          freeShippingThreshold: config.freeThreshold,
          standardFee: config.flatFee,
          freeShippingEnabled: config.freeEnabled,
          currency: 'MAD',
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/shipping/config
export async function getShippingConfigHandler(_req, res, next) {
  try {
    const config = await getShippingConfig()
    return res.json({ success: true, data: config })
  } catch (err) {
    next(err)
  }
}

// PUT /api/admin/shipping/config
export async function updateShippingConfigHandler(req, res, next) {
  try {
    const { enabled, freeThreshold, flatFee, freeEnabled } = req.body

    const updates = []

    if (enabled !== undefined) {
      const val = Boolean(enabled)
      updates.push(
        prisma.setting.upsert({
          where: { key: 'shipping.enabled' },
          update: { value: String(val) },
          create: { key: 'shipping.enabled', value: String(val) },
        })
      )
    }

    if (freeThreshold !== undefined) {
      const val = Number(freeThreshold)
      if (isNaN(val) || val < 0) {
        throw new ApiError(400, 'INVALID_INPUT', 'حد التوصيل المجاني يجب أن يكون رقماً موجباً')
      }
      updates.push(
        prisma.setting.upsert({
          where: { key: 'shipping.free_threshold' },
          update: { value: String(Math.round(val)) },
          create: { key: 'shipping.free_threshold', value: String(Math.round(val)) },
        })
      )
    }

    if (flatFee !== undefined) {
      const val = Number(flatFee)
      if (isNaN(val) || val < 0) {
        throw new ApiError(400, 'INVALID_INPUT', 'سعر التوصيل الافتراضي يجب أن يكون رقماً موجباً')
      }
      updates.push(
        prisma.setting.upsert({
          where: { key: 'shipping.flat_fee' },
          update: { value: String(Math.round(val)) },
          create: { key: 'shipping.flat_fee', value: String(Math.round(val)) },
        })
      )
    }

    if (freeEnabled !== undefined) {
      const val = Boolean(freeEnabled)
      updates.push(
        prisma.setting.upsert({
          where: { key: 'shipping.free_enabled' },
          update: { value: String(val) },
          create: { key: 'shipping.free_enabled', value: String(val) },
        })
      )
    }

    await prisma.$transaction(updates)
    invalidateShippingCache()

    const updatedConfig = await getShippingConfig()
    return res.json({
      success: true,
      message: 'تم حفظ إعدادات التوصيل بنجاح',
      data: updatedConfig,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/shipping/providers
export async function getShippingProvidersHandler(_req, res, next) {
  try {
    const providers = await shippingService.getAvailableProviders()
    return res.json({ success: true, data: providers })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/shipping/active-provider
export async function setActiveProviderHandler(req, res, next) {
  try {
    const { providerId } = req.body
    if (!providerId || typeof providerId !== 'string') {
      throw new ApiError(400, 'INVALID_INPUT', 'معرف مزود التوصيل مطلوب')
    }

    const result = await shippingService.setActiveProvider(providerId.trim())
    return res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}
