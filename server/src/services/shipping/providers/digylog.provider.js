import { BaseShippingProvider } from '../base-provider.js'
import { createParcel, getParcel, resolveCity, isDigylogConfigured } from '../digylog.client.js'

/**
 * DigylogShippingProvider — Provider module for DIGYLOG delivery service (Morocco).
 *
 * Configuration lives in server env vars (see digylog.client.js). Without
 * DIGYLOG_API_KEY the provider reports NOT CONFIGURED and sends nothing.
 */
export class DigylogShippingProvider extends BaseShippingProvider {
  constructor() {
    super({
      id: 'digylog',
      name: 'شركة DIGYLOG للتوصيل',
      description: 'خدمة التوصيل السريع عبر منصة DIGYLOG المغربية',
      capabilities: ['api_dispatch', 'tracking_api', 'cash_on_delivery_collect'],
    })
  }

  isConfigured() {
    return isDigylogConfigured()
  }

  async validateAddress(addressData) {
    if (!addressData.city || !addressData.address || !addressData.phone) {
      return { valid: false, message: 'بيانات التوصيل غير مكتملة' }
    }
    return { valid: true }
  }

  /**
   * Sends the order to DIGYLOG. Expects the order with items + packageItems.
   * Returns { success, tracking, costCents, city } or { success: false, message }.
   */
  async createShipment(order) {
    if (!this.isConfigured()) {
      return { success: false, status: 'NOT_CONFIGURED', message: 'خدمة DIGYLOG غير مفعلة — DIGYLOG_API_KEY غير مضبوط' }
    }
    const city = await resolveCity(order.city)
    if (!city) {
      return { success: false, status: 'UNKNOWN_CITY', message: `المدينة «${order.city}» غير موجودة في لائحة DIGYLOG` }
    }
    const refs = [
      ...(order.items || []).map((i) => ({ designation: i.productTitle, quantity: i.quantity })),
      ...(order.packageItems || []).map((i) => ({ designation: `باقة: ${i.packageTitle}`, quantity: i.quantity })),
    ]
    try {
      const { tracking, costCents, statusId, statusLabel } = await createParcel({
        num: order.orderNumber,
        name: order.fullName,
        phone: order.phone,
        address: order.address || order.city,
        cityId: city.id,
        price: order.total,
        note: order.note || '',
        refs,
      })
      return { success: true, tracking, costCents, statusId, statusLabel, city: city.name }
    } catch (err) {
      return { success: false, status: 'API_ERROR', message: err.message }
    }
  }

  async trackShipment(trackingNumber) {
    return getParcel(trackingNumber)
  }

  // Cancelling a sent parcel goes through a DIGYLOG complaint; not automated.
  async cancelShipment(trackingNumber) {
    return {
      success: false,
      trackingNumber,
      message: 'إلغاء الشحنة يتم من لوحة DIGYLOG',
    }
  }

  getStatus() {
    return {
      ...super.getStatus(),
      mode: 'api',
      isConnected: this.isConfigured(),
      statusLabel: this.isConfigured()
        ? 'متصل ومفعل (API)'
        : 'غير متصل (بانتظار مفاتيح الربط DIGYLOG_API_KEY)',
    }
  }
}
