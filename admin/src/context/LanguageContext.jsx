import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { translations } from '../i18n/translations.js'

const LanguageContext = createContext(null)

const STORAGE_KEY = 'arine_admin_lang'
const SUPPORTED_LANGS = ['ar', 'fr', 'en']

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && SUPPORTED_LANGS.includes(saved)) {
        return saved
      }
    } catch {
      // ignore
    }
    return 'ar' // default is Arabic
  })

  const isRTL = language === 'ar'
  const dir = isRTL ? 'rtl' : 'ltr'

  const setLanguage = useCallback((lang) => {
    if (!SUPPORTED_LANGS.includes(lang)) return
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore
    }
  }, [])

  // Sync with HTML root document
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = dir
    if (language === 'ar') {
      document.documentElement.classList.add('font-arabic')
      document.documentElement.classList.remove('font-latin')
    } else {
      document.documentElement.classList.add('font-latin')
      document.documentElement.classList.remove('font-arabic')
    }
  }, [language, dir])

  // Translation function
  const t = useCallback(
    (key, params = {}) => {
      const dict = translations[language] || translations.ar
      let val = dict[key] ?? translations.ar[key] ?? key

      if (typeof val === 'string' && params && typeof params === 'object') {
        Object.entries(params).forEach(([pKey, pVal]) => {
          val = val.replace(new RegExp(`{${pKey}}`, 'g'), String(pVal))
        })
      }
      return val
    },
    [language]
  )

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      dir,
      isRTL,
      t,
      supportedLangs: SUPPORTED_LANGS,
    }),
    [language, setLanguage, dir, isRTL, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}

export default LanguageContext
