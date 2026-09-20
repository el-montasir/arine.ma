import { useState, useRef, useEffect } from 'react'
import { Globe, Check } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext.jsx'

const LANG_OPTIONS = [
  { code: 'ar', label: 'العربية', flag: '🇲🇦', dir: 'rtl' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
]

export default function LanguageSwitcher({ variant = 'dropdown' }) {
  const { language, setLanguage, t } = useLanguage()
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
      <div className="inline-flex rounded-[10px] border border-[var(--line)] bg-[var(--card)] p-1">
        {LANG_OPTIONS.map((opt) => {
          const active = opt.code === language
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code)}
              className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? 'bg-[var(--purple)] text-white shadow-sm font-semibold'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
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
        aria-label={t('secLanguage')}
        className="flex items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--ink)] transition-colors hover:bg-[var(--bg)] focus:outline-none"
      >
        <Globe className="h-4 w-4 text-[var(--purple)]" />
        <span className="flex items-center gap-1.5">
          <span>{currentOption.flag}</span>
          <span className="hidden sm:inline">{currentOption.label}</span>
        </span>
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-44 origin-top-right rounded-[12px] border border-[var(--line)] bg-[var(--card)] p-1.5 shadow-xl backdrop-blur-lg">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
            {t('secLanguage')}
          </div>
          <div className="mt-1 space-y-0.5">
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
                  className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[var(--purple-bg)] text-[var(--purple)] font-semibold'
                      : 'text-[var(--ink)] hover:bg-[var(--bg)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{opt.flag}</span>
                    <span>{opt.label}</span>
                  </span>
                  {active && <Check className="h-3.5 w-3.5 text-[var(--purple)]" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
