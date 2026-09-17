export function Card({ children, className = '', padded = true }) {
  return (
    <div className={`rounded-xl border border-line-soft bg-surface-900 ${padded ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[#8b80a8]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function StatCard({ label, value, sub, tone = 'default' }) {
  const tones = {
    default: 'text-white',
    brand: 'text-brand-400',
    ok: 'text-ok-400',
    warn: 'text-warn-400',
    danger: 'text-danger-400',
  }
  return (
    <Card className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[#8b80a8]">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${tones[tone]}`}>{value}</span>
      {sub ? <span className="text-[11px] text-[#6f6488]">{sub}</span> : null}
    </Card>
  )
}