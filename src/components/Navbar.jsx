import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, ShoppingCart, Heart, Menu, X, BookOpen, ChevronLeft, ChevronRight, Package as PackageIcon } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useStoreConfig } from '../hooks/useStoreConfig'

export default function Navbar() {
  const { count, setIsCartOpen, isMenuOpen, setIsMenuOpen, favorites } = useCart()
  const { t, isRTL } = useLanguage()
  const { config } = useStoreConfig()
  const [logoError, setLogoError] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const { pathname } = useLocation()

  const NAV_LINKS = [
    { key: 'home', label: t('home') || 'الرئيسية', to: '/' },
    { key: 'books', label: t('books') || 'الكتب', to: '/shop' },
    { key: 'packages', label: t('packages') || 'الباقات', to: '/packages' },
    { key: 'about', label: t('about') || 'من نحن', to: '/about' },
    { key: 'contact', label: t('contact') || 'تواصل معنا', to: '/contact' },
  ]

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus()
  }, [searchOpen])

  const handleSearch = useCallback(
    (e) => {
      e.preventDefault()
      if (!query.trim()) return
      window.location.href = `/shop?q=${encodeURIComponent(query.trim())}`
      setSearchOpen(false)
      setQuery('')
    },
    [query]
  )

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[72px] gap-4">

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 -mr-1 text-foreground/70 hover:text-brand-700 transition-colors"
              aria-label="القائمة"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center gap-2 select-none">
              {config?.store?.logo && !logoError ? (
                <div className="flex items-center gap-2.5">
                  <img
                    src={config.store.logo}
                    alt={config?.store?.name || t('appName') || 'مكتبة أرين'}
                    className="h-9 lg:h-10 w-auto max-w-[170px] object-contain transition-all"
                    onError={() => setLogoError(true)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="bg-brand-700 w-9 h-9 rounded-xl flex items-center justify-center shadow-md">
                    <BookOpen className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="leading-none">
                    <div className="text-[1.15rem] font-bold text-brand-800 tracking-tight">
                      {config?.store?.name || t('appName') || 'مكتبة أرين'}
                    </div>
                    <div className="text-[0.6rem] text-muted mt-px">
                      {t('appTagline') || 'للكتب والعلوم الشرعية'}
                    </div>
                  </div>
                </div>
              )}
            </Link>

            {/* Desktop nav */}
            <ul className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.to}
                    className={`block px-3.5 py-2 rounded-lg text-[0.88rem] font-medium transition-colors ${
                      pathname === link.to
                        ? 'bg-brand-100 text-brand-700'
                        : 'text-foreground/75 hover:bg-brand-50 hover:text-brand-700'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Search trigger */}
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2.5 rounded-xl text-foreground/65 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                aria-label={t('search') || 'بحث'}
              >
                <Search className="w-[1.15rem] h-[1.15rem]" />
              </button>

              {/* Favorites */}
              <Link
                to="/favorites"
                className="p-2.5 rounded-xl text-foreground/65 hover:bg-brand-50 hover:text-brand-700 transition-colors relative"
                aria-label={t('favorites') || 'المفضلة'}
              >
                <Heart className="w-[1.15rem] h-[1.15rem]" />
                {favorites.length > 0 && (
                  <span
                    key={favorites.length}
                    className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-red-500 text-white text-[0.65rem] font-bold rounded-full flex items-center justify-center shadow-sm pop-in"
                  >
                    {favorites.length}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="p-2.5 rounded-xl text-foreground/65 hover:bg-brand-50 hover:text-brand-700 transition-colors relative"
                aria-label={t('cart') || 'سلة المشتريات'}
              >
                <ShoppingCart className="w-[1.15rem] h-[1.15rem]" />
                {count > 0 && (
                  <span
                    key={count}
                    className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-brand-700 text-white text-[0.65rem] font-bold rounded-full flex items-center justify-center shadow-sm pop-in"
                  >
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-border bg-white">
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.key}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-[0.92rem] font-medium transition-colors ${
                    pathname === link.to
                      ? 'bg-brand-100 text-brand-700'
                      : 'text-foreground/80 hover:bg-brand-50'
                  }`}
                >
                  <span>{link.label}</span>
                  <ChevronIcon className="w-4 h-4 opacity-30" />
                </Link>
              ))}

              <Link
                to="/favorites"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-[0.92rem] font-medium text-foreground/80 hover:bg-brand-50"
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>{t('favorites') || 'المفضلة'}</span>
                </div>
                {favorites.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-bold">
                    {favorites.length}
                  </span>
                )}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[10vh]"
          onClick={() => setSearchOpen(false)}
        >
          <form
            onSubmit={handleSearch}
            className="w-full max-w-[600px] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center border-b border-border px-4">
              <Search className="w-5 h-5 text-muted mx-3 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder={t('searchPlaceholder') || 'ابحث عن كتاب، مؤلف، أو باقة...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 py-4 text-[0.95rem] text-foreground placeholder:text-muted/70 outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-sm text-muted hover:text-brand-700 transition-colors"
                aria-label={t('close') || 'إغلاق'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-[0.78rem] text-muted mb-3">{t('popularSearches') || 'عمليات البحث الشائعة'}</p>
              <div className="flex flex-wrap gap-2">
                {['صحيح البخاري', 'تفسير ابن كثير', 'رياض الصالحين', 'باقة طالب العلم'].map(
                  (term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setQuery(term)
                        window.location.href = `/shop?q=${encodeURIComponent(term)}`
                        setSearchOpen(false)
                      }}
                      className="px-3 py-1.5 bg-brand-50 text-brand-700 text-[0.8rem] rounded-full hover:bg-brand-100 transition-colors font-medium"
                    >
                      {term}
                    </button>
                  )
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
