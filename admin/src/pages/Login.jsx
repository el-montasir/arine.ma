import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BookMarked, Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import Button from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

export default function Login() {
  const { login } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await login(identifier.trim(), password)
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || t('loginError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-bg relative flex min-h-screen items-center justify-center p-4">
      {/* Top right quick controls */}
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white shadow-lg shadow-brand-600/30">
            <BookMarked className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-main">{t('appName')}</h1>
            <p className="mt-1 text-sm text-text-muted">{t('appTagline')}</p>
          </div>
        </div>

        {/* Login form */}
        <div className="rounded-2xl border border-line bg-surface-900 p-6 sm:p-8 shadow-xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-text-main">{t('loginTitle')}</h2>
            <p className="text-xs text-text-muted mt-1">{t('loginSubtitle')}</p>
          </div>

          <ErrorBanner message={error} />

          <form onSubmit={onSubmit} className="space-y-4" aria-label="Sign In Form">
            <Input
              label={t('emailOrUsernameField')}
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@arine.ma or username"
              required
            />
            <Input
              label={t('passwordField')}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button type="submit" size="lg" disabled={busy} className="mt-6 w-full">
              <Lock className="h-4 w-4" aria-hidden="true" />
              {busy ? t('loading') : t('loginBtn')}
            </Button>
          </form>

          {/* Demo helper */}
          <div className="mt-6 rounded-xl border border-line bg-surface-800/70 p-3 text-center">
            <p className="text-[11px] font-mono text-text-muted">
              {t('loginDemoHint')}
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-text-subtle">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>{t('secureSession')}</span>
        </div>
      </div>
    </div>
  )
}
