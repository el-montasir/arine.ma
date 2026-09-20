// Formatting helpers for the Admin Panel (MAD / DH / dirhams, localized dates and numbers).

export function formatMoney(n, lang = 'ar') {
  if (n == null || Number.isNaN(n)) return '—'
  const currency = lang === 'en' ? 'MAD' : (lang === 'fr' ? 'DH' : 'درهم')
  return `${Number(n).toLocaleString('en-US').replace(/,/g, ' ')} ${currency}`
}

export function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return Number(n).toLocaleString('en-US').replace(/,/g, ' ')
}

export function formatDate(iso, lang = 'ar') {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const locale = lang === 'ar' ? 'ar-MA' : (lang === 'fr' ? 'fr-FR' : 'en-US')
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

export function formatDateShort(iso, lang = 'ar') {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const locale = lang === 'ar' ? 'ar-MA' : (lang === 'fr' ? 'fr-FR' : 'en-US')
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d)
}

export function formatPercent(n, lang = 'ar') {
  if (n == null || Number.isNaN(n)) return '—'
  return lang === 'ar' ? `${n}٪` : `${n}%`
}

export function formatBookCount(count, lang = 'ar') {
  const n = Number(count) || 0
  if (lang === 'fr') {
    return n <= 1 ? `${n} livre` : `${n} livres`
  }
  if (lang === 'en') {
    return n === 1 ? `${n} book` : `${n} books`
  }
  // Arabic rules
  if (n === 0) return '0 كتب'
  if (n === 1) return 'كتاب واحد'
  if (n === 2) return 'كتابان'
  if (n >= 3 && n <= 10) return `${n} كتب`
  return `${n} كتاباً`
}

export function getOrderStatus(status, t) {
  const map = {
    PENDING: { label: t ? t('statusPending') : 'قيد الانتظار', color: 'status-warn' },
    CONFIRMED: { label: t ? t('statusConfirmed') : 'مؤكد', color: 'status-brand' },
    SHIPPING: { label: t ? t('statusShipping') : 'قيد الشحن', color: 'status-info' },
    DELIVERED: { label: t ? t('statusDelivered') : 'تم التسليم', color: 'status-ok' },
    CANCELLED: { label: t ? t('statusCancelled') : 'ملغي', color: 'status-danger' },
  }
  return map[status] || { label: status, color: 'status-neutral' }
}

export function getAvailability(status, t) {
  const map = {
    'in-stock': { label: t ? t('inStock') : 'متوفر', color: 'status-ok' },
    'out-of-stock': { label: t ? t('outOfStock') : 'غير متوفر', color: 'status-danger' },
    'pre-order': { label: t ? t('preOrder') : 'طلب مسبق', color: 'status-info' },
  }
  return map[status] || { label: status, color: 'status-neutral' }
}

export function getPaymentLabel(method, t) {
  const map = {
    CASH_ON_DELIVERY: t ? t('cashOnDelivery') : 'الدفع عند الاستلام',
  }
  return map[method] || method
}

export const ORDER_STATUS = {
  PENDING: { label: 'قيد الانتظار', color: 'status-warn' },
  CONFIRMED: { label: 'مؤكد', color: 'status-brand' },
  SHIPPING: { label: 'قيد الشحن', color: 'status-info' },
  DELIVERED: { label: 'تم التسليم', color: 'status-ok' },
  CANCELLED: { label: 'ملغي', color: 'status-danger' },
}

export const PAYMENT_LABEL = {
  CASH_ON_DELIVERY: 'الدفع عند الاستلام',
}

export const AVAILABILITY = {
  'in-stock': { label: 'متوفر', color: 'status-ok' },
  'out-of-stock': { label: 'غير متوفر', color: 'status-danger' },
  'pre-order': { label: 'طلب مسبق', color: 'status-info' },
}

export function orderStatus(status, t) {
  if (t) return getOrderStatus(status, t)
  return ORDER_STATUS[status] || { label: status, color: 'status-neutral' }
}

/**
 * Format raw backend action strings (e.g., "action_CATEGORY_UPDATED", "USER_CREATED")
 * into clean, localized, or Title Case strings.
 */
export function formatActionString(action, lang = 'ar', t) {
  if (!action) return '—'
  const cleanKey = String(action).replace(/^action_/i, '')

  if (t) {
    const localized = t(`action_${cleanKey}`)
    if (localized && localized !== `action_${cleanKey}`) {
      return localized
    }
  }

  // Fallback to Title Case (e.g., "Category Updated")
  return cleanKey
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get semantic status pill styling class for an activity action.
 */
export function getActionStyle(action) {
  if (!action) return 'status-neutral'
  const act = String(action).toUpperCase()
  if (act.includes('SUCCESS') || act.includes('CREATED') || act.includes('ENABLED')) {
    return 'status-ok'
  }
  if (
    act.includes('FAILED') ||
    act.includes('BLOCKED') ||
    act.includes('DELETED') ||
    act.includes('DISABLED') ||
    act.includes('REVOKED') ||
    act.includes('CANCELLED')
  ) {
    return 'status-danger'
  }
  if (
    act.includes('UPDATED') ||
    act.includes('RESET') ||
    act.includes('CHANGED') ||
    act.includes('STATUS') ||
    act.includes('PERMISSIONS')
  ) {
    return 'status-brand'
  }
  if (act.includes('WARN') || act.includes('SUSPENDED')) {
    return 'status-warn'
  }
  if (act.includes('INFO') || act.includes('SHIPPING') || act.includes('VIEW')) {
    return 'status-info'
  }
  return 'status-neutral'
}

/**
 * Format raw backend resource strings (e.g. "ADMIN_USER", "STORE_CONFIG")
 * into clean, localized, or Title Case strings with optional resource ID.
 */
export function formatResourceString(resourceType, resourceId, lang = 'ar', t) {
  if (!resourceType) return '—'
  const cleanType = String(resourceType).replace(/^resource_/i, '')
  let typeLabel = cleanType

  if (t) {
    const localized = t(`resource_${cleanType}`)
    if (localized && localized !== `resource_${cleanType}`) {
      typeLabel = localized
    } else {
      typeLabel = cleanType
        .toLowerCase()
        .split('_')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
  } else {
    typeLabel = cleanType
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  if (resourceId != null && resourceId !== '') {
    return `${typeLabel} #${resourceId}`
  }
  return typeLabel
}

