import { MapPin, Phone, Mail, Clock, BookOpen, ShieldCheck, Zap, HeartHandshake, Sparkles } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useStoreConfig } from '../hooks/useStoreConfig'

export default function About() {
  const { t } = useLanguage()
  const { config } = useStoreConfig()

  const store = config?.store || {}
  const storeName = store.name || t('appName') || 'مكتبة أرين'
  const storeDesc = store.description || 'مكتبة أرين للكتب الشرعية والمعرفية'
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
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B2178] bg-[#F6EDF9] border border-[#EBDCF1] px-3.5 py-1.5 rounded-full mb-3.5 shadow-2xs">
          <BookOpen className="w-3.5 h-3.5 text-[#6B2178]" />
          <span>{t('about') || 'من نحن'}</span>
        </span>
        <h1 className="font-tajawal font-extrabold text-3xl sm:text-4xl text-[#1C1220] tracking-tight mb-3">
          {storeName}
        </h1>
        <p className="text-[#7A6D80] text-sm sm:text-[15px] max-w-[540px] mx-auto leading-[1.8]">
          {storeDesc}
        </p>
      </div>

      {/* 2. Main Story & Stats Layout (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center mb-16 sm:mb-20">
        {/* Right Panel in RTL: Story */}
        <div className="p-2 sm:p-2.5">
          <h2 className="font-tajawal font-extrabold text-2xl sm:text-[26px] text-[#1C1220] mb-4">
            قصتنا
          </h2>
          <div className="space-y-4 text-[#4A3D50] text-sm sm:text-[14.5px] leading-[2]">
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
        <div className="bg-[#F6EDF9]/70 border border-[#EBDCF1] rounded-[24px] p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-[18px] p-5 sm:p-6 text-center shadow-[0_1px_2px_rgba(62,17,71,.04),0_8px_24px_-8px_rgba(62,17,71,.10)] border border-[#EFE8F2] hover:-translate-y-0.5 transition-transform duration-200"
              >
                <h3 className="font-tajawal font-extrabold text-2xl sm:text-[28px] text-[#6B2178] mb-1.5 leading-none">
                  {s.value}
                </h3>
                <p className="text-xs sm:text-[13.5px] text-[#7A6D80] font-semibold m-0">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Core Values Section */}
      <div className="mb-16 sm:mb-20">
        <h2 className="font-tajawal font-extrabold text-2xl sm:text-[26px] text-[#1C1220] text-center mb-8">
          قيمنا
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {values.map((v) => {
            const Icon = v.icon
            return (
              <div
                key={v.title}
                className="bg-white border border-[#EFE8F2] rounded-[20px] p-6 text-center hover:border-[#EBDCF1] hover:shadow-[0_1px_2px_rgba(62,17,71,.04),0_12px_32px_-12px_rgba(62,17,71,.12)] transition-all duration-200 shadow-2xs"
              >
                <div className="w-12 h-12 rounded-[14px] bg-[#F6EDF9] border border-[#EBDCF1] text-[#6B2178] flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                  <Icon className="w-6 h-6 text-[#6B2178]" />
                </div>
                <h4 className="font-tajawal font-extrabold text-[#1C1220] text-base mb-1.5">
                  {v.title}
                </h4>
                <p className="text-xs sm:text-[13px] text-[#7A6D80] leading-relaxed m-0">
                  {v.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. Quick Contact Highlights */}
      <div className="bg-white border border-[#EFE8F2] rounded-[24px] p-6 sm:p-10 shadow-[0_1px_2px_rgba(62,17,71,.04),0_12px_32px_-12px_rgba(62,17,71,.12)]">
        <h2 className="font-tajawal font-extrabold text-2xl sm:text-[26px] text-[#1C1220] text-center mb-8">
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
                <div className="w-10 h-10 rounded-[12px] bg-[#F6EDF9] border border-[#EBDCF1] flex items-center justify-center text-[#6B2178] shrink-0 shadow-2xs">
                  <Icon className="w-4 h-4 text-[#6B2178]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] text-[#7A6D80] font-medium">{c.label}</div>
                  {c.isTel ? (
                    <a
                      href={`tel:${c.value.replace(/\s+/g, '')}`}
                      dir="ltr"
                      className="font-bold text-[#1C1220] text-xs sm:text-sm hover:text-[#6B2178] transition-colors block truncate"
                    >
                      {c.value}
                    </a>
                  ) : c.isMail ? (
                    <a
                      href={`mailto:${c.value}`}
                      dir="ltr"
                      className="font-bold text-[#1C1220] text-xs sm:text-sm hover:text-[#6B2178] transition-colors block truncate"
                    >
                      {c.value}
                    </a>
                  ) : (
                    <div className="font-bold text-[#1C1220] text-xs sm:text-sm leading-snug truncate" dir={c.isLtr ? 'ltr' : undefined}>
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
