export function Card({ children, className = '', padded = true, style }) {
  return (
    <div
      style={style}
      className={`bg-[var(--card)] border border-[var(--line)] rounded-[16px] shadow-[var(--shadow)] ${
        padded ? 'p-5' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="text-[12px] text-[var(--ink-soft)] mb-1">
          Arine / <b className="text-[var(--ink)] font-semibold">{title}</b>
        </div>
        {subtitle ? <p className="text-xs text-[var(--ink-soft)] mt-0.5">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function StatCard({ label, value, sub, tone = 'default', icon: Icon }) {
  const tones = {
    default: 'text-[var(--ink)]',
    brand: 'text-[var(--purple)]',
    ok: 'text-[var(--green)]',
    warn: 'text-[var(--orange)]',
    danger: 'text-[var(--red)]',
    info: 'text-[var(--blue)]',
  }
  return (
    <Card className="flex flex-col justify-center gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--ink-soft)]">{label}</span>
        {Icon ? <Icon className={`h-4 w-4 ${tones[tone] || tones.default}`} /> : null}
      </div>
      <span className={`text-2xl font-bold tracking-tight tabular-nums ${tones[tone] || tones.default}`}>
        {value}
      </span>
      {sub ? <span className="text-[11px] font-medium text-[var(--ink-soft)]">{sub}</span> : null}
    </Card>
  )
}
