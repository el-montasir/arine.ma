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
    <div className="relative flex min-h-screen items-center justify-center p-4 bg-[var(--bg)] text-[var(--ink)]">
      {/* Top right quick controls */}
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-6 flex flex-col items-center gap-2.5 text-center">
          <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] flex items-center justify-center text-white shadow-lg shadow-[var(--purple)]/20">
            <BookMarked className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--ink)]">{t('appName')}</h1>
            <p className="mt-0.5 text-xs text-[var(--ink-soft)] font-medium">{t('appTagline')}</p>
          </div>
        </div>

        {/* Login form */}
        <div className="card-ref p-6 sm:p-8">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[var(--ink)]">{t('loginTitle')}</h2>
            <p className="text-xs text-[var(--ink-soft)] mt-1">{t('loginSubtitle')}</p>
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
          <div className="mt-5 rounded-[10px] border border-[var(--line)] bg-[var(--bg)] p-3 text-center">
            <p className="text-[11px] font-mono text-[var(--ink-soft)]">
              {t('loginDemoHint')}
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-[var(--ink-soft)]">
          <ShieldCheck className="h-4 w-4 text-[var(--green)]" />
          <span>{t('secureSession')}</span>
        </div>
      </div>
    </div>
  )
}
