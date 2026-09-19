import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  const ref = useRef(null)
  const { t } = useLanguage()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        className={`relative w-full ${width} rounded-xl border border-line bg-surface-900 shadow-2xl`}
      >
        <header className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="rounded-md p-1 text-[#8b80a8] transition-colors hover:bg-surface-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
