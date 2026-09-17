import { useLocation } from 'react-router-dom'
import { Menu, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Button from './ui/Button.jsx'

const TITLES = [
  ['/dashboard', 'نظرة عامة'],
  ['/orders', 'الطلبات'],
  ['/products', 'الكتب'],
  ['/categories', 'التصنيفات'],
  ['/finance', 'المالية والأرباح'],
  ['/customers', 'العملاء'],
  ['/settings', 'الإعدادات'],
]

export default function Topbar({ onMenu }) {
  const { admin, logout } = useAuth()
  const { pathname } = useLocation()
  const active = TITLES.find(([prefix]) => pathname.startsWith(prefix))
  const title = active ? active[1] : 'لوحة التحكم'

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line-soft bg-ink-950/85 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          aria-label="القائمة"
          className="rounded-md p-1.5 text-[#a79cc4] hover:bg-surface-800 hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-end sm:block">
          <p className="text-sm font-medium text-white">{admin?.name || admin?.username}</p>
          <p className="text-[11px] text-[#8b80a8]">{admin?.role === 'SUPER_ADMIN' ? 'مدير عام' : 'مدير'}</p>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface-800 text-sm font-bold text-brand-400">
          {(admin?.name || admin?.username || 'م').slice(0, 1)}
        </div>
        <Button variant="ghost" size="sm" onClick={logout} aria-label="تسجيل الخروج">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">خروج</span>
        </Button>
      </div>
    </header>
  )
}