import { prisma } from '../../lib/prisma.js'

/**
 * Customer Shipping Calculator — Single source of truth for customer delivery pricing.
 *
 * Rules:
 * - Dynamic configuration loaded from database Settings:
 *   - shipping.enabled (default: true)
 *   - shipping.flat_fee (default: 25 DH)
 *   - shipping.free_enabled (default: false — OPTIONAL order-value threshold toggle)
 *   - shipping.free_threshold (default: 300 DH)
 *
 * ORDER-LEVEL SHIPPING RULES (evaluated in strict priority order):
 *
 * RULE 1: If shipping is globally disabled (shipping.enabled === false)
 *         → shipping = 0 DH
 *
 * RULE 2: If ANY product in the order has shippingMode === 'FREE'
 *         → entire order shipping = 0 DH (independent of threshold or subtotal)
 *
 * RULE 3: If order-value Free Shipping is ENABLED (free_enabled === true) AND subtotal >= freeThreshold
 *         → shipping = 0 DH
 *
 * RULE 4: Otherwise, if one or more products have shippingMode === 'CUSTOM'
 *         → shipping = MAX applicable customShipping amount ONCE (never multiplied by quantity or item count)
 *
 * RULE 5: Otherwise
 *         → shipping = global/default flatFee ONCE (never multiplied by quantity or item count)
 */

export const DEFAULT_FREE_SHIPPING_THRESHOLD = 300
export const DEFAULT_FLAT_SHIPPING_FEE = 25
export const DEFAULT_FREE_SHIPPING_ENABLED = false
export const DEFAULT_SHIPPING_ENABLED = true

let cachedConfig = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 30000 // 30 seconds in-memory cache for speed

/**
 * Clear the in-memory shipping config cache (called when settings are updated).
 */
export function invalidateShippingCache() {
  cachedConfig = null
  cacheTimestamp = 0
}

/**
 * Load shipping configuration from PostgreSQL settings table.
 * @returns {Promise<{ enabled: boolean, freeThreshold: number, flatFee: number, freeEnabled: boolean }>}
 */
export async function getShippingConfig() {
  const now = Date.now()
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig
  }

  const config = {
    enabled: DEFAULT_SHIPPING_ENABLED,
    freeThreshold: DEFAULT_FREE_SHIPPING_THRESHOLD,
    flatFee: DEFAULT_FLAT_SHIPPING_FEE,
    freeEnabled: DEFAULT_FREE_SHIPPING_ENABLED,
  }

  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['shipping.enabled', 'shipping.free_threshold', 'shipping.flat_fee', 'shipping.free_enabled'],
        },
      },
    })

    for (const setting of settings) {
      if (setting.key === 'shipping.enabled') {
        config.enabled = setting.value !== 'false'
      } else if (setting.key === 'shipping.free_threshold') {
        const val = parseInt(setting.value, 10)
        if (!isNaN(val) && val >= 0) config.freeThreshold = val
      } else if (setting.key === 'shipping.flat_fee') {
        const val = parseInt(setting.value, 10)
        if (!isNaN(val) && val >= 0) config.flatFee = val
      } else if (setting.key === 'shipping.free_enabled') {
        config.freeEnabled = setting.value === 'true'
      }
    }

    cachedConfig = config
    cacheTimestamp = now
  } catch {
    // If DB is temporarily unavailable, fall back to safe defaults
  }

  return config
}

/**
 * Synchronous calculation using given config or defaults (for backward compatibility).
 *
 * @param {number} subtotal
 * @param {Object} [options]
 * @param {number} [options.threshold]
 * @param {number} [options.flatFee]
 * @param {boolean} [options.freeEnabled]
 * @returns {number}
 */
