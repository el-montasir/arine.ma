import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function NotFound() {
  const { t } = useLanguage()

  return (
    <div className="app-bg flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-800 text-brand-400">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="text-lg font-semibold text-white">{t('pageNotFound')}</h1>
      <p className="text-sm text-[#8b80a8]">{t('pageNotFoundDesc')}</p>
      <Link to="/dashboard" className="mt-2">
        <Button variant="primary">{t('backToDashboard')}</Button>
      </Link>
    </div>
  )
}
