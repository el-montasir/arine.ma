import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Globe, Share2, AtSign, Mail, Phone, MapPin } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useStoreConfig } from '../hooks/useStoreConfig'

export default function Footer() {
  const { t } = useLanguage()
  const { config } = useStoreConfig()
  const [footerLogoError, setFooterLogoError] = useState(false)

  const quickLinks = [
    { label: t('home'), to: '/' },
    { label: t('books'), to: '/shop' },
    { label: t('about'), to: '/about' },
    { label: t('contact'), to: '/contact' },
  ]

  const helpLinks = [
    t('footerReturnPolicy'),
    t('footerShippingPolicy'),
    t('footerFaq'),
    t('footerTerms'),
  ]

  return (
    <footer className="bg-[#0F0D15] text-white/70 mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              {config?.store?.logo && !footerLogoError ? (
                <img
                  src={config.store.logo}
                  alt={config?.store?.name || t('appName') || 'مكتبة أرين'}
                  className="max-h-11 max-w-[170px] w-auto object-contain brightness-110"
                  onError={() => setFooterLogoError(true)}
                />
              ) : (
                <>
                  <div className="bg-brand-700 w-9 h-9 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg">{config?.store?.name || t('appName')}</div>
                    <div className="text-white/50 text-[0.65rem]">{t('appTagline')}</div>
                  </div>
                </>
              )}
            </div>
            <p className="text-[0.82rem] leading-relaxed max-w-xs">
              {config?.store?.description || t('footerAbout')}
            </p>
            <div className="flex gap-3 mt-5">
              {[Globe, Share2, AtSign].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 bg-white/10 hover:bg-brand-700 rounded-lg flex items-center justify-center transition-colors"
                  aria-label="social"
                >
                  <Icon className="w-4 h-4 text-white/80" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-semibold text-[0.88rem] mb-4">{t('footerQuickLinks')}</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-[0.82rem] hover:text-brand-400 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-white font-semibold text-[0.88rem] mb-4">{t('footerHelp')}</h4>
            <ul className="space-y-2.5">
              {helpLinks.map((label) => (
                <li key={label}>
                  <a
                    href="#"
                    className="text-[0.82rem] hover:text-brand-400 transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-[0.88rem] mb-4">{t('contact')}</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-[0.82rem]">
                <MapPin className="w-4 h-4 flex-shrink-0 text-brand-400" />
                {config?.store?.address || 'الدار البيضاء، المغرب'}
              </li>
              <li className="flex items-center gap-3 text-[0.82rem]">
                <Phone className="w-4 h-4 flex-shrink-0 text-brand-400" />
                <span dir="ltr">{config?.store?.phone || '+212 600 00 00 00'}</span>
              </li>
              <li className="flex items-center gap-3 text-[0.82rem]">
                <Mail className="w-4 h-4 flex-shrink-0 text-brand-400" />
                <span dir="ltr">{config?.store?.email || 'info@arine.ma'}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[0.78rem] text-white/50 text-center sm:text-start">
            {t('footerRights')}
          </p>
          <div className="flex items-center gap-4 text-[0.78rem] text-white/50">
            <a href="#" className="hover:text-white/70 transition-colors">{t('footerPrivacy')}</a>
            <a href="#" className="hover:text-white/70 transition-colors">{t('footerTerms')}</a>
          </div>
        </div>
      </div>
    </footer>
  )
}