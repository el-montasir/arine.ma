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
      className={`w-9 h-9 rounded-[10px] border border-[var(--line)] bg-[var(--card)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer shrink-0 ${className}`}
      title={isDark ? t('lightTheme') : t('darkTheme')}
      aria-label={isDark ? t('lightTheme') : t('darkTheme')}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-500" />
      ) : (
        <Moon className="h-4 w-4 text-[var(--purple)]" />
      )}
    </button>
  )
}
