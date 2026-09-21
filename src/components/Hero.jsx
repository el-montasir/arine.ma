import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function Hero({ onExplore, onBestsellers, heroConfig }) {
  const { t, isRTL } = useLanguage()

  const badge = heroConfig?.badge || t('appName') + ' — ' + t('appTagline')
  const title = heroConfig?.title || (isRTL ? 'اكتشف كتابك القادم' : t('appTagline'))
  const subtitle =
    heroConfig?.subtitle ||
    (isRTL
      ? 'مجموعة مختارة من الكتب الشرعية والمعرفية لعشاق القراءة وطلب العلم.'
      : t('footerAbout'))
  const statBooks = heroConfig?.statBooks || t('statBooksDefault') || '30+'
  const statDelivery = heroConfig?.statDelivery || t('statDeliveryDefault') || '24h'
  const statCustomers = heroConfig?.statCustomers || t('statCustomersDefault') || '100+'

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  return (
    <section className="relative overflow-hidden pt-12 sm:pt-16 pb-10 sm:pb-12 text-center bg-[radial-gradient(circle_at_50%_-10%,#f3ebfa,transparent_60%)]">
      {/* Decorative 4-ring square frame on desktop */}
      <div
        className="hidden lg:block absolute top-[20%] w-[260px] h-[260px] pointer-events-none select-none -z-0"
        style={{ insetInlineEnd: '6%' }}
      >
        <div className="absolute inset-0 rounded-[22px] border-[1.5px] border-[#8b2f9e]/[0.18]" />
        <div className="absolute inset-[22px] rounded-[22px] border-[1.5px] border-[#8b2f9e]/[0.28]" />
        <div className="absolute inset-[44px] rounded-[22px] border-[1.5px] border-[#8b2f9e]/[0.40]" />
        <div className="absolute inset-[66px] rounded-[22px] border-[1.5px] border-[#8b2f9e]/[0.55]" />
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#8b2f9e] bg-[#f3ebfa] px-4 sm:px-5 py-2 rounded-full mb-5 sm:mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#8b2f9e]" />
            <span>{badge}</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-tajawal font-extrabold text-3xl sm:text-5xl lg:text-[46px] text-[#161616] leading-[1.25] tracking-tight mb-4">
            {title}
          </h1>

          {/* Subtitle */}
          <p className="text-[#6b6577] text-sm sm:text-[15.5px] max-w-[560px] mx-auto leading-relaxed sm:leading-[1.9] mb-8 sm:mb-9">
            {subtitle}
          </p>

          {/* Call-to-action buttons */}
          <div className="flex items-center justify-center gap-3 sm:gap-3.5 flex-wrap mb-10 sm:mb-11">
            <button
              onClick={onExplore}
              className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 bg-gradient-to-r from-[#8b2f9e] to-[#4c1660] hover:from-[#7c288d] hover:to-[#3e1150] text-white text-[14.5px] font-bold rounded-[13px] transition-all duration-200 shadow-lg shadow-[#8b2f9e]/30 hover:shadow-xl hover:shadow-[#8b2f9e]/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>{t('exploreBooks') || 'استكشف الكتب'}</span>
              <ArrowIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onBestsellers}
              className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 bg-white hover:bg-[#FAF9F7] border-[1.5px] border-[#ece5f2] text-[#161616] text-[14.5px] font-bold rounded-[13px] transition-all duration-200 hover:border-[#8b2f9e]/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>{t('bestsellers') || 'الأكثر مبيعاً'}</span>
            </button>
          </div>

          {/* Stats cards */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap max-w-lg mx-auto">
            {[
              { label: t('statBooksLabel') || 'كتاب', value: statBooks },
              { label: t('statDeliveryLabel') || 'توصيل سريع', value: statDelivery },
              { label: t('statCustomersLabel') || 'عملاء راضون', value: statCustomers },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white border border-[#ece5f2] rounded-2xl py-3.5 sm:py-4 px-5 sm:px-7 min-w-[120px] sm:min-w-[140px] text-center shadow-[0_12px_26px_-18px_rgba(76,22,96,0.2)]"
              >
                <div className="font-tajawal font-extrabold text-xl sm:text-2xl text-[#8b2f9e] leading-none mb-1">
                  {stat.value}
                </div>
                <div className="text-[12px] sm:text-[12.5px] text-[#6b6577] font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
