import { useState, useMemo } from 'react'
import {
  Send,
  MessageCircle,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  User,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useStoreConfig } from '../hooks/useStoreConfig'

function InstagramIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function TikTokIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.5 6.27 6.27 0 0 0 1.88-4.5V8.71a8.21 8.21 0 0 0 4.89 1.6v-3.62z" />
    </svg>
  )
}

// Helper to normalize phone numbers for wa.me links
function normalizeWhatsAppNumber(raw) {
  if (!raw) return ''
  let digits = String(raw).replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '212' + digits.slice(1)
  }
  return digits
}

export default function Contact() {
  const { t, isRTL } = useLanguage()
  const { config } = useStoreConfig()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)

  const store = config?.store || {}
  const phone = store.phone || '0665128821'
  const email = store.email || 'contact@arine.ma'
  const address = store.address || 'المغرب — توصيل لجميع المدن'
  const customerServiceDesc = store.customerServiceDesc || store.description || t('contactSubtitle')
  const instagram = store.instagram || ''
  const tiktok = store.tiktok || ''
  const mapsUrl = store.googleMapsUrl || (address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : '')

  // Compute WhatsApp contacts array (always exactly 2 contacts)
  const whatsappContacts = useMemo(() => {
    if (Array.isArray(store.whatsappContacts) && store.whatsappContacts.length > 0) {
      const c1 = store.whatsappContacts[0] || {}
      const c2 = store.whatsappContacts[1] || {}
      return [
        {
          id: '1',
          label: String(c1.label || '').trim() || 'خدمة العملاء',
          number: String(c1.number || store.whatsapp || '0665128821').trim(),
        },
        {
          id: '2',
          label: String(c2.label || '').trim() || 'خط المساعدة والطلب',
          number: String(c2.number || c1.number || store.whatsapp || '0665128821').trim(),
        },
      ]
    }
    const defaultWa = store.whatsapp || '0665128821'
    return [
      { id: '1', label: 'خدمة العملاء', number: defaultWa },
      { id: '2', label: 'خط المساعدة والطلب', number: defaultWa },
    ]
  }, [store.whatsappContacts, store.whatsapp])

  const handleWhatsAppClick = (e) => {
    e.preventDefault()
    setIsWhatsAppModalOpen(true)
  }

  const handleSelectWhatsAppNumber = (num) => {
    const clean = normalizeWhatsAppNumber(num)
    window.open(`https://wa.me/${clean}`, '_blank', 'noopener,noreferrer')
    setIsWhatsAppModalOpen(false)
  }

  const handleFormChange = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      })
      setTimeout(() => setSubmitted(false), 7000)
    }, 600)
  }

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-6 pt-10 sm:pt-11 pb-16 sm:pb-20">
      {/* 1. Hero Section */}
      <div className="text-center mb-9">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8b2f9e] bg-[#8b2f9e]/[0.08] px-3.5 py-1.5 rounded-full mb-3.5 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#8b2f9e]" />
          <span>{t('weAreHereToHelp') || 'نحن هنا لمساعدتك'}</span>
        </span>
        <h1 className="font-tajawal font-extrabold text-3xl sm:text-4xl text-[#161616] tracking-tight mb-2">
          {t('contactTitle') || 'تواصل معنا'}
        </h1>
        <p className="text-[#6b6577] text-[14.5px] max-w-[520px] mx-auto leading-relaxed">
          {customerServiceDesc}
        </p>
      </div>

      {/* 2. Main Two-Column Layout (Info Panel + Form Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.3fr] gap-[22px] items-stretch">
        {/* Left / First Column: Brand Info Panel */}
        <div className="bg-gradient-to-br from-[#4c1660] via-[#8b2f9e] to-[#5e1868] rounded-[22px] p-7 sm:p-[34px] text-white relative overflow-hidden flex flex-col justify-between gap-6 shadow-md">
          {/* Decorative Radial Glows */}
          <div className="absolute -top-[60px] -end-[60px] w-[220px] h-[220px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.14),transparent_70%)] pointer-events-none" />
          <div className="absolute -bottom-[70px] -start-[50px] w-[200px] h-[200px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)] pointer-events-none" />

          {/* Store Brand Identity & Tagline */}
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-2.5">
              {store.logo && !logoError ? (
                <img
                  src={store.logo}
                  alt={store.name || t('appName') || 'مكتبة أرين'}
                  className="max-h-9 max-w-[150px] w-auto object-contain brightness-110"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
              )}
              <b className="font-tajawal font-extrabold text-lg text-white">
                {store.name || t('appName') || 'مكتبة أرين'}
              </b>
            </div>
            <p className="text-[13.5px] leading-[1.85] text-white/85">
              {store.description || t('contactTagline') || 'مكتبتك الموثوقة للكتب الشرعية والمعرفية، بخدمة توصيل سريعة وفريق مستعد للإجابة على كل استفساراتكم.'}
            </p>
          </div>

          <div className="h-px bg-white/15 relative z-10" />

          {/* Contact Details List */}
          <div className="space-y-4 relative z-10">
            {/* Phone */}
            <div className="flex items-start gap-3">
              <div className="w-[38px] h-[38px] rounded-[11px] bg-white/15 flex items-center justify-center shrink-0">
                <Phone className="w-[18px] h-[18px] text-white" />
              </div>
              <div>
                <div className="text-[11.5px] text-white/65 mb-0.5">{t('callUs') || 'اتصل بنا'}</div>
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  dir="ltr"
                  className="text-[13.5px] font-semibold text-white hover:text-white/80 transition-colors inline-block"
                >
                  {phone}
                </a>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="w-[38px] h-[38px] rounded-[11px] bg-white/15 flex items-center justify-center shrink-0">
                <Mail className="w-[18px] h-[18px] text-white" />
              </div>
              <div>
                <div className="text-[11.5px] text-white/65 mb-0.5">{t('email') || 'البريد الإلكتروني'}</div>
                <a
                  href={`mailto:${email}`}
                  dir="ltr"
                  className="text-[13.5px] font-semibold text-white hover:text-white/80 transition-colors inline-block"
                >
                  {email}
                </a>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-3">
              <div className="w-[38px] h-[38px] rounded-[11px] bg-white/15 flex items-center justify-center shrink-0">
                <MapPin className="w-[18px] h-[18px] text-white" />
              </div>
              <div>
                <div className="text-[11.5px] text-white/65 mb-0.5">{t('location') || 'الموقع'}</div>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13.5px] font-semibold text-white hover:text-white/80 transition-colors leading-snug inline-block"
                  >
                    {address}
                  </a>
                ) : (
                  <div className="text-[13.5px] font-semibold text-white leading-snug">{address}</div>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-white/15 relative z-10" />

          {/* Working Hours Card */}
          <div className="bg-white/10 rounded-[14px] p-3.5 sm:p-4 relative z-10 text-[12.5px] leading-loose space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/90">{store.workingDays || t('mondayToFriday') || 'الإثنين – الجمعة'}</span>
              <b className="font-bold text-white">
                {store.openingTime && store.closingTime
                  ? `${store.openingTime} – ${store.closingTime}`
                  : (store.businessHours || '9:00 – 19:00')}
              </b>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/90">{t('saturday') || 'السبت'}</span>
              <b className="font-bold text-white">10:00 – 16:00</b>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/90">{t('sunday') || 'الأحد'}</span>
              <b className="font-bold text-white">{t('closed') || 'مغلق'}</b>
            </div>
          </div>

          {/* Social Icons Row */}
          <div className="flex items-center gap-2.5 relative z-10 pt-1">
            {whatsappContacts.length > 0 && (
              <button
                type="button"
                onClick={handleWhatsAppClick}
                className="w-[38px] h-[38px] rounded-[11px] bg-white/15 hover:bg-white/28 text-white flex items-center justify-center transition-all cursor-pointer hover:-translate-y-0.5"
                title={t('whatsapp') || 'WhatsApp'}
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            )}

            {instagram && (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-[38px] h-[38px] rounded-[11px] bg-white/15 hover:bg-white/28 text-white flex items-center justify-center transition-all hover:-translate-y-0.5"
                title={t('instagram') || 'Instagram'}
                aria-label="Instagram"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
            )}

            {tiktok && (
              <a
                href={tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="w-[38px] h-[38px] rounded-[11px] bg-white/15 hover:bg-white/28 text-white flex items-center justify-center transition-all hover:-translate-y-0.5"
                title={t('tiktok') || 'TikTok'}
                aria-label="TikTok"
              >
                <TikTokIcon className="w-4 h-4" />
              </a>
            )}

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-[38px] h-[38px] rounded-[11px] bg-white/15 hover:bg-white/28 text-white flex items-center justify-center transition-all hover:-translate-y-0.5"
                title={t('getDirections') || 'Maps'}
                aria-label="Google Maps"
              >
                <MapPin className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Right / Second Column: Contact Form Panel */}
        <div className="bg-white border border-[#ece5f2] rounded-[22px] p-6 sm:p-9 shadow-[0_20px_50px_-25px_rgba(76,22,96,0.25)] flex flex-col justify-between">
          <div>
            <h2 className="font-tajawal font-extrabold text-[21px] text-[#161616] mb-1.5">
              {t('sendMessageTitle') || 'أرسل لنا رسالة مباشرة'}
            </h2>
            <p className="text-[#6b6577] text-[13.5px] mb-6">
              {t('contactFormDesc') || 'عادة نرد خلال ساعات قليلة في أيام العمل.'}
            </p>

            {submitted ? (
              <div className="py-12 px-6 text-center rounded-2xl bg-emerald-50/80 border border-emerald-200/80 animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-emerald-950 text-lg mb-1 font-tajawal">
                  {t('messageSentSuccess') || 'تم إرسال رسالتك بنجاح!'}
                </h4>
                <p className="text-emerald-800 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                  {t('messageSentDesc') || 'شكراً لتواصلك معنا. سنقوم بمراجعة رسالتك والرد عليك في أقرب وقت ممكن.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Email & Full Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-[#161616] flex items-center gap-1">
                      <span>{t('email') || 'البريد الإلكتروني'}</span>
                      <span className="text-[#e0457a]">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute top-1/2 -translate-y-1/2 end-3.5 w-4 h-4 text-[#6b6577] pointer-events-none" />
                      <input
                        type="email"
                        required
                        dir="ltr"
                        value={formData.email}
                        onChange={handleFormChange('email')}
                        placeholder="mohamed@example.com"
                        className="w-full border-[1.5px] border-[#ece5f2] bg-[#faf8fc] rounded-xl ps-3.5 pe-10.5 py-3 text-[13.5px] text-[#161616] placeholder:text-[#b7b0c2] outline-none focus:border-[#8b2f9e] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-[#161616] flex items-center gap-1">
                      <span>{t('name') || 'الاسم الكامل'}</span>
                      <span className="text-[#e0457a]">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute top-1/2 -translate-y-1/2 end-3.5 w-4 h-4 text-[#6b6577] pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleFormChange('name')}
                        placeholder={t('namePlaceholder') || 'محمد أمين'}
                        className="w-full border-[1.5px] border-[#ece5f2] bg-[#faf8fc] rounded-xl ps-3.5 pe-10.5 py-3 text-[13.5px] text-[#161616] placeholder:text-[#b7b0c2] outline-none focus:border-[#8b2f9e] focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Subject & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Subject */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-[#161616] flex items-center gap-1">
                      <span>{t('subject') || 'الموضوع'}</span>
                      <span className="text-[#e0457a]">*</span>
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute top-1/2 -translate-y-1/2 end-3.5 w-4 h-4 text-[#6b6577] pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={handleFormChange('subject')}
                        placeholder={t('subjectPlaceholder') || 'استفسار عن كتاب، باقة، أو حالة طلب…'}
                        className="w-full border-[1.5px] border-[#ece5f2] bg-[#faf8fc] rounded-xl ps-3.5 pe-10.5 py-3 text-[13.5px] text-[#161616] placeholder:text-[#b7b0c2] outline-none focus:border-[#8b2f9e] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-[#161616]">
                      {t('phone') || 'رقم الهاتف'}
                    </label>
                    <div className="relative">
                      <Phone className="absolute top-1/2 -translate-y-1/2 end-3.5 w-4 h-4 text-[#6b6577] pointer-events-none" />
                      <input
                        type="tel"
                        dir="ltr"
                        value={formData.phone}
                        onChange={handleFormChange('phone')}
                        placeholder="0665128821"
                        className="w-full border-[1.5px] border-[#ece5f2] bg-[#faf8fc] rounded-xl ps-3.5 pe-10.5 py-3 text-[13.5px] text-[#161616] placeholder:text-[#b7b0c2] outline-none focus:border-[#8b2f9e] focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-[#161616] flex items-center gap-1">
                    <span>{t('message') || 'نص الرسالة'}</span>
                    <span className="text-[#e0457a]">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleFormChange('message')}
                      placeholder={t('messagePlaceholder') || 'اكتب استفسارك أو طلبك هنا بكل وضوح…'}
                      className="w-full border-[1.5px] border-[#ece5f2] bg-[#faf8fc] rounded-xl px-3.5 py-3 text-[13.5px] text-[#161616] placeholder:text-[#b7b0c2] outline-none focus:border-[#8b2f9e] focus:bg-white transition-all resize-none min-h-[130px]"
                    />
                  </div>
                </div>

                {/* Submit Send Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#8b2f9e] to-[#4c1660] hover:brightness-105 active:scale-[0.99] disabled:opacity-60 text-white font-bold text-[14.5px] rounded-[13px] py-3.5 mt-2 transition-all shadow-[0_12px_24px_-10px_rgba(139,47,158,0.55)] cursor-pointer"
                >
                  <Send className={`w-4 h-4 ${submitting ? 'animate-bounce' : ''}`} />
                  <span>{submitting ? (t('loading') || 'جارِ الإرسال…') : (t('sendMessageBtn') || 'إرسال الرسالة')}</span>
                </button>
              </form>
            )}
          </div>

          {/* WhatsApp CTA Button */}
          <button
            type="button"
            onClick={handleWhatsAppClick}
            className="w-full flex items-center justify-center gap-2 bg-[#e4f6f1] hover:bg-[#1f9d84]/15 text-[#1f9d84] font-bold text-[13.5px] border-[1.5px] border-[#1f9d84]/25 rounded-[13px] py-3.5 mt-3 transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t('contactViaWhatsapp') || 'تواصل معنا عبر الواتساب'}</span>
          </button>
        </div>
      </div>

      {/* 3. WhatsApp 2-Option Selector Modal */}
      {isWhatsAppModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsWhatsAppModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-zinc-200 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#161616] text-base font-tajawal">
                    {t('chooseWhatsappNumber') || 'اختر رقم الواتساب للتواصل'}
                  </h3>
                  <p className="text-[11px] text-[#6b6577]">
                    {t('chooseWhatsappNumberDesc') || 'يرجى اختيار أحد أرقام خدمة العملاء المتاحة لبدء المحادثة الفورية'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Exactly 2 WhatsApp Numbers */}
            <div className="space-y-3">
              {whatsappContacts.map((contact, idx) => (
                <button
                  key={contact.id || idx}
                  type="button"
                  onClick={() => handleSelectWhatsAppNumber(contact.number)}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-zinc-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 transition-all text-start group shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-[#161616]">
                        {contact.label}
                      </div>
                      <div dir="ltr" className="text-xs font-mono text-[#6b6577] mt-0.5">
                        {contact.number}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs">
                    <span>{t('startChat') || 'بدء المحادثة'}</span>
                    <ArrowIcon className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {t('close') || 'إغلاق'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
