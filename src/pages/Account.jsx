import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { User, Package, Heart, Settings, LogOut } from 'lucide-react'
import { useCart } from '../context/CartContext'
import books from '../data/books'
import BookCover from '../components/BookCover'
import { formatPrice } from '../utils/format'

export default function Account() {
  const { favorites, toggleFavorite } = useCart()
  const [view, setView] = useState('login')

  const favoriteBooks = useMemo(
    () => favorites.map((id) => books.find((b) => b.id === id)).filter(Boolean),
    [favorites]
  )

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <h1 className="text-2xl font-bold text-foreground mb-8">حسابي</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-border/60 rounded-2xl p-5">
            <div className="flex items-center gap-4 pb-5 border-b border-border/60 mb-4">
              <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-brand-700" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">ضيف</h3>
                <p className="text-[0.82rem] text-muted">سجّل الدخول لإدارة حسابك</p>
              </div>
            </div>

            <nav className="space-y-1">
              {[
                { icon: Package, label: 'طلباتي', key: 'orders' },
                { icon: Heart, label: 'المفضلة', key: 'favorites', badge: favorites.length },
                { icon: Settings, label: 'إعدادات', key: 'settings' },
                { icon: LogOut, label: 'تسجيل الخروج', key: 'logout' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    if (item.key === 'logout') return
                    setView(item.key)
                  }}
                  className={`flex items-center justify-between w-full px-4 py-3 text-[0.88rem] rounded-xl transition-colors ${
                    view === item.key
                      ? 'bg-brand-100 text-brand-700 font-medium'
                      : 'text-foreground/70 hover:bg-brand-50 hover:text-brand-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-[0.72rem] font-bold rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-2">
          {/* Login */}
          {view === 'login' && (
            <div className="bg-white border border-border/60 rounded-3xl p-6 lg:p-8">
              <h2 className="text-xl font-bold text-foreground mb-2">تسجيل الدخول</h2>
              <p className="text-muted text-[0.88rem] mb-6">سجّل الدخول للوصول إلى حسابك وإدارة طلباتك.</p>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-[0.82rem] text-muted mb-1.5">البريد الإلكتروني أو رقم الهاتف</label>
                  <input
                    type="text"
                    placeholder="mohamed@example.com"
                    className="w-full px-4 py-3.5 bg-[#F3F4F6] border border-border/60 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-400 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[0.82rem] text-muted mb-1.5">كلمة المرور</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 bg-[#F3F4F6] border border-border/60 rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:border-brand-400 focus:bg-white transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-[0.92rem] font-semibold rounded-xl transition-colors"
                >
                  تسجيل الدخول
                </button>
              </form>
              <div className="mt-6 pt-6 border-t border-border/60 text-center">
                <p className="text-[0.85rem] text-muted">
                  ليس لديك حساب؟{' '}
                  <button className="text-brand-700 font-semibold hover:underline">
                    أنشئ حساباً جديداً
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Favorites */}
          {view === 'favorites' && (
            <div className="bg-white border border-border/60 rounded-3xl p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Heart className="w-5 h-5 text-brand-700" />
                <h2 className="text-xl font-bold text-foreground">المفضلة</h2>
                <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-[0.75rem] font-bold rounded-full">
                  {favoriteBooks.length}
                </span>
              </div>

              {favoriteBooks.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-10 h-10 text-brand-300" />
                  </div>
                  <p className="text-foreground font-semibold mb-1">لا توجد كتب في المفضلة</p>
                  <p className="text-muted text-[0.85rem]">أضف الكتب المفضلة من خلال أيكتاب</p>
                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-brand-700 hover:bg-brand-800 text-white font-semibold rounded-xl transition-colors text-[0.88rem]"
                  >
                    تصفح الكتب
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {favoriteBooks.map((book) => (
                    <div
                      key={book.id}
                      className="flex gap-3 p-3 bg-[#FAFAFA] rounded-xl border border-border/40"
                    >
                      <Link to={`/book/${book.id}`} className="flex-shrink-0 w-16">
                        <BookCover book={book} size="sm" className="w-16" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/book/${book.id}`}
                          className="text-[0.85rem] font-semibold text-foreground hover:text-brand-700 transition-colors line-clamp-2 leading-snug"
                        >
                          {book.title}
                        </Link>
                        <p className="text-[0.72rem] text-muted mt-0.5">{book.author}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-brand-700 font-bold text-[0.88rem]">
                            {formatPrice(book.price)}
                          </span>
                          <button
                            onClick={() => toggleFavorite(book.id)}
                            className="p-1.5 hover:bg-brand-50 rounded-lg transition-colors text-red-400 hover:text-red-500"
                            aria-label="إزالة من المفضلة"
                          >
                            <Heart className="w-4 h-4" fill="currentColor" strokeWidth={0} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Orders placeholder */}
          {view === 'orders' && (
            <div className="bg-white border border-border/60 rounded-3xl p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Package className="w-5 h-5 text-brand-700" />
                <h2 className="text-xl font-bold text-foreground">طلباتي</h2>
              </div>
              <div className="py-16 text-center">
                <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-brand-300" />
                </div>
                <p className="text-foreground font-semibold mb-1">لا توجد طلبات بعد</p>
                <p className="text-muted text-[0.85rem]">ابدأ بالتسوق لتجد طلباتك هنا</p>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-brand-700 hover:bg-brand-800 text-white font-semibold rounded-xl transition-colors text-[0.88rem]"
                >
                  تصفح الكتب
                </Link>
              </div>
            </div>
          )}

          {/* Settings placeholder */}
          {view === 'settings' && (
            <div className="bg-white border border-border/60 rounded-3xl p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-5 h-5 text-brand-700" />
                <h2 className="text-xl font-bold text-foreground">الإعدادات</h2>
              </div>
              <div className="py-16 text-center">
                <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-10 h-10 text-brand-300" />
                </div>
                <p className="text-foreground font-semibold mb-1">إدارة الحساب</p>
                <p className="text-muted text-[0.85rem]">سجّل الدخول لإعدادات حسابك</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}