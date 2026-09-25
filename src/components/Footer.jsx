import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Clock,
  X,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useStoreConfig } from '../hooks/useStoreConfig'
import { getImageUrl } from '../utils/images'

function normalizeWhatsAppNumber(raw) {
  if (!raw) return ''
  let digits = String(raw).replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '212' + digits.slice(1)
  }
  return digits
}

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

export default function Footer() {
  const { t, isRTL } = useLanguage()
  const { config } = useStoreConfig()
  const [footerLogoError, setFooterLogoError] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState('idle') // 'idle' | 'success'

  const store = config?.store || {}
  const phone = store.phone || '0665128821'
  const email = store.email || 'arine.ma00@gmail.com'
  const address = store.address || 'المغرب، فاس، طريق نرجس'
  const businessHours = store.businessHours || ''
  const instagram = store.instagram || ''
  const tiktok = store.tiktok || ''
  const currentYear = new Date().getFullYear()

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

  const whatsappNumbers = useMemo(() => {
    return whatsappContacts.map((c) => c.number)
  }, [whatsappContacts])

  const handleWhatsAppClick = (e) => {
    e.preventDefault()
    setIsWhatsAppModalOpen(true)
  }

  const handleSelectWhatsAppNumber = (num) => {
    const clean = normalizeWhatsAppNumber(num)
    window.open(`https://wa.me/${clean}`, '_blank', 'noopener,noreferrer')
    setIsWhatsAppModalOpen(false)
  }

  const handleNewsletterSubmit = (e) => {
    e.preventDefault()
    if (!newsletterEmail || !newsletterEmail.includes('@')) return
    setNewsletterStatus('success')
    setNewsletterEmail('')
    setTimeout(() => {
      setNewsletterStatus('idle')
    }, 4000)
  }

  const mapsUrl = store.googleMapsUrl || (address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null)

  const quickLinks = [
    { label: t('home') || 'الرئيسية', to: '/' },
    { label: t('books') || 'الكتب', to: '/shop' },
    { label: t('packages') || 'الباقات', to: '/packages' },
    { label: t('about') || 'من نحن', to: '/about' },
    { label: t('contact') || 'تواصل معنا', to: '/contact' },
  ]

  const helpLinks = [
    { label: t('footerReturnPolicy') || 'سياسة الاستبدال والاسترجاع', to: '/contact' },
    { label: t('footerShippingPolicy') || 'الشحن والتوصيل', to: '/contact' },
    { label: t('footerFaq') || 'الأسئلة الشائعة', to: '/contact' },
    { label: t('footerTerms') || 'الشروط والأحكام', to: '/contact' },
  ]

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight
  const HoverChevron = isRTL ? ChevronLeft : ChevronRight

  return (
    <footer className="relative bg-[#120a17] text-[#cfc4da] overflow-hidden pt-14 sm:pt-16 mt-auto select-none">
      {/* Soft background glow accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[140px] -right-[120px] w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,rgba(139,47,158,0.35),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[160px] -left-[100px] w-[380px] h-[380px] rounded-full bg-[radial-gradient(circle,rgba(76,22,96,0.40),transparent_70%)]"
      />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        {/* 1. Newsletter Strip */}
        <div className="bg-gradient-to-r from-[#8b2f9e]/[0.16] to-[#4c1660]/[0.28] border border-[#c25fd6]/25 rounded-[20px] p-6 sm:p-7 lg:p-8 mb-12 sm:mb-14 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md backdrop-blur-xs">
          <div className="text-center md:text-start">
            <h3 className="font-tajawal font-extrabold text-white text-lg sm:text-[19px] mb-1">
              {t('newsletterTitle') || 'اشترك في نشرتنا البريدية'}
            </h3>
            <p className="text-[#b6a9c4] text-xs sm:text-[13px] leading-relaxed">
              {t('newsletterDesc') || 'كتب جديدة، عروض حصرية، ونصائح قرائية — مباشرة إلى بريدك.'}
            </p>
          </div>

          <form
            onSubmit={handleNewsletterSubmit}
            className="flex items-center gap-2.5 w-full md:w-auto flex-col sm:flex-row"
          >
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder={t('newsletterPlaceholder') || 'بريدك الإلكتروني'}
              className="w-full sm:w-[240px] lg:w-[260px] px-4 py-2.5 sm:py-3 bg-white/[0.07] border border-white/15 rounded-[11px] text-white text-xs sm:text-[13px] placeholder:text-[#8d7f9c] outline-none focus:border-[#c25fd6] transition-colors"
            />
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#c25fd6] to-[#8b2f9e] hover:from-[#b14ec5] hover:to-[#7a288c] text-white font-bold text-xs sm:text-[13px] rounded-[11px] transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-95 flex items-center justify-center gap-1.5"
            >
              {newsletterStatus === 'success' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>{t('newsletterSuccess') || 'تم الاشتراك!'}</span>
                </>
              ) : (
                <span>{t('newsletterSubscribe') || 'اشتراك'}</span>
              )}
            </button>
          </form>
        </div>

        {/* 2. Main Four-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] gap-8 sm:gap-9 lg:gap-8 pb-10 sm:pb-12">
          {/* Brand Column */}
          <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              {store.logo && !footerLogoError ? (
                <img
                  src={getImageUrl(store.logo)}
                  alt={store.name || t('appName') || 'مكتبة أرين'}
                  className="max-h-10 max-w-[160px] w-10 h-10 rounded-full object-cover border border-white/20 shadow-md shrink-0"
                  onError={() => setFooterLogoError(true)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#8b2f9e]/30 border border-[#c25fd6]/40 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-[#c25fd6]" />
                  </div>
                  <b className="font-tajawal font-extrabold text-[17px] text-white">
                    {store.name || t('appName') || 'مكتبة أرين'}
                  </b>
                </div>
              )}
            </div>

            <p className="text-[13px] leading-[1.9] text-[#a99bb7] max-w-[290px]">
              {store.description || t('footerAbout') || 'مكتبتك الموثوقة للكتب الشرعية والمعرفية، بخدمة توصيل سريعة وفريق مستعد للإجابة على كل استفساراتكم.'}
            </p>

            {/* Social Media Icons */}
            <div className="flex items-center gap-2.5 mt-1 flex-wrap">
              {whatsappNumbers.length > 0 && (
                <button
                  type="button"
                  onClick={handleWhatsAppClick}
                  className="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#cfc4da] hover:bg-emerald-600 hover:border-emerald-600 hover:text-white hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-xs"
                  aria-label="WhatsApp"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              )}

              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#cfc4da] hover:bg-[#8b2f9e] hover:border-[#8b2f9e] hover:text-white hover:-translate-y-0.5 transition-all duration-200 shadow-xs"
                  aria-label="Instagram"
                  title="Instagram"
                >
                  <InstagramIcon className="w-4 h-4" />
                </a>
              )}

              {tiktok && (
                <a
                  href={tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#cfc4da] hover:bg-black hover:border-white/30 hover:text-white hover:-translate-y-0.5 transition-all duration-200 shadow-xs"
                  aria-label="TikTok"
                  title="TikTok"
                >
                  <TikTokIcon className="w-4 h-4" />
                </a>
              )}

              <a
                href={`mailto:${email}`}
                className="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#cfc4da] hover:bg-[#8b2f9e] hover:border-[#8b2f9e] hover:text-white hover:-translate-y-0.5 transition-all duration-200 shadow-xs"
                aria-label="Email"
                title={email}
              >
                <Mail className="w-4 h-4" />
              </a>

              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#cfc4da] hover:bg-[#8b2f9e] hover:border-[#8b2f9e] hover:text-white hover:-translate-y-0.5 transition-all duration-200 shadow-xs"
                aria-label="Phone"
                title={phone}
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <div className="relative mb-4 pb-2.5">
              <h4 className="font-tajawal font-extrabold text-white text-[14.5px] m-0">
                {t('footerQuickLinks') || 'روابط سريعة'}
              </h4>
              <div
                className="absolute bottom-0 w-[26px] h-[2.5px] rounded-full bg-gradient-to-r from-[#c25fd6] to-[#d3a95f]"
                style={{ insetInlineStart: '0' }}
              />
            </div>
            <ul className="list-none m-0 p-0 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="group text-[#a99bb7] hover:text-white text-[13.2px] transition-colors flex items-center gap-1.5"
                  >
                    <HoverChevron className="w-3.5 h-3.5 text-[#c25fd6] opacity-0 transform -translate-x-1 rtl:translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help & Support Column */}
          <div>
            <div className="relative mb-4 pb-2.5">
              <h4 className="font-tajawal font-extrabold text-white text-[14.5px] m-0">
                {t('footerHelp') || 'المساعدة'}
              </h4>
              <div
                className="absolute bottom-0 w-[26px] h-[2.5px] rounded-full bg-gradient-to-r from-[#c25fd6] to-[#d3a95f]"
                style={{ insetInlineStart: '0' }}
              />
            </div>
            <ul className="list-none m-0 p-0 space-y-3">
              {helpLinks.map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.to}
                    className="group text-[#a99bb7] hover:text-white text-[13.2px] transition-colors flex items-center gap-1.5"
                  >
                    <HoverChevron className="w-3.5 h-3.5 text-[#c25fd6] opacity-0 transform -translate-x-1 rtl:translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details Column */}
          <div>
            <div className="relative mb-4 pb-2.5">
              <h4 className="font-tajawal font-extrabold text-white text-[14.5px] m-0">
                {t('contact') || 'تواصل معنا'}
              </h4>
              <div
                className="absolute bottom-0 w-[26px] h-[2.5px] rounded-full bg-gradient-to-r from-[#c25fd6] to-[#d3a95f]"
                style={{ insetInlineStart: '0' }}
              />
            </div>
            <div className="space-y-3.5">
              {/* Address */}
              <div className="flex items-start gap-2.5 text-[13px] text-[#a99bb7]">
                <div className="w-[30px] h-[30px] rounded-[8px] bg-[#8b2f9e]/20 text-[#c25fd6] flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors leading-snug"
                  >
                    {address}
                  </a>
                ) : (
                  <span className="leading-snug">{address}</span>
                )}
              </div>

              {/* Phone */}
              <div className="flex items-center gap-2.5 text-[13px] text-[#a99bb7]">
                <div className="w-[30px] h-[30px] rounded-[8px] bg-[#8b2f9e]/20 text-[#c25fd6] flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  dir="ltr"
                  className="hover:text-white transition-colors font-medium"
                >
                  {phone}
                </a>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2.5 text-[13px] text-[#a99bb7]">
                <div className="w-[30px] h-[30px] rounded-[8px] bg-[#8b2f9e]/20 text-[#c25fd6] flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <a
                  href={`mailto:${email}`}
                  dir="ltr"
                  className="hover:text-white transition-colors font-medium truncate"
                >
                  {email}
                </a>
              </div>

              {/* Business Hours */}
              {businessHours && (
                <div className="flex items-start gap-2.5 text-[13px] text-[#a99bb7]">
                  <div className="w-[30px] h-[30px] rounded-[8px] bg-[#8b2f9e]/20 text-[#c25fd6] flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <span className="leading-snug">{businessHours}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Hairline Gradient Separator */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#c25fd6] via-[#d3a95f] via-[#c25fd6] to-transparent opacity-75" />

      {/* 4. Bottom Bar */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-[12.5px] text-[#8d7f9c]">
          <div>
            © {currentYear} {store.name || t('appName') || 'مكتبة أرين للكتب الشرعية'}. {t('allRightsReserved') || 'جميع الحقوق محفوظة.'}
          </div>
          <div className="flex items-center gap-5">
            <Link to="/contact" className="hover:text-white transition-colors">
              {t('footerPrivacy') || 'الخصوصية'}
            </Link>
            <Link to="/contact" className="hover:text-white transition-colors">
              {t('footerTerms') || 'الشروط والأحكام'}
            </Link>
          </div>
        </div>
      </div>

      {/* Multiple WhatsApp Numbers Modal */}
      {isWhatsAppModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsWhatsAppModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white text-zinc-900 rounded-[22px] p-6 sm:p-7 shadow-2xl border border-zinc-200 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
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
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-zinc-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 transition-all text-start group shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-zinc-900">
                        {contact.label}
                      </div>
                      <div dir="ltr" className="text-xs font-mono text-zinc-500 mt-0.5">
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

            <div className="pt-1">
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
    </footer>
  )
}
