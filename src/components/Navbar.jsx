import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, ShoppingCart, User, Menu, X, BookOpen, ChevronLeft } from 'lucide-react'
import { useCart } from '../context/CartContext'

const NAV_LINKS = [
  { key: 'home', label: 'الرئيسية', to: '/' },
  { key: 'books', label: 'الكتب', to: '/shop' },
  { key: 'categories', label: 'التصنيفات', to: '/shop' },
  { key: 'about', label: 'من نحن', to: '/about' },
  { key: 'contact', label: 'تواصل معنا', to: '/contact' },
]

export default function Navbar() {
  const { count, setIsCartOpen, isMenuOpen, setIsMenuOpen } = useCart()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const { pathname } = useLocation()

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
              <div className="flex items-center gap-2.5">
                <div className="bg-brand-700 w-9 h-9 rounded-xl flex items-center justify-center shadow-md">
                  <BookOpen className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div className="leading-none">
                  <div className="text-[1.15rem] font-bold text-brand-800 tracking-tight">أرين</div>
                  <div className="text-[0.6rem] text-muted mt-px">مكتبة الكتب الشرعية</div>
                </div>
              </div>
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
            <div className="flex items-center gap-1.5">
              {/* Search trigger */}
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2.5 rounded-xl text-foreground/65 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                aria-label="بحث"
              >
                <Search className="w-[1.15rem] h-[1.15rem]" />
              </button>

              {/* Cart */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="p-2.5 rounded-xl text-foreground/65 hover:bg-brand-50 hover:text-brand-700 transition-colors relative"
                aria-label="سلة المشتريات"
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

              {/* Account */}
              <Link
                to="/account"
                className="hidden sm:flex p-2.5 rounded-xl text-foreground/65 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                aria-label="حسابي"
              >
                <User className="w-[1.15rem] h-[1.15rem]" />
              </Link>
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
                  <ChevronLeft className="w-4 h-4 opacity-30" />
                </Link>
              ))}
              <Link
                to="/account"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[0.92rem] font-medium text-foreground/80 hover:bg-brand-50 sm:hidden"
              >
                <User className="w-4 h-4" />
                <span>حسابي</span>
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
              <Search className="w-5 h-5 text-muted ml-3 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="ابحث عن كتاب أو مؤلف..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 py-4 text-[0.95rem] text-foreground placeholder:text-muted/70 outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-sm text-muted hover:text-brand-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-[0.78rem] text-muted mb-3">بحث شائع</p>
              <div className="flex flex-wrap gap-2">
                {['صحيح البخاري', 'تفسير ابن كثير', 'الأربعين النووية'].map(
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