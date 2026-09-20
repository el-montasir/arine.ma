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
  UserCog,
  History,
  ShieldCheck,
  Activity,
  Target,
  Database,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export function SidebarContent({ onNavigate }) {
  const { t } = useLanguage()
  const { can, isOwner } = useAuth()

  const ALL_SECTIONS = [
    {
      title: t('navMain') || 'Main',
      items: [
        {
          to: '/dashboard',
          label: t('navDashboard'),
          icon: LayoutDashboard,
          end: true,
          permission: 'DASHBOARD_VIEW',
        },
      ],
    },
    {
      title: t('navCatalog') || 'Catalog',
      items: [
        {
          to: '/products',
          label: t('navProducts'),
          icon: BookOpen,
          permission: 'PRODUCTS_VIEW',
        },
        {
          to: '/packages',
          label: t('navPackages'),
          icon: Package,
          permission: 'PACKAGES_VIEW',
        },
        {
          to: '/categories',
          label: t('navCategories'),
          icon: FolderTree,
          permission: 'CATEGORIES_VIEW',
        },
      ],
    },
    {
      title: t('navSales') || 'Sales',
      items: [
        {
          to: '/orders',
          label: t('navOrders'),
          icon: ShoppingBag,
          permission: 'ORDERS_VIEW',
        },
        {
          to: '/customers',
          label: t('navCustomers'),
          icon: Users,
          permission: 'CUSTOMERS_VIEW',
        },
        {
          to: '/finance',
          label: t('navFinance'),
          icon: Wallet,
          permission: 'FINANCE_VIEW',
        },
      ],
    },
    {
      title: t('navMarketing') || 'Marketing & Meta Ads',
      items: [
        {
          to: '/marketing',
          label: t('navMarketingOverview') || 'Marketing Overview',
          icon: LayoutDashboard,
          end: true,
          permission: 'MARKETING_VIEW',
        },
        {
          to: '/marketing/campaigns',
          label: t('navMarketingCampaigns') || 'Meta Campaigns',
          icon: Megaphone,
          permission: 'MARKETING_VIEW',
        },
        {
          to: '/marketing/tracking',
          label: t('navMarketingTracking') || 'Tracking & CAPI',
          icon: Activity,
          permission: 'MARKETING_VIEW',
        },
        {
          to: '/marketing/attribution',
          label: t('navMarketingAttribution') || 'Attribution',
          icon: Target,
          permission: 'MARKETING_VIEW',
        },
        {
          to: '/marketing/catalog',
          label: t('navMarketingCatalog') || 'Product Catalog',
          icon: Database,
          permission: 'MARKETING_VIEW',
        },
        {
          to: '/marketing/settings',
          label: t('navMarketingSettings') || 'Meta Settings',
          icon: ShieldCheck,
          permission: 'MARKETING_VIEW',
        },
      ],
    },
    {
      title: t('navStoreSettings') || 'Storefront',
      items: [
        {
          to: '/banners',
          label: t('navBanners'),
          icon: Megaphone,
          permission: 'BANNERS_VIEW',
        },
        {
          to: '/store-settings',
          label: t('navStoreSettings'),
          icon: Store,
          permission: 'STORE_SETTINGS_VIEW',
        },
      ],
    },
    {
      title: t('navAdminTeam') || 'Admin',
      items: [
        {
          to: '/admin-team',
          label: t('navAdminTeam'),
          icon: UserCog,
          permission: 'ADMIN_USERS_VIEW',
        },
        {
          to: '/activity-log',
          label: t('navActivityLog'),
          icon: History,
          permission: 'ACTIVITY_LOG_VIEW',
        },
        {
          to: '/security',
          label: t('navSecurity'),
          icon: ShieldCheck,
          permission: null,
        },
      ],
    },
    {
      title: t('navSystem') || 'System',
      items: [
        {
          to: '/shipping-settings',
          label: t('navShippingSettings'),
          icon: Truck,
          permission: 'SHIPPING_VIEW',
        },
        {
          to: '/settings',
          label: t('navSettings'),
          icon: Settings,
          permission: null,
        },
      ],
    },
  ]

  const visibleSections = ALL_SECTIONS.map((section) => {
    const visibleItems = section.items.filter((item) => {
      if (isOwner) return true
      if (!item.permission) return true
      return can(item.permission)
    })
    return { ...section, items: visibleItems }
  }).filter((section) => section.items.length > 0)

  return (
    <nav className="flex flex-1 flex-col gap-3.5 px-3.5 py-2 overflow-y-auto" aria-label="Navigation Menu">
      {visibleSections.map((section, idx) => (
        <div key={idx} className="space-y-0.5">
          {section.title && (
            <p className="px-2.5 pb-1.5 pt-2 text-[10.5px] font-bold text-[var(--ink-soft)] uppercase tracking-[0.6px]">
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
                  `flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[13.5px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[var(--purple)] text-white font-semibold shadow-[0_6px_14px_-4px_rgba(124,58,237,0.45)]'
                      : 'text-[var(--ink-soft)] hover:bg-[var(--bg)] hover:text-[var(--ink)]'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-[246px] shrink-0 border-inline-end border-[var(--line)] bg-[var(--card)] lg:flex lg:flex-col sticky top-0 h-screen overflow-y-auto">
        <Brand />
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <aside className="absolute inset-y-0 start-0 flex w-[260px] flex-col bg-[var(--card)] shadow-2xl border-inline-end border-[var(--line)]">
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute end-3.5 top-4 rounded-[9px] border border-[var(--line)] bg-[var(--card)] p-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)]"
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
    <div className="flex items-center gap-2.5 px-4 py-4.5 mb-1 bg-[var(--card)]">
      <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] flex items-center justify-center text-white shrink-0 shadow-sm">
        <BookMarked className="h-4.5 w-4.5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="text-base font-extrabold text-[var(--ink)] leading-tight tracking-tight">
          {t('appName')}
        </div>
        <div className="text-[10.5px] text-[var(--ink-soft)] font-medium leading-tight mt-0.5">
          {t('adminPanel')}
        </div>
      </div>
    </div>
  )
}
