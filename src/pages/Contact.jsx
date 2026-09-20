import { useState, useMemo } from 'react'
import {
  Send,
  MessageCircle,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useStoreConfig } from '../hooks/useStoreConfig'

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

  const store = config?.store || {}
  const customerServiceDesc = store.customerServiceDesc || store.description || t('contactSubtitle')

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
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-10 lg:py-16 space-y-10">
      {/* 1. Hero Section */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-50 text-brand-800 border border-brand-200/90 rounded-full text-xs font-bold mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-brand-700" />
          <span>{t('contact') || 'تواصل معنا'}</span>
        </span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
          {t('contactTitle') || 'تواصل معنا'}
        </h1>
        <p className="text-muted text-sm sm:text-base lg:text-lg mt-3.5 leading-relaxed font-normal">
          {customerServiceDesc}
        </p>
      </div>

      {/* 2. Centered Contact Form & Minimalist WhatsApp Button */}
      <div className="max-w-2xl mx-auto w-full">
        <div className="bg-white border border-border/80 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm relative overflow-hidden">
          <div className="mb-6">
            <h3 className="font-bold text-foreground text-xl lg:text-2xl">
              {t('sendMessageTitle') || 'أرسل لنا رسالة مباشرة'}
            </h3>
            <p className="text-muted text-xs sm:text-sm mt-1.5 leading-relaxed">
              {t('contactSubtitle') || 'املأ النموذج أدناه وسيقوم فريقنا بالرد عليك في أقرب وقت.'}
            </p>
          </div>

          {submitted ? (
            <div className="py-12 px-6 text-center rounded-2xl bg-emerald-50/70 border border-emerald-200/80 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-emerald-950 text-lg mb-1">
                {t('messageSentSuccess') || 'تم إرسال رسالتك بنجاح!'}
              </h4>
              <p className="text-emerald-800 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                {t('messageSentDesc') || 'شكراً لتواصلك معنا. سنقوم بمراجعة رسالتك والرد عليك في أقرب وقت ممكن.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {t('name') || 'الاسم الكامل'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleFormChange('name')}
                    placeholder={t('namePlaceholder') || 'محمد أمين'}
                    className="w-full px-4 py-3 bg-[#F9FAFB] border border-border/80 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {t('email') || 'البريد الإلكتروني'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={formData.email}
                    onChange={handleFormChange('email')}
                    placeholder="mohamed@example.com"
                    className="w-full px-4 py-3 bg-[#F9FAFB] border border-border/80 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {t('phone') || 'رقم الهاتف'}
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={formData.phone}
                    onChange={handleFormChange('phone')}
                    placeholder="0665128821"
                    className="w-full px-4 py-3 bg-[#F9FAFB] border border-border/80 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {t('subject') || 'الموضوع'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={handleFormChange('subject')}
                    placeholder={t('subjectPlaceholder') || 'استفسار عن كتاب، باقة، أو حالة طلب…'}
                    className="w-full px-4 py-3 bg-[#F9FAFB] border border-border/80 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {t('message') || 'نص الرسالة'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleFormChange('message')}
                  placeholder={t('messagePlaceholder') || 'اكتب استفسارك أو طلبك هنا بكل وضوح…'}
                  className="w-full px-4 py-3 bg-[#F9FAFB] border border-border/80 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white text-[0.92rem] font-bold rounded-xl transition-all shadow-md shadow-brand-700/20 active:scale-[0.99]"
              >
                <Send className={`w-4 h-4 ${submitting ? 'animate-bounce' : ''}`} />
                <span>{submitting ? (t('loading') || 'جارِ الإرسال…') : (t('sendMessageBtn') || 'إرسال الرسالة')}</span>
              </button>
            </form>
          )}

          {/* Minimalist WhatsApp Button */}
          <button
            type="button"
            onClick={handleWhatsAppClick}
            className="flex items-center justify-center gap-2 w-full mt-6 py-2.5 px-4 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 font-semibold rounded-lg transition-colors border border-[#25D366]/30"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsWhatsAppModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-border/80 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">
                    {t('chooseWhatsappNumber') || 'اختر رقم الواتساب للتواصل'}
                  </h3>
                  <p className="text-[11px] text-muted">
                    {t('chooseWhatsappNumberDesc') || 'يرجى اختيار أحد أرقام خدمة العملاء المتاحة لبدء المحادثة الفورية'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors"
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
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-border hover:border-emerald-500 bg-white hover:bg-emerald-50/40 transition-all text-start group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-foreground">
                        {contact.label}
                      </div>
                      <div dir="ltr" className="text-xs font-mono text-muted mt-0.5">
                        {contact.number}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs">
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
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl transition-colors"
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
