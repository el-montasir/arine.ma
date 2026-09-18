import { useState } from 'react'
import { MapPin, Phone, Mail, Send, MessageSquare } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useStoreConfig } from '../hooks/useStoreConfig'

export default function Contact() {
  const { t } = useLanguage()
  const { config } = useStoreConfig()
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
  }

  const phone = config?.store?.phone || '+212 600 00 00 00'
  const email = config?.store?.email || 'info@arine.ma'
  const address = config?.store?.address || 'المغرب — توصيل لجميع المدن'
  const whatsapp = config?.store?.whatsapp

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
          {t('contact') || 'تواصل معنا'}
        </h1>
        <p className="text-muted text-lg mt-3 leading-relaxed">
          {config?.store?.description || 'نحن هنا لمساعدتك. لا تتردد في التواصل معنا لأي استفسار.'}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Contact Info */}
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-5 bg-white border border-border/60 rounded-2xl">
            <div className="w-11 h-11 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h4 className="font-bold text-foreground text-[0.92rem]">العنوان</h4>
              <p className="text-muted text-[0.85rem] mt-0.5">{address}</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 bg-white border border-border/60 rounded-2xl">
            <div className="w-11 h-11 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h4 className="font-bold text-foreground text-[0.92rem]">الهاتف</h4>
              <p className="text-muted text-[0.85rem] mt-0.5" dir="ltr">{phone}</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 bg-white border border-border/60 rounded-2xl">
            <div className="w-11 h-11 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h4 className="font-bold text-foreground text-[0.92rem]">البريد الإلكتروني</h4>
              <p className="text-muted text-[0.85rem] mt-0.5" dir="ltr">{email}</p>
            </div>
          </div>

          {whatsapp && (
            <div className="flex items-start gap-4 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-900 text-[0.92rem]">واتساب</h4>
                <p className="text-emerald-700 text-[0.85rem] mt-0.5" dir="ltr">{whatsapp}</p>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-white border border-border/60 rounded-3xl p-6 lg:p-8">
          <h3 className="font-bold text-foreground text-lg mb-6">أرسل لنا رسالة</h3>

          {submitted ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <p className="font-semibold text-foreground mb-1">شكراً لك!</p>
              <p className="text-muted text-[0.85rem]">تم استلام رسالتك وسنرد عليك قريباً.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.82rem] text-muted mb-1.5">الاسم</label>
                  <input
                    type="text"
                    required
                    placeholder="محمد أمين"
                    className="w-full px-4 py-3 bg-[#F3F4F6] border border-border/60 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-400 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[0.82rem] text-muted mb-1.5">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    placeholder="mohamed@example.com"
                    className="w-full px-4 py-3 bg-[#F3F4F6] border border-border/60 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-400 focus:bg-white transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[0.82rem] text-muted mb-1.5">الموضوع</label>
                <input
                  type="text"
                  required
                  placeholder="موضوع الرسالة"
                  className="w-full px-4 py-3 bg-[#F3F4F6] border border-border/60 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-400 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-[0.82rem] text-muted mb-1.5">الرسالة</label>
                <textarea
                  required
                  rows={5}
                  placeholder="اكتب رسالتك هنا..."
                  className="w-full px-4 py-3 bg-[#F3F4F6] border border-border/60 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-400 focus:bg-white transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-[0.92rem] font-semibold rounded-xl transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
                إرسال الرسالة
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}