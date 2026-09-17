import { Link } from 'react-router-dom'
import { BookOpen, Globe, Share2, AtSign, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#0F0D15] text-white/70 mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="bg-brand-700 w-9 h-9 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-lg">أرين</div>
                <div className="text-white/50 text-[0.65rem]">مكتبة الكتب الشرعية</div>
              </div>
            </div>
            <p className="text-[0.82rem] leading-relaxed max-w-xs">
              منصة مغربية متخصصة في توفير الكتب الشرعية والمعرفية بأفضل الأسعار، مع توصيل سريع إلى جميع أنحاء المملكة.
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
            <h4 className="text-white font-semibold text-[0.88rem] mb-4">روابط سريعة</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'الرئيسية', to: '/' },
                { label: 'الكتب', to: '/shop' },
                { label: 'من نحن', to: '/about' },
                { label: 'تواصل معنا', to: '/contact' },
              ].map((l) => (
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
            <h4 className="text-white font-semibold text-[0.88rem] mb-4">المساعدة</h4>
            <ul className="space-y-2.5">
              {['سياسة الاستبدال والاسترجاع', 'الشحن والتوصيل', 'الأسئلة الشائعة', 'الشروط والأحكام'].map(
                (label) => (
                  <li key={label}>
                    <a
                      href="#"
                      className="text-[0.82rem] hover:text-brand-400 transition-colors"
                    >
                      {label}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-[0.88rem] mb-4">تواصل معنا</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-[0.82rem]">
                <MapPin className="w-4 h-4 flex-shrink-0 text-brand-400" />
                الدار البيضاء، المغرب
              </li>
              <li className="flex items-center gap-3 text-[0.82rem]">
                <Phone className="w-4 h-4 flex-shrink-0 text-brand-400" />
                +212 600 00 00 00
              </li>
              <li className="flex items-center gap-3 text-[0.82rem]">
                <Mail className="w-4 h-4 flex-shrink-0 text-brand-400" />
                info@arine.ma
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[0.78rem] text-white/50 text-center sm:text-right">
            © 2026 مكتبة أرين للكتب الشرعية. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-4 text-[0.78rem] text-white/50">
            <a href="#" className="hover:text-white/70 transition-colors">الخصوصية</a>
            <a href="#" className="hover:text-white/70 transition-colors">الشروط</a>
          </div>
        </div>
      </div>
    </footer>
  )
}