/**
 * BaseShippingProvider — Abstract contract for all shipping / delivery providers in Arine.
 *
 * Every concrete provider (Manual, DIGYLOG, Amana, CTM, etc.) implements this
 * interface. The rest of the application (Order creation, Checkout, Store, Admin)
 * communicates ONLY with ShippingService and never directly with provider-specific APIs.
 */
export class BaseShippingProvider {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique provider identifier (e.g. 'manual', 'digylog')
   * @param {string} options.name - Human-readable Arabic name
   * @param {string} options.description - Short description of the provider
   * @param {Array<string>} [options.capabilities] - Supported features
   */
  constructor({ id, name, description, capabilities = [] }) {
    if (!id || !name) {
      throw new Error('Shipping provider requires an id and a name')
    }
    this.id = id
    this.name = name
    this.description = description || ''
    this.capabilities = capabilities
  }

  /**
   * Indicates whether this provider has all required server-side credentials/configuration.
   * @returns {boolean}
   */
  isConfigured() {
    return false
  }

  /**
   * Validate destination address before attempting dispatch.
   * @param {Object} addressData - { city, address, phone, fullName }
   * @returns {Promise<{ valid: boolean, message?: string }>}
   */
  async validateAddress(_addressData) {
    return { valid: true }
  }

  /**
   * Dispatch an order for delivery.
   * @param {Object} order - Canonical order object from PostgreSQL
   * @returns {Promise<{ success: boolean, trackingNumber?: string, status: string, message: string }>}
   */
  async createShipment(_order) {
    throw new Error(`createShipment not implemented for provider ${this.id}`)
  }

  /**
   * Query real-time tracking status from the provider.
   * @param {string} _trackingNumber
   * @returns {Promise<{ status: string, history: Array<Object>, message?: string }>}
   */
  async trackShipment(_trackingNumber) {
    throw new Error(`trackShipment not implemented for provider ${this.id}`)
  }

  /**
   * Cancel a previously created shipment.
   * @param {string} _trackingNumber
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async cancelShipment(_trackingNumber) {
    throw new Error(`cancelShipment not implemented for provider ${this.id}`)
  }

  /**
   * Public / Admin-safe status summary (never leaks secrets or API keys).
   * @returns {Object}
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      isConfigured: this.isConfigured(),
      capabilities: this.capabilities,
    }
  }
}
