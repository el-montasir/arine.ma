import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

export default function Login() {
  const { login } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const redirectTo = location.state?.from?.pathname || '/dashboard'

  async function onSubmit(e) {
    e.preventDefault()
    if (busy) return
    if (!identifier.trim() || !password) {
      setError(t('loginError') || 'Please fill in all fields')
      return
    }
    setBusy(true)
    setError('')
    try {
      await login(identifier.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err?.message || t('loginError') || 'Invalid credentials')
      setBusy(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#0a0714]">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-1/4 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 end-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Language & Theme Controls */}
      <div className="absolute top-4 end-4 z-30 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      {/* Centered Glass Card */}
      <div className="relative z-10 w-full max-w-[420px] rounded-[24px] border border-white/10 bg-[#101323]/80 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl">
        {/* Store Branding Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <img
            src="/logo.png"
            alt="Arine"
            className="h-14 w-auto object-contain drop-shadow-md"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              {t('emailOrUsernameField') || 'Email or Username'}
            </label>
            <div className="relative flex items-center">
              <div className="absolute start-3.5 text-white/40 pointer-events-none">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="identifier"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t('emailOrUsernameField') || 'admin@arine.ma'}
                className="w-full h-11 ps-10 pe-4 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              {t('passwordField') || 'Password'}
            </label>
            <div className="relative flex items-center">
              <div className="absolute start-3.5 text-white/40 pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 ps-10 pe-10 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute end-3 text-white/40 hover:text-white/80 transition-colors p-1 cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500/30 cursor-pointer"
              />
              <span className="text-xs text-white/60 hover:text-white/80 transition-colors">
                {t('rememberMe') || 'Remember me'}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/25 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('loadingData') || 'Signing in...'}</span>
              </>
            ) : (
              <span>{t('loginBtn') || 'Sign In'}</span>
            )}
          </button>
        </form>

        {/* Footer notice */}
        <p className="text-center text-[11px] text-white/40 mt-6">
          {t('secureSession') || 'Secure administrative session'}
        </p>
      </div>
    </div>
  )
}
