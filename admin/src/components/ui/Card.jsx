export function Card({ children, className = '', padded = true }) {
  return (
    <div className={`rounded-xl border border-line bg-surface-900 ${padded ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-main">{title}</h1>
        {subtitle ? <p className="mt-1 text-xs text-text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function StatCard({ label, value, sub, tone = 'default' }) {
  const tones = {
    default: 'text-text-main',
    brand: 'text-brand-600 dark:text-brand-400',
    ok: 'text-emerald-600 dark:text-ok-400',
    warn: 'text-amber-600 dark:text-warn-400',
    danger: 'text-rose-600 dark:text-danger-400',
    info: 'text-sky-600 dark:text-info-400',
  }
  return (
    <Card className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span className={`text-2xl font-bold tracking-tight tabular-nums ${tones[tone] || tones.default}`}>{value}</span>
      {sub ? <span className="text-[11px] font-medium text-text-subtle">{sub}</span> : null}
    </Card>
  )
}