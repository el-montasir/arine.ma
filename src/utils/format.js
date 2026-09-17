export function formatPrice(price) {
  return new Intl.NumberFormat('ar-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(price)
}

export function percentOff(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return 0
  return Math.round(((oldPrice - price) / oldPrice) * 100)
}