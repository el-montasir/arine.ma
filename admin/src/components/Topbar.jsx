import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, LogOut, ExternalLink, Search, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'

export default function Topbar({ onMenu }) {
  const { admin, logout } = useAuth()
  const { pathname } = useLocation()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard')) return t('navDashboard')
    if (pathname.startsWith('/products/new')) return t('newProductTitle')
    if (pathname.startsWith('/products') && pathname.includes('/edit')) return t('editProductTitle')
    if (pathname.startsWith('/products')) return t('navProducts')
    if (pathname.startsWith('/packages/new')) return t('newPackageTitle')
    if (pathname.startsWith('/packages') && pathname.includes('/edit')) return t('editPackageTitle')
    if (pathname.startsWith('/packages')) return t('navPackages')
    if (pathname.startsWith('/categories')) return t('navCategories')
    if (pathname.startsWith('/orders/')) return t('orderDetailsTitle')
    if (pathname.startsWith('/orders')) return t('navOrders')
    if (pathname.startsWith('/customers')) return t('navCustomers')
    if (pathname.startsWith('/finance')) return t('navFinance')
    if (pathname.startsWith('/banners') || pathname.startsWith('/offers')) return t('navBanners')
    if (pathname.startsWith('/admin-team') || pathname.startsWith('/team')) return t('navAdminTeam')
    if (pathname.startsWith('/activity-log') || pathname.startsWith('/logs')) return t('navActivityLog')
    if (pathname.startsWith('/security')) return t('navSecurity')
    if (pathname.startsWith('/store-settings') || pathname.startsWith('/store')) return t('navStoreSettings')
    if (pathname.startsWith('/shipping-settings')) return t('navShippingSettings')
    if (pathname.startsWith('/settings')) return t('navSettings')
    return t('adminPanel')
  }

  const initial = (admin?.name || admin?.username || 'A').trim().charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3.5 bg-[var(--card)] border-b border-[var(--line)] px-4 sm:px-6 py-3">
      {/* Start / Left: Mobile toggle & Search Input */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          aria-label={t('open')}
          className="w-9 h-9 rounded-[9px] border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] flex items-center justify-center cursor-pointer lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="relative hidden md:flex items-center gap-2 bg-[var(--bg)] border border-[var(--line)] rounded-[10px] px-3.5 py-2 w-64 lg:w-72 text-[13px] text-[var(--ink-soft)]">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--ink-soft)]" />
          <input
            type="text"
            placeholder={t('search') || 'Search orders, books…'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                navigate(`/orders?search=${encodeURIComponent(e.target.value.trim())}`)
              }
            }}
            className="w-full bg-transparent border-none outline-none text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-soft)]"
          />
        </div>

        <div className="md:hidden flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)]">
          <span>{getPageTitle()}</span>
        </div>
      </div>

      {/* End / Right: Theme toggle, notifications, Storefront link, Language Switcher, Avatar, Logout */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Public Storefront Link */}
        <a
          href={import.meta.env.VITE_STOREFRONT_URL || '/'}
          target="_blank"
          rel="noopener noreferrer"
          title={t('storefront')}
          aria-label={t('storefront')}
          className="w-9 h-9 rounded-[10px] border border-[var(--line)] bg-[var(--card)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
        </a>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Bell with red dot */}
        <button
          type="button"
          onClick={() => navigate('/activity-log')}
          title={t('navActivityLog')}
          aria-label={t('navActivityLog')}
          className="w-9 h-9 rounded-[10px] border border-[var(--line)] bg-[var(--card)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer relative shrink-0"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full bg-[var(--red)]" />
        </button>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Admin Avatar */}
        <div
          onClick={() => navigate('/security')}
          title={admin?.name || admin?.username}
          className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-white flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer shadow-sm"
        >
          {initial}
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          title={t('logout')}
          aria-label={t('logout')}
          className="w-9 h-9 rounded-[10px] border border-[var(--line)] bg-[var(--card)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
