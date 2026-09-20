import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Clock,
  ExternalLink,
  X,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useStoreConfig } from '../hooks/useStoreConfig'

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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  const store = config?.store || {}
  const phone = store.phone || '+212 600 00 00 00'
  const email = store.email || 'contact@arine.ma'
  const address = store.address || 'المغرب — توصيل لجميع المدن'
  const businessHours = store.businessHours || ''
  const instagram = store.instagram || ''
  const tiktok = store.tiktok || ''

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

  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null

  const quickLinks = [
    { label: t('home'), to: '/' },
    { label: t('books'), to: '/shop' },
    { label: t('packages') || 'الباقات', to: '/packages' },
    { label: t('about'), to: '/about' },
    { label: t('contact'), to: '/contact' },
  ]

  const helpLinks = [
    t('footerReturnPolicy'),
    t('footerShippingPolicy'),
    t('footerFaq'),
    t('footerTerms'),
  ]

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  return (
    <footer className="bg-[#0F0D15] text-white/70 mt-auto border-t border-white/5">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* 1. Brand & Social */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              {store.logo && !footerLogoError ? (
                <img
                  src={store.logo}
                  alt={store.name || t('appName') || 'مكتبة أرين'}
                  className="max-h-11 max-w-[170px] w-auto object-contain brightness-110"
                  onError={() => setFooterLogoError(true)}
                />
              ) : (
                <>
                  <div className="bg-brand-700 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg">{store.name || t('appName')}</div>
                    <div className="text-white/50 text-[0.65rem]">{t('appTagline')}</div>
                  </div>
                </>
              )}
            </div>

            <p className="text-[0.82rem] leading-relaxed max-w-xs text-white/70">
              {store.description || t('footerAbout')}
            </p>

            {/* Social Media Links */}
            <div className="flex flex-wrap items-center gap-2.5 mt-5">
              {whatsappNumbers.length > 0 && (
                <button
                  type="button"
                  onClick={handleWhatsAppClick}
                  className="w-9 h-9 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl flex items-center justify-center transition-all border border-emerald-500/30 shadow-sm"
                  aria-label="WhatsApp"
                  title={t('whatsapp') || 'WhatsApp'}
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              )}

              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-pink-500/10 hover:bg-gradient-to-tr hover:from-orange-500 hover:via-pink-600 hover:to-purple-600 text-pink-400 hover:text-white rounded-xl flex items-center justify-center transition-all border border-pink-500/20 shadow-sm"
                  aria-label="Instagram"
                  title={t('instagram') || 'Instagram'}
                >
                  <InstagramIcon className="w-4 h-4" />
                </a>
              )}

              {tiktok && (
                <a
                  href={tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-white/10 hover:bg-white text-white/90 hover:text-black rounded-xl flex items-center justify-center transition-all border border-white/10 shadow-sm"
                  aria-label="TikTok"
                  title={t('tiktok') || 'TikTok'}
                >
                  <TikTokIcon className="w-4 h-4" />
                </a>
              )}

              <a
                href={`mailto:${email}`}
                className="w-9 h-9 bg-white/10 hover:bg-brand-700 text-white/80 hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/10 shadow-sm"
                aria-label="Email"
                title={email}
              >
                <Mail className="w-4 h-4" />
              </a>

              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="w-9 h-9 bg-white/10 hover:bg-brand-700 text-white/80 hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/10 shadow-sm"
                aria-label="Phone"
                title={phone}
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* 2. Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-[0.88rem] mb-4">{t('footerQuickLinks')}</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-[0.82rem] hover:text-brand-400 transition-colors inline-block"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Help & Support */}
          <div>
            <h4 className="text-white font-semibold text-[0.88rem] mb-4">{t('footerHelp')}</h4>
            <ul className="space-y-2.5">
              {helpLinks.map((label, idx) => (
                <li key={idx}>
                  <Link
                    to="/contact"
                    className="text-[0.82rem] hover:text-brand-400 transition-colors inline-block"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Contact Details */}
          <div>
            <h4 className="text-white font-semibold text-[0.88rem] mb-4">{t('contact')}</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-[0.82rem]">
                <MapPin className="w-4 h-4 flex-shrink-0 text-brand-400 mt-0.5" />
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    {address}
                  </a>
                ) : (
                  <span>{address}</span>
                )}
              </li>
              <li className="flex items-center gap-3 text-[0.82rem]">
                <Phone className="w-4 h-4 flex-shrink-0 text-brand-400" />
                <a href={`tel:${phone.replace(/\s+/g, '')}`} dir="ltr" className="hover:text-white transition-colors">
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-3 text-[0.82rem]">
                <Mail className="w-4 h-4 flex-shrink-0 text-brand-400" />
                <a href={`mailto:${email}`} dir="ltr" className="hover:text-white transition-colors">
                  {email}
                </a>
              </li>
              {businessHours && (
                <li className="flex items-start gap-3 text-[0.82rem]">
                  <Clock className="w-4 h-4 flex-shrink-0 text-brand-400 mt-0.5" />
                  <span className="text-white/60">{businessHours}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[0.78rem] text-white/50 text-center sm:text-start">
            {t('footerRights')}
          </p>
          <div className="flex items-center gap-4 text-[0.78rem] text-white/50">
            <Link to="/contact" className="hover:text-white/70 transition-colors">{t('footerPrivacy')}</Link>
            <Link to="/contact" className="hover:text-white/70 transition-colors">{t('footerTerms')}</Link>
          </div>
        </div>
      </div>

      {/* Multiple WhatsApp Numbers Modal for Footer Trigger */}
      {isWhatsAppModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsWhatsAppModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white text-zinc-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-zinc-200 space-y-5 animate-in zoom-in-95 duration-200"
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
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-zinc-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 transition-all text-start group shadow-sm"
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
    </footer>
  )
}
