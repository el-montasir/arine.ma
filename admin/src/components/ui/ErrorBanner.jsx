import { AlertTriangle } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'

export default function ErrorBanner({ message, onDismiss }) {
  const { t } = useLanguage()
  if (!message) return null
  return (
    <div
      role="alert"
      className="mb-4 flex items-start justify-between gap-3 rounded-[10px] border border-[var(--red)]/30 bg-[var(--red-bg)] px-4 py-3 text-xs sm:text-sm text-[var(--red)] font-medium"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
      {onDismiss ? (
        <button onClick={onDismiss} className="shrink-0 font-bold hover:opacity-75 cursor-pointer" aria-label={t('close')}>
          ×
        </button>
      ) : null}
    </div>
  )
}
