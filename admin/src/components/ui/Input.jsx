import { useId } from 'react'

const baseField =
  'w-full rounded-lg border border-line bg-white dark:bg-ink-900 px-3 py-2 text-sm text-gray-900 dark:text-[#f2eefb] placeholder:text-gray-400 dark:placeholder:text-[#6f6488] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400'

export function Input({ label, hint, error, className = '', id, ...rest }) {
  const auto = useId()
  const fid = id || auto
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fid}>
      <input id={fid} className={`${baseField} ${error ? 'border-danger-400/60' : ''} ${className}`} {...rest} />
    </FieldShell>
  )
}

export function Textarea({ label, hint, error, className = '', id, rows = 4, ...rest }) {
  const auto = useId()
  const fid = id || auto
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fid}>
      <textarea id={fid} rows={rows} className={`${baseField} ${error ? 'border-danger-400/60' : ''} ${className}`} {...rest} />
    </FieldShell>
  )
}

export function Select({ label, hint, error, className = '', id, children, ...rest }) {
  const auto = useId()
  const fid = id || auto
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fid}>
      <select id={fid} className={`${baseField} ${error ? 'border-danger-400/60' : ''} ${className}`} {...rest}>
        {children}
      </select>
    </FieldShell>
  )
}

export function FieldShell({ label, hint, error, htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block">
      {label ? (
        <span className="mb-1.5 block text-xs font-medium text-[#c0b6d6]">{label}</span>
      ) : null}
      {children}
      {hint && !error ? <span className="mt-1 block text-[11px] text-[#8b80a8]">{hint}</span> : null}
      {error ? <span className="mt-1 block text-[11px] text-danger-400">{error}</span> : null}
    </label>
  )
}