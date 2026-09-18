import { prisma } from '../../lib/prisma.js'
import { calcShipping, getShippingBreakdown, DEFAULT_FREE_SHIPPING_THRESHOLD, DEFAULT_FLAT_SHIPPING_FEE } from './shipping-calculator.js'
import { ManualShippingProvider } from './providers/manual.provider.js'
import { DigylogShippingProvider } from './providers/digylog.provider.js'

export const SETTING_KEY_ACTIVE_PROVIDER = 'shipping.active_provider'
export const DEFAULT_PROVIDER_ID = 'manual'

/**
 * ShippingService — Central shipping manager and facade for Arine.
 *
 * Decouples all store and order business logic from delivery providers.
 * Allows swapping providers at runtime or via configuration without touching
 * the Order system, database models, or Store frontend.
 */
export class ShippingService {
  constructor() {
    /** @type {Map<string, import('./base-provider.js').BaseShippingProvider>} */
    this.providers = new Map()

    // Register standard out-of-the-box providers
    this.registerProvider(new ManualShippingProvider())
    this.registerProvider(new DigylogShippingProvider())
  }

  /**
   * Register a new shipping provider implementation into the system.
   * @param {import('./base-provider.js').BaseShippingProvider} provider
   */
  registerProvider(provider) {
    if (!provider || !provider.id) {
      throw new Error('Cannot register provider without a valid id')
    }
    this.providers.set(provider.id, provider)
  }

  /**
   * Calculate customer-facing shipping fee (Free >= 300 DH, otherwise 25 DH).
   * @param {number} subtotal
   * @returns {number}
   */
  calculateCustomerShipping(subtotal) {
    return calcShipping(subtotal)
  }

  /**
   * Get detailed shipping price breakdown.
   * @param {number} subtotal
   * @returns {Object}
   */
  getCustomerShippingBreakdown(subtotal) {
    return getShippingBreakdown(subtotal)
  }

  /**
   * Get the ID of the currently active shipping provider.
   * Checks database Setting first, then environment variable, then defaults to 'manual'.
   * @returns {Promise<string>}
   */
  async getActiveProviderId() {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: SETTING_KEY_ACTIVE_PROVIDER },
      })
      if (setting && setting.value && this.providers.has(setting.value)) {
        return setting.value
      }
    } catch {
      /* fallback to env or default if database is temporarily unavailable */
    }

    const envProvider = process.env.SHIPPING_PROVIDER
    if (envProvider && this.providers.has(envProvider)) {
      return envProvider
    }

    return DEFAULT_PROVIDER_ID
  }

  /**
   * Get the active provider instance.
   * @returns {Promise<import('./base-provider.js').BaseShippingProvider>}
   */
  async getActiveProvider() {
    const activeId = await this.getActiveProviderId()
    return this.providers.get(activeId) || this.providers.get(DEFAULT_PROVIDER_ID)
  }

  /**
   * Change the active delivery provider in the database settings.
   * @param {string} providerId
   * @returns {Promise<{ success: boolean, activeProvider: Object }>}
   */
  async setActiveProvider(providerId) {
    if (!this.providers.has(providerId)) {
      throw new Error(`مزود التوصيل «${providerId}» غير مسجل في النظام`)
    }

    await prisma.setting.upsert({
      where: { key: SETTING_KEY_ACTIVE_PROVIDER },
      update: { value: providerId, updatedAt: new Date() },
      create: { key: SETTING_KEY_ACTIVE_PROVIDER, value: providerId },
    })

    const provider = this.providers.get(providerId)
    return {
      success: true,
      activeProvider: provider.getStatus(),
    }
  }

  /**
   * Returns sanitized metadata for all registered providers (Admin-safe, no secrets).
   * @returns {Promise<Array<Object>>}
   */
  async getAvailableProviders() {
    const activeId = await this.getActiveProviderId()
    const result = []

    for (const [id, provider] of this.providers.entries()) {
      result.push({
        ...provider.getStatus(),
        isActive: id === activeId,
      })
    }

    return result
  }

  /**
   * Overview of shipping subsystem status for Admin Dashboard & Settings.
   * @returns {Promise<Object>}
   */
  async getShippingOverview() {
    const activeProvider = await this.getActiveProvider()
    const providers = await this.getAvailableProviders()

    return {
      activeProvider: {
        id: activeProvider.id,
        name: activeProvider.name,
        description: activeProvider.description,
        isConfigured: activeProvider.isConfigured(),
        status: activeProvider.getStatus(),
      },
      pricingRules: {
        freeShippingThreshold: DEFAULT_FREE_SHIPPING_THRESHOLD,
        standardFee: DEFAULT_FLAT_SHIPPING_FEE,
        currency: 'MAD',
      },
      registeredProviders: providers,
    }
  }

  /**
   * Hook called when an order status changes (e.g. from PENDING to CONFIRMED or SHIPPING).
   * Delegates dispatch to the active shipping provider.
   *
   * @param {Object} order
   * @param {string} newStatus
   * @returns {Promise<Object>}
   */
  async onOrderStatusChange(order, newStatus) {
    if (newStatus === 'CONFIRMED' || newStatus === 'SHIPPING') {
      const activeProvider = await this.getActiveProvider()
      try {
        const dispatchResult = await activeProvider.createShipment(order)
        return {
          providerId: activeProvider.id,
          providerName: activeProvider.name,
          dispatchResult,
        }
      } catch (err) {
        return {
          providerId: activeProvider.id,
          providerName: activeProvider.name,
          dispatchResult: {
            success: false,
            message: err.message || 'حدث خطأ أثناء الاتصال بمزود التوصيل',
          },
        }
      }
    }
    return null
  }
}

// Singleton instance used across the backend
export const shippingService = new ShippingService()
