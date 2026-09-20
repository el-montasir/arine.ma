import { useId } from 'react'

const baseField =
  'w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3.5 py-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-soft)] transition-colors focus:border-[var(--purple)] focus:outline-none focus:ring-1 focus:ring-[var(--purple)]'

export function Input({ label, hint, error, className = '', id, ...rest }) {
  const auto = useId()
  const fid = id || auto
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fid}>
      <input id={fid} className={`${baseField} ${error ? 'border-[var(--red)]' : ''} ${className}`} {...rest} />
    </FieldShell>
  )
}

export function Textarea({ label, hint, error, className = '', id, rows = 4, ...rest }) {
  const auto = useId()
  const fid = id || auto
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fid}>
      <textarea id={fid} rows={rows} className={`${baseField} ${error ? 'border-[var(--red)]' : ''} ${className}`} {...rest} />
    </FieldShell>
  )
}

export function Select({ label, hint, error, className = '', id, children, ...rest }) {
  const auto = useId()
  const fid = id || auto
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fid}>
      <select id={fid} className={`${baseField} ${error ? 'border-[var(--red)]' : ''} ${className}`} {...rest}>
        {children}
      </select>
    </FieldShell>
  )
}

export function FieldShell({ label, hint, error, htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block">
      {label ? (
        <span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">{label}</span>
      ) : null}
      {children}
      {hint && !error ? <span className="mt-1 block text-[11px] text-[var(--ink-soft)]">{hint}</span> : null}
      {error ? <span className="mt-1 block text-[11px] text-[var(--red)]">{error}</span> : null}
    </label>
  )
}
