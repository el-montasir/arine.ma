// Unique, human-readable order number: AR-YYYYMMDD-XXXX
// Collision safety is guaranteed by the `orderNumber` UNIQUE column plus a
// retry loop in the order service (P2002 → regenerate).
export function generateOrderNumber(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `AR-${y}${m}${d}-${rand}`
}