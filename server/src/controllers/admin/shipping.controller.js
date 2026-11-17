import { getCities } from '../../services/shipping/digylog.client.js'
import { prisma } from '../../lib/prisma.js'
import {
  shippingService,
  getShippingConfig,
  invalidateShippingCache,
} from '../../services/shipping/index.js'
import { ApiError } from '../../utils/api-error.js'
import { logActivity } from '../../services/admin/activity-log.service.js'

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
    const { enabled, freeThreshold, flatFee, freeEnabled, cityPrices } = req.body

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

    if (cityPrices !== undefined) {
      // { "FES": 20 } — DIGYLOG city name → whole-dirham price.
      const valid =
        cityPrices && typeof cityPrices === 'object' && !Array.isArray(cityPrices) &&
        Object.keys(cityPrices).length <= 200 &&
        Object.entries(cityPrices).every(([k, v]) => /^[^\u0000-\u001f]{1,80}$/.test(k) && Number.isInteger(v) && v >= 0 && v <= 10000)
      if (!valid) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'أسعار المدن غير صحيحة' } })
      }
      const value = JSON.stringify(cityPrices)
      updates.push(
        prisma.setting.upsert({
          where: { key: 'shipping.city_prices' },
          update: { value },
          create: { key: 'shipping.city_prices', value },
        })
      )
    }

    await prisma.$transaction(updates)
    invalidateShippingCache()

    const updatedConfig = await getShippingConfig()

    await logActivity({
      actor: req.admin,
      action: 'SHIPPING_CONFIG_UPDATED',
      resourceType: 'SHIPPING',
      details: { flatFee, freeThreshold, enabled, freeEnabled, cityPrices },
      req,
    })

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

// GET /api/admin/shipping/cities — DIGYLOG cities for the city-price picker.
export async function getShippingCitiesHandler(_req, res, next) {
  try {
    const cities = await getCities()
    return res.json({ success: true, data: cities.map((c) => ({ name: c.name, nameAr: c.nameAr })) })
  } catch (err) {
    next(err)
  }
}
