import { BaseShippingProvider } from '../base-provider.js'

/**
 * ManualShippingProvider — Default active delivery provider for Arine.
 *
 * Designed for local/in-house fulfillment where orders are confirmed by phone
 * and dispatched via local courier, in-person delivery, or manual parcel dispatch.
 * Requires no external API keys or third-party dependencies.
 */
export class ManualShippingProvider extends BaseShippingProvider {
  constructor() {
    super({
      id: 'manual',
      name: 'توصيل محلي / يدوي',
      description: 'إدارة وتوصيل الطلبات داخلياً والتأكيد مع العميل عبر الهاتف دون ربط خارجي',
      capabilities: ['manual_dispatch', 'phone_confirmation', 'cash_on_delivery'],
    })
  }

  isConfigured() {
    return true // Always ready out of the box
  }

  async validateAddress(addressData) {
    if (!addressData.city || !addressData.address || !addressData.phone) {
      return { valid: false, message: 'معلومات العنوان أو الهاتف غير مكتملة' }
    }
    return { valid: true }
  }

  async createShipment(order) {
    return {
      success: true,
      trackingNumber: order.orderNumber,
      status: 'MANUAL_PENDING',
      message: 'تم تسجيل الطلب للتوصيل اليدوي والتأكيد الهاتفي',
    }
  }

  async trackShipment(trackingNumber) {
    return {
      status: 'MANUAL_DISPATCH',
      history: [
        {
          timestamp: new Date().toISOString(),
          status: 'REGISTERED',
          label: 'تم تسجيل الطلب في نظام المكتبة',
        },
      ],
      trackingNumber,
      message: 'التوصيل يُدار يدوياً من قِبل إدارة المكتبة',
    }
  }

  async cancelShipment(trackingNumber) {
    return {
      success: true,
      trackingNumber,
      message: 'تم إلغاء التوصيل اليدوي للطلب',
    }
  }

  getStatus() {
    return {
      ...super.getStatus(),
      mode: 'manual',
      isConnected: true,
      statusLabel: 'نشط ومفعل (إدارة داخلية)',
    }
  }
}
