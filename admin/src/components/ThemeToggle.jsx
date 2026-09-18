import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext.jsx'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-800/80 px-2.5 py-1.5 text-xs font-medium text-[#a79cc4] transition-colors hover:bg-surface-700 hover:text-white ${className}`}
      title={isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
      aria-label={isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4 text-amber-400" />
          <span className="hidden sm:inline">فاتح</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-brand-400" />
          <span className="hidden sm:inline">داكن</span>
        </>
      )}
    </button>
  )
}
