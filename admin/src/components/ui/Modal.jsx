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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        className={`relative w-full ${width} rounded-[16px] border border-[var(--line)] bg-[var(--card)] shadow-2xl overflow-hidden`}
      >
        <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-sm font-bold text-[var(--ink)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--card)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
