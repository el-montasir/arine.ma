import { useLocation } from 'react-router-dom'
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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface-900/95 px-4 backdrop-blur-md sm:px-6">
      {/* Start / Left: Mobile toggle & Breadcrumb / Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          aria-label={t('open')}
          className="rounded-xl border border-line bg-surface-800 p-2 text-text-muted transition-colors hover:border-brand-300 hover:text-text-main lg:hidden"
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

      {/* End / Right: Store link, Language Switcher, Theme Toggle, User badge, Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Public Storefront Link */}
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 rounded-xl border border-line bg-surface-800/80 px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-brand-300 hover:text-text-main md:flex"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>{t('storefront')}</span>
        </a>

        {/* Multilingual Selector */}
        <LanguageSwitcher />

        {/* Dark / Light Theme Toggle */}
        <ThemeToggle />

        <div className="h-5 w-[1px] bg-line mx-1 hidden sm:block" />

        {/* Super Admin / Admin Role Badge */}
        <div className="flex items-center">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-600/15 dark:text-brand-400">
            <Shield className="h-3.5 w-3.5" />
            <span>{admin?.role === 'SUPER_ADMIN' ? t('roleSuperAdmin') : t('roleAdmin')}</span>
          </span>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          aria-label={t('logout')}
          className="hover:text-danger-500"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">{t('logout')}</span>
        </Button>
      </div>
    </header>
  )
}
