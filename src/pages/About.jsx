import { MapPin, Phone, Mail, Clock, BookOpen } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useStoreConfig } from '../hooks/useStoreConfig'

export default function About() {
  const { t } = useLanguage()
  const { config } = useStoreConfig()

  const storeName = config?.store?.name || 'مكتبة أرين للكتب الشرعية'
  const storeDesc = config?.store?.description || 'منصة مغربية متخصصة في توفير الكتب الشرعية والمعرفية لعشاق القراءة وطلب العلم.'
  const address = config?.store?.address || 'الدار البيضاء، المغرب'
  const phone = config?.store?.phone || '+212 600 00 00 00'
  const email = config?.store?.email || 'info@arine.ma'

  const statBooks = config?.hero?.statBooks || '+2000'
  const statCustomers = config?.hero?.statCustomers || '+5000'
  const statDelivery = config?.hero?.statDelivery || '24/48'

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-10 lg:py-12">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-100 text-brand-700 text-[0.82rem] font-medium rounded-full mb-5">
          <BookOpen className="w-3.5 h-3.5" />
          {t('about') || 'من نحن'}
        </span>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
          {storeName}
        </h1>
        <p className="text-muted text-lg mt-4 leading-relaxed">
          {storeDesc}
        </p>
      </div>

      {/* Story */}
      <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">قصتنا</h2>
          <div className="space-y-3 text-muted text-[0.92rem] leading-relaxed">
            <p>
              بدأت مكتبة أرين بشغف القراءة وإيمانًا بأن الكتب هي أساس المعرفة والتنوير. نسعى لتوفير أفضل الكتب الشرعية والمعرفية بأسعار مناسبة لكل بيت مغربي.
            </p>
            <p>
              نعمل مع دور النشر والمستوردين الموثوقين لنضمن لك جودة الكتب ومصداقيتها. فريقنا من المتحمسين للقراءة والعلم يختار لك كل كتاب بعناية.
            </p>
            <p>
              رؤيتنا هي أن نكون المنصة الأولى في المغرب العربي الإسلامي، حيث يجد كل طالب علم وقارئ شغوف ما يلبي حاجاته من الكتب.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-brand-50 to-brand-100/50 rounded-3xl p-8 lg:p-12">
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: statBooks, label: 'كتاب متاح' },
              { value: statCustomers, label: 'عميل سعيد' },
              { value: statDelivery, label: 'ساعة توصيل' },
              { value: '+95%', label: 'رضا العملاء' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-brand-700">{s.value}</div>
                <div className="text-[0.78rem] text-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">قيمنا</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'المصداقية', desc: 'نضمن جودة الكتب ومصداقيتها', icon: '🛡️' },
            { title: 'السرعة', desc: 'توصيل سريع في جميع أنحاء المغرب', icon: '⚡' },
            { title: 'الأمانة', desc: 'تعامل شفاف وثقة مع عملائنا', icon: '🤝' },
            { title: 'الشغف', desc: 'نحب الكتب ونحب مشاركتها معكم', icon: '❤️' },
          ].map((v) => (
            <div key={v.title} className="bg-white border border-border/60 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">{v.icon}</div>
              <h4 className="font-bold text-foreground mb-1">{v.title}</h4>
              <p className="text-[0.82rem] text-muted">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white border border-border/60 rounded-3xl p-8 lg:p-12">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">تواصل معنا</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: MapPin, label: 'العنوان', value: address, isLtr: false },
            { icon: Phone, label: 'الهاتف', value: phone, isLtr: true },
            { icon: Mail, label: 'البريد', value: email, isLtr: true },
            { icon: Clock, label: 'ساعات العمل', value: 'الاثنين - السبت، 9-18', isLtr: false },
          ].map((c) => (
            <div key={c.label} className="flex items-start gap-3">
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <c.icon className="w-5 h-5 text-brand-700" />
              </div>
              <div>
                <div className="text-[0.78rem] text-muted">{c.label}</div>
                <div className="font-semibold text-foreground text-[0.88rem] mt-0.5" dir={c.isLtr ? "ltr" : undefined}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}