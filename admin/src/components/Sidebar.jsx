import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  BookOpen,
  Package,
  FolderTree,
  Wallet,
  Users,
  Megaphone,
  Store,
  Truck,
  Settings,
  BookMarked,
  X,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext.jsx'

export function SidebarContent({ onNavigate }) {
  const { t, isRTL } = useLanguage()

  const NAV_SECTIONS = [
    {
      items: [
        { to: '/dashboard', label: t('navDashboard'), icon: LayoutDashboard, end: true },
      ],
    },
    {
      title: t('navCatalog'),
      items: [
        { to: '/products', label: t('navProducts'), icon: BookOpen },
        { to: '/packages', label: t('navPackages'), icon: Package },
        { to: '/categories', label: t('navCategories'), icon: FolderTree },
      ],
    },
    {
      title: t('navSales'),
      items: [
        { to: '/orders', label: t('navOrders'), icon: ShoppingBag },
        { to: '/customers', label: t('navCustomers'), icon: Users },
        { to: '/finance', label: t('navFinance'), icon: Wallet },
      ],
    },
    {
      title: t('navMarketing'),
      items: [
        { to: '/banners', label: t('navBanners'), icon: Megaphone },
        { to: '/store-settings', label: t('navStoreSettings'), icon: Store },
      ],
    },
    {
      title: t('navSystem'),
      items: [
        { to: '/shipping-settings', label: t('navShippingSettings'), icon: Truck },
        { to: '/settings', label: t('navSettings'), icon: Settings },
      ],
    },
  ]

  return (
    <nav className="flex flex-1 flex-col gap-4 p-3.5 overflow-y-auto" aria-label="Navigation Menu">
      {NAV_SECTIONS.map((section, idx) => (
        <div key={idx} className="space-y-1">
          {section.title && (
            <p className="px-3 py-1 text-[11px] font-bold text-text-subtle uppercase tracking-wider">
              {section.title}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-600/15 text-brand-400 font-bold border border-brand-500/30 shadow-sm'
                      : 'text-text-muted hover:bg-surface-800 hover:text-text-main border border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" aria-hidden="true" />
                  <span>{label}</span>
                </div>
                {isRTL ? (
                  <ChevronLeft className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

export default function Sidebar({ open, onClose }) {
  const { t } = useLanguage()

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-e border-line bg-surface-900 lg:flex lg:flex-col shadow-sm">
        <Brand />
        <SidebarContent />
        <div className="mt-auto p-3.5 border-t border-line">
          <div className="rounded-xl border border-line bg-surface-800/60 p-3 text-[11px] leading-relaxed text-text-muted">
            <p className="font-semibold text-text-main mb-0.5">⚡ {t('appName')} v2.5</p>
            <p className="text-[10px] text-text-subtle">{t('appTagline')}</p>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <aside className="absolute inset-y-0 start-0 flex w-72 flex-col bg-surface-900 shadow-2xl border-e border-line">
            <button
              onClick={onClose}
              aria-label={t('close')}
              className="absolute end-3.5 top-4 rounded-xl border border-line bg-surface-800 p-2 text-text-muted hover:text-text-main"
            >
              <X className="h-4 w-4" />
            </button>
            <Brand />
            <SidebarContent onNavigate={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  )
}

function Brand() {
  const { t } = useLanguage()

  return (
    <div className="flex items-center gap-3 border-b border-line px-5 py-4.5 bg-surface-900">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white shadow-md shadow-brand-600/25">
        <BookMarked className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-bold leading-tight text-text-main">{t('appName')}</p>
        <p className="text-[11px] font-medium leading-tight text-text-muted mt-0.5">{t('adminPanel')}</p>
      </div>
    </div>
  )
}
