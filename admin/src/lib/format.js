// Formatting helpers for the Admin Panel (Moroccan dirhams, Arabic dates).

export function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return `${Number(n).toLocaleString('en-US').replace(/,/g, ' ')} درهم`
}

export function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return Number(n).toLocaleString('en-US').replace(/,/g, ' ')
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ar-MA', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

export function formatDateShort(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ar-MA', { dateStyle: 'medium' }).format(d)
}

export function formatPercent(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return `${n}٪`
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
  pre_order: { label: 'طلب مسبق', color: 'status-info' },
}

export function orderStatus(status) {
  return ORDER_STATUS[status] || { label: status, color: 'status-neutral' }
}