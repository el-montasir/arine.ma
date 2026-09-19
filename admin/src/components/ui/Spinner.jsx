export default function Spinner({ label }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-text-muted">
      <svg
        className="h-5 w-5 animate-spin text-brand-600 dark:text-brand-400"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label ? <span>{label}</span> : null}
    </div>
  )
}