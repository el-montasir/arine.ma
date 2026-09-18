import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { translations } from '../i18n/translations.js'

const LanguageContext = createContext(null)

const SUPPORTED_LANGUAGES = ['ar', 'fr', 'en']
const STORAGE_KEY = 'arine_locale'

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
        return saved
      }
    } catch {
      // ignore localStorage errors
    }
    return 'ar'
  })

  const isRTL = language === 'ar'
  const dir = isRTL ? 'rtl' : 'ltr'

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // ignore localStorage errors
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
      document.documentElement.dir = dir

      if (isRTL) {
        document.documentElement.classList.add('font-arabic')
        document.documentElement.classList.remove('font-latin')
      } else {
        document.documentElement.classList.add('font-latin')
        document.documentElement.classList.remove('font-arabic')
      }
    }
  }, [language, dir, isRTL])

  const setLanguage = useCallback((newLang) => {
    if (SUPPORTED_LANGUAGES.includes(newLang)) {
      setLanguageState(newLang)
    }
  }, [])

  const t = useCallback(
    (key, params = {}) => {
      const currentDict = translations[language] || translations.ar
      let value = currentDict[key] ?? translations.ar[key] ?? key

      if (typeof value === 'string' && params && typeof params === 'object') {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          value = value.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue))
        })
      }

      return value
    },
    [language]
  )

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        dir,
        isRTL,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}
