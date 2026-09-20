export function StatusBadge({ kind = 'neutral', label }) {
  const map = {
    warn: 'pending',
    pending: 'pending',
    ok: 'delivered',
    delivered: 'delivered',
    brand: 'confirmed',
    confirmed: 'confirmed',
    info: 'shipping',
    shipping: 'shipping',
    danger: 'cancelled',
    cancelled: 'cancelled',
    neutral: 'neutral',
  }
  const badgeClass = map[kind] || kind || 'neutral'

  return <span className={`badge ${badgeClass}`}>{label}</span>
}

export function Badge({ children, kind = 'neutral' }) {
  const map = {
    warn: 'pending',
    pending: 'pending',
    ok: 'delivered',
    delivered: 'delivered',
    brand: 'confirmed',
    confirmed: 'confirmed',
    info: 'shipping',
    shipping: 'shipping',
    danger: 'cancelled',
    cancelled: 'cancelled',
    neutral: 'neutral',
  }
  const badgeClass = map[kind] || kind || 'neutral'

  return <span className={`badge ${badgeClass}`}>{children}</span>
}
