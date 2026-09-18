import { useLocation, Link } from 'react-router-dom'
import { Menu, LogOut, ExternalLink, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import Button from './ui/Button.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'

export default function Topbar({ onMenu }) {
  const { admin, logout } = useAuth()
  const { pathname } = useLocation()
  const { t } = useLanguage()

  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard')) return t('navDashboard')
    if (pathname.startsWith('/products/new')) return t('newProductTitle')
    if (pathname.includes('/edit')) return t('editProductTitle')
    if (pathname.startsWith('/products')) return t('navProducts')
    if (pathname.startsWith('/categories')) return t('navCategories')
    if (pathname.startsWith('/orders/')) return t('orderNumber')
    if (pathname.startsWith('/orders')) return t('navOrders')
    if (pathname.startsWith('/customers')) return t('navCustomers')
    if (pathname.startsWith('/finance')) return t('navFinance')
    if (pathname.startsWith('/banners') || pathname.startsWith('/offers')) return t('navBanners')
    if (pathname.startsWith('/store-settings') || pathname.startsWith('/store')) return t('navStoreSettings')
    if (pathname.startsWith('/shipping-settings')) return t('navShippingSettings')
    if (pathname.startsWith('/settings')) return t('navSettings')
    return t('adminPanel')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface-900/90 px-4 backdrop-blur-md sm:px-6">
      {/* Start / Left: Mobile toggle & Breadcrumb / Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          aria-label="Toggle Navigation Menu"
          className="rounded-xl border border-line bg-surface-800 p-2 text-text-muted transition-colors hover:border-brand-500/50 hover:text-text-main lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-medium text-text-muted sm:inline">
            {t('appName')} /
          </span>
          <h1 className="text-sm font-bold text-text-main sm:text-base">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* End / Right: Store link, Language Switcher, Theme Toggle, User info, Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Public Storefront Link */}
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 rounded-xl border border-line bg-surface-800/80 px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-brand-500/40 hover:text-text-main md:flex"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>{t('storefront')}</span>
        </a>

        {/* Multilingual Selector */}
        <LanguageSwitcher />

        {/* Dark / Light Theme Toggle */}
        <ThemeToggle />

        <div className="h-5 w-[1px] bg-line mx-1 hidden sm:block" />

        {/* User Info & Role */}
        <div className="hidden text-end sm:block">
          <p className="text-xs font-semibold text-text-main leading-tight">
            {admin?.name || admin?.username || t('roleAdmin')}
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] text-brand-400 font-medium">
            <Shield className="h-2.5 w-2.5" />
            {admin?.role === 'SUPER_ADMIN' ? 'Super Admin' : t('roleAdmin')}
          </span>
        </div>

        <div className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-brand-600/15 text-xs font-bold text-brand-400 shadow-sm">
          {(admin?.name || admin?.username || 'A').slice(0, 1).toUpperCase()}
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          aria-label={t('logout')}
          className="hover:text-danger-400"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">{t('logout')}</span>
        </Button>
      </div>
    </header>
  )
}
