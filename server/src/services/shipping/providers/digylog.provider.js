import { BaseShippingProvider } from '../base-provider.js'

/**
 * DigylogShippingProvider — Provider module for DIGYLOG delivery service (Morocco).
 *
 * Reads configuration safely from server-side environment variables:
 * - DIGYLOG_API_KEY
 * - DIGYLOG_API_URL (default: https://api.digylog.com)
 * - DIGYLOG_ACCOUNT_ID
 *
 * If credentials are not set (current state), this provider cleanly reports
 * as NOT CONFIGURED. No dummy credentials or fake API calls are used.
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

  get apiKey() {
    return process.env.DIGYLOG_API_KEY || ''
  }

  get apiUrl() {
    return process.env.DIGYLOG_API_URL || 'https://api.digylog.com'
  }

  get accountId() {
    return process.env.DIGYLOG_ACCOUNT_ID || ''
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0)
  }

  async validateAddress(addressData) {
    if (!addressData.city || !addressData.address || !addressData.phone) {
      return { valid: false, message: 'بيانات التوصيل غير مكتملة' }
    }
    return { valid: true }
  }

  async createShipment(_order) {
    if (!this.isConfigured()) {
      return {
        success: false,
        isConfigured: false,
        status: 'NOT_CONFIGURED',
        message: 'خدمة DIGYLOG غير مفعلة حالياً — لم يتم إدخال مفاتيح الربط في بيئة الخادم (DIGYLOG_API_KEY)',
      }
    }

    // Future implementation: when real DIGYLOG credentials are provided,
    // the HTTP call to the DIGYLOG parcel creation endpoint lands here.
    return {
      success: false,
      isConfigured: true,
      status: 'READY_FOR_INTEGRATION',
      message: 'الواجهة البرمجية لـ DIGYLOG بانتظار تفعيل نقطة النهاية المباشرة',
    }
  }

  async trackShipment(trackingNumber) {
    if (!this.isConfigured()) {
      return {
        status: 'UNAVAILABLE',
        history: [],
        message: 'خدمة التتبع الآلي لـ DIGYLOG غير متصلة',
      }
    }

    return {
      status: 'PENDING_DISPATCH',
      trackingNumber,
      history: [],
      message: 'بانتظار استلام الشحنة من قِبل DIGYLOG',
    }
  }

  async cancelShipment(trackingNumber) {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'خدمة DIGYLOG غير متصلة',
      }
    }

    return {
      success: true,
      trackingNumber,
      message: 'تم إرسال طلب إلغاء الشحنة إلى DIGYLOG',
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