export function calcShippingSync(
  subtotal,
  {
    threshold = DEFAULT_FREE_SHIPPING_THRESHOLD,
    flatFee = DEFAULT_FLAT_SHIPPING_FEE,
    freeEnabled = DEFAULT_FREE_SHIPPING_ENABLED,
  } = {}
) {
  if (typeof subtotal !== 'number' || isNaN(subtotal) || subtotal <= 0) {
    return 0
  }
  if (!freeEnabled) {
    return flatFee
  }
  return subtotal >= threshold ? 0 : flatFee
}

/**
 * Calculates customer shipping fee with full support for dynamic settings and product overrides.
 *
 * ORDER-LEVEL SHIPPING RULES (applied in strict priority order):
 *
 * Rule 1: If shipping is globally disabled (config.enabled === false) → 0 DH
 * Rule 2: If ANY item in cart has shippingMode === 'FREE' → 0 DH (entire order)
 * Rule 3: If order-value Free Shipping is ENABLED AND subtotal >= configured threshold → 0 DH
 * Rule 4: If one or more items have shippingMode === 'CUSTOM' → max(customShipping) ONCE
 * Rule 5: Otherwise → apply global default shipping price (flatFee) ONCE
 *
 * @param {number} subtotal - Subtotal in Moroccan Dirhams
 * @param {Array<{ shippingMode?: string|null, customShipping?: number|null }>} [productOverrides=[]]
 * @param {Object} [configOverride]
 * @returns {Promise<number>} Calculated shipping fee (ONCE per order)
 */
export async function calcShipping(subtotal, productOverrides = [], configOverride = null) {
  if (typeof subtotal !== 'number' || isNaN(subtotal) || subtotal <= 0) {
    return 0
  }

  const config = configOverride || (await getShippingConfig())

  // RULE 1: If shipping is globally disabled → 0 DH
  if (!config.enabled && config.enabled !== undefined) {
    return 0
  }

  // RULE 2: If ANY item in cart has 'FREE' shipping (case-insensitive) → 0 DH for entire order
  if (Array.isArray(productOverrides) && productOverrides.length > 0) {
    const hasFree = productOverrides.some((p) => {
      const mode = p.shippingMode
      return mode === 'free' || mode === 'FREE'
    })
    if (hasFree) {
      return 0
    }
  }

  // RULE 3: If order-value Free Shipping is ENABLED AND subtotal >= configured threshold → 0 DH
  if (config.freeEnabled && subtotal >= config.freeThreshold) {
    return 0
  }

  // RULE 4: If one or more items have 'CUSTOM' shipping → max(customShipping) ONCE
  if (Array.isArray(productOverrides) && productOverrides.length > 0) {
    const customItems = productOverrides.filter((p) => {
      const mode = p.shippingMode
      return (
        (mode === 'custom' || mode === 'CUSTOM') &&
        typeof p.customShipping === 'number' &&
        p.customShipping >= 0
      )
    })
    if (customItems.length > 0) {
      return Math.max(...customItems.map((p) => p.customShipping))
    }
  }

  // RULE 5: Apply global default shipping price (flatFee) ONCE
  return config.flatFee
}

/**
 * Detailed shipping price breakdown.
 *
 * @param {number} subtotal
 * @param {Array<{ shippingMode?: string|null, customShipping?: number|null }>} [productOverrides=[]]
 * @param {Object} [configOverride]
 * @returns {Promise<{ shipping: number, isFree: boolean, threshold: number, flatFee: number, amountNeededForFree: number, freeEnabled: boolean }>}
 */
export async function getShippingBreakdown(subtotal, productOverrides = [], configOverride = null) {
  const config = configOverride || (await getShippingConfig())
  const shipping = await calcShipping(subtotal, productOverrides, config)
  const isFree = shipping === 0
  const amountNeededForFree =
    config.freeEnabled && !isFree ? Math.max(0, config.freeThreshold - subtotal) : 0

  return {
    shipping,
    isFree,
    threshold: config.freeThreshold,
    flatFee: config.flatFee,
    freeEnabled: config.freeEnabled,
    amountNeededForFree,
  }
}
