// Shipping rule — the backend is the single source of truth.
// subtotal >= 300 DH → free shipping, otherwise a flat 25 DH fee.
export const FREE_SHIPPING_THRESHOLD = 300
export const FLAT_SHIPPING_FEE = 25

export function calcShipping(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE
}