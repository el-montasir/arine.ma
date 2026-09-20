import { Link } from 'react-router-dom'
import { Compass, ArrowLeft, ArrowRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function NotFound() {
  const { t, isRTL } = useLanguage()
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center mx-auto mb-4 text-brand-700 shadow-sm">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        {t('pageNotFound') || 'الصفحة غير موجودة'}
      </h1>
      <p className="text-sm text-muted max-w-md mx-auto mb-6">
        {t('pageNotFoundDesc') || 'تعذر العثور على الصفحة المطلوبة، ربما تم نقلها أو حذفها.'}
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
      >
        <span>{t('backToHome') || 'العودة للرئيسية'}</span>
        <ArrowIcon className="w-4 h-4" />
      </Link>
    </div>
  )
}
