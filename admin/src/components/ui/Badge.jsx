export function StatusBadge({ kind, label }) {
  return (
    <span className={`status-pill status-${kind || 'neutral'}`}>
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
  )
}

export function Badge({ children, kind = 'neutral' }) {
  return <span className={`status-pill status-${kind}`}>{children}</span>
}