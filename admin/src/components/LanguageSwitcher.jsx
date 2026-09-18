import { useState, useRef, useEffect } from 'react'
import { Globe, Check } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext.jsx'

const LANG_OPTIONS = [
  { code: 'ar', label: 'العربية', flag: '🇲🇦', dir: 'rtl' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
]

export default function LanguageSwitcher({ variant = 'dropdown' }) {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentOption = LANG_OPTIONS.find((l) => l.code === language) || LANG_OPTIONS[0]

  if (variant === 'segmented') {
    return (
      <div className="inline-flex rounded-xl border border-line bg-surface-900 p-1">
        {LANG_OPTIONS.map((opt) => {
          const active = opt.code === language
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main hover:bg-surface-800'
              }`}
            >
              <span>{opt.flag}</span>
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="تغيير اللغة / Change Language / Changer la langue"
        className="flex items-center gap-2 rounded-xl border border-line bg-surface-900 px-3 py-2 text-xs font-medium text-text-main transition-colors hover:border-brand-500/50 hover:bg-surface-800 focus:outline-none"
      >
        <Globe className="h-4 w-4 text-brand-400" />
        <span className="flex items-center gap-1.5">
          <span>{currentOption.flag}</span>
          <span className="hidden sm:inline">{currentOption.label}</span>
        </span>
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-44 origin-top-right rounded-xl border border-line bg-surface-900 p-1.5 shadow-xl backdrop-blur-lg">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            اللغة / Language
          </div>
          <div className="mt-1 space-y-1">
            {LANG_OPTIONS.map((opt) => {
              const active = opt.code === language
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => {
                    setLanguage(opt.code)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-brand-600/15 text-brand-400 font-semibold'
                      : 'text-text-main hover:bg-surface-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{opt.flag}</span>
                    <span>{opt.label}</span>
                  </span>
                  {active && <Check className="h-3.5 w-3.5 text-brand-400" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
