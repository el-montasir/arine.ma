import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  BookOpen,
  FolderTree,
  Wallet,
  Users,
  Settings,
  BookMarked,
  X,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard', label: 'نظرة عامة', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'الطلبات', icon: ShoppingBag },
  { to: '/products', label: 'الكتب', icon: BookOpen },
  { to: '/categories', label: 'التصنيفات', icon: FolderTree },
  { to: '/finance', label: 'المالية والأرباح', icon: Wallet },
  { to: '/customers', label: 'العملاء', icon: Users },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
]

export function SidebarContent({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="القائمة الرئيسية">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-600/15 text-brand-300'
                : 'text-[#a79cc4] hover:bg-surface-800 hover:text-white'
            }`
          }
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 border-e border-line-soft bg-ink-900 lg:flex lg:flex-col">
        <Brand />
        <SidebarContent />
        <div className="mt-auto p-3">
          <p className="rounded-lg border border-line-soft bg-surface-900/50 px-3 py-2 text-[11px] leading-relaxed text-[#6f6488]">
            تكامل التوصيل (DIGYLOG) سيُفعَّل في مرحلة لاحقة — لا يُرسل شيء لشركات
            التوصيل تلقائياً.
          </p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
          <aside className="absolute inset-y-0 start-0 flex w-64 flex-col bg-ink-900">
            <button
              onClick={onClose}
              aria-label="إغلاق القائمة"
              className="absolute end-3 top-3 rounded-md p-1.5 text-[#8b80a8] hover:bg-surface-800 hover:text-white"
            >
              <X className="h-5 w-5" />
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
  return (
    <div className="flex items-center gap-2.5 border-b border-line-soft px-5 py-4">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white">
        <BookMarked className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-bold leading-none text-white">أرين</p>
        <p className="mt-1 text-[11px] leading-none text-[#8b80a8]">لوحة التحكم</p>
      </div>
    </div>
  )
}