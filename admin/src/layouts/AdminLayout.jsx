import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import Topbar from '../components/Topbar.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { t } = useLanguage()

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1300px] flex-1 px-4 py-5 sm:px-6 pb-16">
          <Outlet />
        </main>
        <footer className="px-6 py-4 text-center text-[11px] text-[var(--ink-soft)] border-t border-[var(--line)]">
          {t('footerText')}
        </footer>
      </div>
    </div>
  )
}
