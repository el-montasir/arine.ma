import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import Topbar from '../components/Topbar.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { t } = useLanguage()

  return (
    <div className="app-bg flex min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
        <footer className="px-6 py-4 text-center text-[11px] text-text-subtle">
          {t('footerText')}
        </footer>
      </div>
    </div>
  )
}
