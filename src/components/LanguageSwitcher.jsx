import { useState, useRef, useEffect } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext.jsx'

const LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: '🇲🇦', dir: 'rtl' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
]

export default function LanguageSwitcher({ variant = 'dropdown', className = '' }) {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center rounded-xl bg-stone-100 p-1 dark:bg-stone-800 ${className}`}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              language === lang.code
                ? 'bg-white text-emerald-800 shadow-sm dark:bg-stone-900 dark:text-emerald-400'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={`relative inline-block text-start ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-xl border border-stone-200/80 bg-stone-50/80 px-2.5 py-1.5 text-xs font-medium text-stone-700 backdrop-blur-sm transition-all hover:border-emerald-500/40 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900/80 dark:text-stone-300 dark:hover:border-emerald-500/40 dark:hover:bg-stone-800"
      >
        <Globe className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
        <span className="font-semibold">{currentLang.flag}</span>
        <span className="hidden sm:inline font-medium">{currentLang.name}</span>
        <ChevronDown className={`h-3 w-3 text-stone-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute end-0 top-full mt-1.5 z-50 min-w-[140px] rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl backdrop-blur-md dark:border-stone-800 dark:bg-stone-900 animate-in fade-in zoom-in-95 duration-100"
        >
          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.code
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setLanguage(lang.code)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{lang.flag}</span>
                  <span>{lang.name}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
