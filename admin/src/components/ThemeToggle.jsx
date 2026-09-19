import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-900 px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-800 hover:text-text-main ${className}`}
      title={isDark ? t('lightTheme') : t('darkTheme')}
      aria-label={isDark ? t('lightTheme') : t('darkTheme')}
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4 text-amber-500" />
          <span className="hidden sm:inline">{t('lightTheme')}</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-brand-600" />
          <span className="hidden sm:inline">{t('darkTheme')}</span>
        </>
      )}
    </button>
  )
}
