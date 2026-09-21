import { MapPin, Phone, Mail, Clock, BookOpen, ShieldCheck, Zap, HeartHandshake, Sparkles } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useStoreConfig } from '../hooks/useStoreConfig'

export default function About() {
  const { t } = useLanguage()
  const { config } = useStoreConfig()

  const store = config?.store || {}
  const storeName = store.name || t('appName') || 'مكتبة أرين'
  const storeDesc = store.description || 'وصف جديد ومميز لمكتبة أرين الشرعية 2026'
  const address = store.address || 'المغرب، فاس، طريق نرجس'
  const phone = store.phone || '0665128821'
  const email = store.email || 'arine.ma00@gmail.com'
  const businessHours = store.businessHours || 'الإثنين - السبت: 09:00 ص - 20:00 م'

  const statBooks = config?.hero?.statBooks || '30+'
  const statCustomers = config?.hero?.statCustomers || '100+'
  const statDelivery = config?.hero?.statDelivery || '24h'
  const statSatisfaction = '95%+'

  const stats = [
    { value: statCustomers, label: 'عميل سعيد' },
    { value: statBooks, label: 'كتاب متاح' },
    { value: statSatisfaction, label: 'رضا العملاء' },
    { value: statDelivery, label: 'ساعة توصيل' },
  ]

  const values = [
    { title: 'المصداقية', desc: 'نضمن جودة الكتب ومصداقيتها وطبعاتها المعتمدة', icon: ShieldCheck },
    { title: 'السرعة', desc: 'توصيل سريع وموثوق في جميع أنحاء المملكة المغربية', icon: Zap },
    { title: 'الأمانة', desc: 'تعامل شفاف ودعم مستمر لخدمة القراء وطلاب العلم', icon: HeartHandshake },
    { title: 'الشغف', desc: 'شغف بالعلم ونشر المعرفة واختيار أفضل العناوين', icon: Sparkles },
  ]

  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-11 sm:py-14">
      {/* 1. Hero Section */}
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8b2f9e] bg-[#8b2f9e]/[0.08] px-3.5 py-1.5 rounded-full mb-3.5 shadow-2xs">
          <BookOpen className="w-3.5 h-3.5 text-[#8b2f9e]" />
          <span>{t('about') || 'من نحن'}</span>
        </span>
        <h1 className="font-tajawal font-extrabold text-3xl sm:text-4xl text-[#161616] tracking-tight mb-3">
          {storeName}
        </h1>
        <p className="text-[#6b6577] text-sm sm:text-[15px] max-w-[520px] mx-auto leading-[1.8]">
          {storeDesc}
        </p>
      </div>

      {/* 2. Main Story & Stats Layout (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center mb-16 sm:mb-20">
        {/* Right Panel in RTL: Story */}
        <div className="p-2 sm:p-2.5">
          <h2 className="font-tajawal font-extrabold text-2xl sm:text-[26px] text-[#161616] mb-4">
            قصتنا
          </h2>
          <div className="space-y-4 text-[#6b6577] text-sm sm:text-[14.5px] leading-[2]">
            <p>
              بدأت مكتبة أرين بشغف القراءة وإيمانًا بأن الكتب هي أساس المعرفة والتنوير. نسعى لتوفير أفضل الكتب الشرعية والمعرفية بأسعار مناسبة لكل بيت مغربي.
            </p>
            <p>
              نعمل مع دور النشر والمستوردين الموثوقين لنضمن لك جودة الكتب ومصداقيتها. فريقنا من المتحمسين للقراءة والعلم يختار لك كل كتاب بعناية.
            </p>
            <p>
              رؤيتنا هي أن نكون الوجهة الموثوقة الأولى في المغرب لطالب العلم والقارئ الشغوف، مع توفير تجربة تسوق سهلة وتوصيل سريع ومضمون.
            </p>
          </div>
        </div>

        {/* Left Panel in RTL: Stats */}
        <div className="bg-[#faf5ff] border border-[#8b2f9e]/10 rounded-[24px] p-6 sm:p-10 shadow-xs">
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-2xl p-6 sm:p-7 text-center shadow-[0_10px_30px_-10px_rgba(139,47,158,0.08)] border border-[#ece5f2]/60 hover:-translate-y-0.5 transition-transform duration-200"
              >
                <h3 className="font-tajawal font-extrabold text-2xl sm:text-[28px] text-[#8b2f9e] mb-1.5 leading-none">
                  {s.value}
                </h3>
                <p className="text-xs sm:text-[13.5px] text-[#6b6577] font-semibold m-0">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Core Values Section */}
      <div className="mb-16 sm:mb-20">
        <h2 className="font-tajawal font-extrabold text-2xl sm:text-[26px] text-[#161616] text-center mb-8">
          قيمنا
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {values.map((v) => {
            const Icon = v.icon
            return (
              <div
                key={v.title}
                className="bg-white border border-[#ece5f2] rounded-2xl p-6 text-center hover:border-[#8b2f9e]/30 hover:shadow-[0_10px_30px_-10px_rgba(139,47,158,0.12)] transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-[#faf5ff] text-[#8b2f9e] flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                  <Icon className="w-6 h-6 text-[#8b2f9e]" />
                </div>
                <h4 className="font-tajawal font-extrabold text-[#161616] text-base mb-1.5">
                  {v.title}
                </h4>
                <p className="text-xs sm:text-[13px] text-[#6b6577] leading-relaxed m-0">
                  {v.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. Quick Contact Highlights */}
      <div className="bg-white border border-[#ece5f2] rounded-[24px] p-6 sm:p-10 shadow-[0_12px_26px_-18px_rgba(76,22,96,0.15)]">
        <h2 className="font-tajawal font-extrabold text-2xl sm:text-[26px] text-[#161616] text-center mb-8">
          {t('contact') || 'تواصل معنا'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: MapPin, label: 'العنوان', value: address, isLtr: false },
            { icon: Phone, label: 'الهاتف', value: phone, isLtr: true, isTel: true },
            { icon: Mail, label: 'البريد', value: email, isLtr: true, isMail: true },
            { icon: Clock, label: 'ساعات العمل', value: businessHours, isLtr: false },
          ].map((c) => {
            const Icon = c.icon
            return (
              <div key={c.label} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#faf5ff] border border-[#8b2f9e]/15 flex items-center justify-center text-[#8b2f9e] shrink-0 shadow-2xs">
                  <Icon className="w-4 h-4 text-[#8b2f9e]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] text-[#6b6577] font-medium">{c.label}</div>
                  {c.isTel ? (
                    <a
                      href={`tel:${c.value.replace(/\s+/g, '')}`}
                      dir="ltr"
                      className="font-bold text-[#161616] text-xs sm:text-sm hover:text-[#8b2f9e] transition-colors block truncate"
                    >
                      {c.value}
                    </a>
                  ) : c.isMail ? (
                    <a
                      href={`mailto:${c.value}`}
                      dir="ltr"
                      className="font-bold text-[#161616] text-xs sm:text-sm hover:text-[#8b2f9e] transition-colors block truncate"
                    >
                      {c.value}
                    </a>
                  ) : (
                    <div className="font-bold text-[#161616] text-xs sm:text-sm leading-snug truncate" dir={c.isLtr ? 'ltr' : undefined}>
                      {c.value}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
