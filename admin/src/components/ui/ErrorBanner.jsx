import { AlertTriangle } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'

// Inline error banner used across admin forms and data pages.
export default function ErrorBanner({ message, onDismiss }) {
  const { t } = useLanguage()
  if (!message) return null
  return (
    <div
      role="alert"
      className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-danger-400/30 bg-danger-400/10 px-4 py-3 text-sm text-danger-400"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
      {onDismiss ? (
        <button onClick={onDismiss} className="shrink-0 font-semibold hover:underline" aria-label={t('close')}>
          ×
        </button>
      ) : null}
    </div>
  )
}
