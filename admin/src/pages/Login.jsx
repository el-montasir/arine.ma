import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

/* Inline SVG emblem — a terminal/mainframe glyph. No external assets, so CSP
   (img-src 'self' data: blob:) is untouched and no favicon/branding changes. */
function GameEmblem() {
  return (
    <svg
      viewBox="0 0 96 96"
      className="h-[74px] w-[74px] sm:h-[86px] sm:w-[86px]"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cyberEmblem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="55%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect
        x="4.5"
        y="4.5"
        width="87"
        height="87"
        rx="16"
        stroke="url(#cyberEmblem)"
        strokeWidth="1.5"
        opacity="0.75"
      />
      {/* corner ticks */}
      <path d="M4.5 22V12a7.5 7.5 0 0 1 7.5-7.5H22" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
      <path d="M74 4.5h10.5A7.5 7.5 0 0 1 92 12v10" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
      <path d="M92 74v10a7.5 7.5 0 0 1-7.5 7.5H74" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 92H12a7.5 7.5 0 0 1-7.5-7.5V74" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
      {/* monitor / mainframe body */}
      <rect
        x="22"
        y="26"
        width="52"
        height="34"
        rx="4"
        stroke="url(#cyberEmblem)"
        strokeWidth="2.5"
      />
      {/* screen glow */}
      <rect x="28" y="32" width="40" height="22" rx="2" fill="#a855f7" opacity="0.14" />
      {/* prompt chevron + cursor on screen */}
      <path
        d="M34 38.5l6 5.5-6 5.5"
        stroke="#e9d5ff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="45" y="45" width="12" height="2.5" rx="1.25" fill="#e9d5ff" />
      {/* stand */}
      <path d="M48 60v9" stroke="url(#cyberEmblem)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M35 72h26" stroke="url(#cyberEmblem)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function BootLog({ lines }) {
  return (
    <ul className="space-y-2.5 font-mono text-[11px] leading-relaxed">
      {lines.map((line, i) => (
        <li
          key={line}
          className="cyber-fade flex items-center gap-2 text-[#8d7ba8]"
          style={{ animationDelay: `${i * 140}ms` }}
        >
          <span className="text-[#a855f7]">&gt;</span>
          <span className={i === lines.length - 1 ? 'text-[#34d399]' : undefined}>{line}</span>
        </li>
      ))}
    </ul>
  )
}

function SystemPanel({ title, modules }) {
  return (
    <div className="cyber-panel w-[210px] p-4">
      <div className="flex items-center gap-2 border-b border-[rgba(168,85,247,0.18)] pb-2.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#a855f7] shadow-[0_0_8px_rgba(168,85,247,0.9)] cyber-pulse" />
        <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#d8c4f5]">{title}</span>
      </div>
      <ul className="mt-3 space-y-2.5 font-mono text-[11px]">
        {modules.map((m) => (
          <li key={m} className="flex items-center gap-2.5 text-[#8d7ba8]">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 flex-none border border-[rgba(168,85,247,0.55)]"
            />
            <span className="tracking-[0.12em]">{m}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-[rgba(168,85,247,0.18)] pt-3 font-mono text-[10px] tracking-[0.16em] text-[#6b5a86]">
        NODE::07-AR
      </div>
    </div>
  )
}

/* Decorative boot lines shown while the request is in flight. These are purely
   cosmetic: the terminal verdict below is decided by the real login() result,
   never by a timer. */
const BOOT_STEP_MS = 340
const RESULT_HOLD_MS = 850

function LoginTerminal({ lines, result }) {
  const tone = {
    pending: 'text-[#a78bc9]',
    granted: 'text-[#34d399]',
    denied: 'text-[#fda4af]',
  }[result || 'pending']

  // React style props must be objects, never CSS strings — a string here
  // throws "The style prop expects a mapping from style properties to values"
  // (React error #62) the moment this component renders.
  const glow =
    result === 'granted'
      ? { textShadow: '0 0 10px rgba(52, 211, 153, 0.55)' }
      : result === 'denied'
        ? { textShadow: '0 0 10px rgba(251, 113, 133, 0.5)' }
        : undefined

  return (
    <div
      className="mt-6 min-h-[132px] rounded-[12px] border border-[rgba(168,85,247,0.22)] bg-[rgba(10,6,18,0.6)] p-3.5"
      role="status"
      aria-live="polite"
    >
      <ul className="space-y-1.5 font-mono text-[12px] leading-relaxed">
        {lines.map((line, i) => (
          <li
            key={line}
            className="cyber-fade flex items-center gap-2"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span className="text-[#a855f7]">&gt;</span>
            <span className={tone} style={glow}>
              {line}
              {i === lines.length - 1 && result !== 'denied' ? (
                <span className="cyber-cursor" aria-hidden="true" />
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Login() {
  const { login } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | pending | granted | denied
  const [visibleSteps, setVisibleSteps] = useState(0)

  async function onSubmit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setPhase('pending')
    setVisibleSteps(0)

    // Decorative boot sequence, advanced on its own timer. It is intentionally
    // NOT awaited: the verdict must never depend on a timer.
    const stepTimer = setInterval(() => {
      setVisibleSteps((n) => Math.min(n + 1, 3))
    }, BOOT_STEP_MS)

    let ok = false
    try {
      await login(identifier.trim(), password)
      ok = true
    } catch {
      // Generic terminal state only. The API error is deliberately not
      // rendered: its message could hint at which credential was wrong.
      setError(t('loginError'))
    }

    // Let the boot lines land and the verdict be read before acting on it.
    const resultTimer = setTimeout(() => {
      setPhase(ok ? 'granted' : 'denied')
    }, BOOT_STEP_MS * 2)

    // Shortest safe hold: the real result is already known here, so this is a
    // fixed visual pause, not a guess.
    setTimeout(() => {
      clearInterval(stepTimer)
      clearTimeout(resultTimer)
      if (ok) {
        const from = location.state?.from?.pathname || '/dashboard'
        navigate(from, { replace: true })
      } else {
        setBusy(false)
        setError('')
      }
    }, RESULT_HOLD_MS)
  }

  const bootLines = [t('gameBoot1'), t('gameBoot2'), t('gameBoot3'), t('gameBoot4')]
  const modules = t('gameModules') || ['CORE', 'SECTOR', 'MODULES', 'PLAYERS', 'CONFIG']

  let terminalLines = []
  let terminalResult = null
  if (phase === 'pending' || phase === 'granted') {
    const all = [
      ...bootLines.slice(0, 3),
      t('gameGranted'),
      t('gameLoginSuccess'),
      t('gameWelcome'),
    ]
    terminalLines = phase === 'granted' ? all : all.slice(0, visibleSteps)
    terminalResult = phase === 'granted' ? 'granted' : 'pending'
  } else if (phase === 'denied') {
    terminalLines = [t('gameDenied'), t('gameLoginFailed'), t('gameTryAgain')]
    terminalResult = 'denied'
  }

  return (
    <div className="cyber-root cyber-scan relative min-h-screen w-full overflow-hidden bg-[#0a0612] font-mono text-[#e9dcf7]">
      {/* Backdrop: grid, horizon glow, dotted globe, glitch lines — all CSS/SVG */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(168,85,247,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.07) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[420px]"
          style={{
            background:
              'radial-gradient(70% 60% at 50% 0%, rgba(124,58,237,0.28) 0%, rgba(168,85,247,0.08) 45%, transparent 75%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[300px] opacity-40"
          style={{
            background:
              'radial-gradient(60% 100% at 50% 120%, rgba(109,40,217,0.35) 0%, transparent 70%)',
          }}
        />

        {/* dotted globe / world-map inspired decoration */}
        <svg className="absolute -left-24 top-1/2 h-[560px] w-[560px] -translate-y-1/2 opacity-25" viewBox="0 0 400 400" fill="none">
          <defs>
            <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.3" fill="#a855f7" />
            </pattern>
            <clipPath id="globeClip">
              <circle cx="200" cy="200" r="150" />
            </clipPath>
          </defs>
          <g clipPath="url(#globeClip)" opacity="0.85">
            <rect x="0" y="0" width="400" height="400" fill="url(#dots)" />
            <path
              d="M40 118c48-30 96 4 140-14s74-44 130-30v70c-58 4-84 44-136 40s-88-24-134-6z"
              fill="#0a0612"
              opacity="0.55"
            />
            <path d="M96 214c46 6 62 44 118 42s72-30 122-14v70c-52 26-96 4-146 12s-78 26-94 4z" fill="#0a0612" opacity="0.5" />
          </g>
          <circle cx="200" cy="200" r="150" stroke="#7c3aed" strokeWidth="1" opacity="0.5" />
          <circle cx="200" cy="200" r="112" stroke="#7c3aed" strokeWidth="0.75" opacity="0.35" />
          <ellipse cx="200" cy="200" rx="66" ry="150" stroke="#7c3aed" strokeWidth="0.75" opacity="0.3" />
          <path d="M50 200h300" stroke="#7c3aed" strokeWidth="0.75" opacity="0.3" />
        </svg>

        {/* glitch / scan lines */}
        <div className="absolute inset-x-0 top-[28%] h-px bg-gradient-to-r from-transparent via-[rgba(168,85,247,0.5)] to-transparent" />
        <div className="absolute inset-x-0 top-[63%] h-px bg-gradient-to-r from-transparent via-[rgba(168,85,247,0.28)] to-transparent" />
      </div>

      {/* Language + theme controls */}
      <div className="absolute top-4 end-4 z-30 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      {/* Desktop: left log | center card | right system panel */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1180px] items-center justify-center gap-8 px-4 py-20 lg:justify-between lg:gap-6 lg:px-8">
        <aside className="hidden w-[210px] shrink-0 lg:block" aria-hidden="true">
          <BootLog lines={bootLines} />
        </aside>

        <div className="w-full max-w-[420px]">
          {/* Emblem + heading */}
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="cyber-pulse">
              <GameEmblem />
            </div>
            <h1 className="mt-4 text-[19px] font-bold tracking-[0.2em] text-[#f3e9ff] sm:text-[22px] sm:tracking-[0.24em]">
              {t('gameHeading')}
              <span className="cyber-cursor" aria-hidden="true" />
            </h1>
            <p className="mt-2 font-mono text-[10px] tracking-[0.28em] text-[#6b5a86]">TERMINAL v2.6 // ONLINE</p>
          </div>

          {/* Login card */}
          <div className="cyber-frame cyber-corners p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-2 border-b border-[rgba(168,85,247,0.16)] pb-3 font-mono text-[10px] tracking-[0.22em] text-[#8d7ba8]">
              <span className="text-[#a855f7]">&gt;</span>
              <span>AUTH_GATE</span>
              <span className="ms-auto text-[#34d399]">OPEN</span>
            </div>

            {error && !terminalResult ? (
              <div
                role="alert"
                className="mb-4 rounded-[10px] border border-[rgba(251,113,133,0.5)] bg-[rgba(251,113,133,0.09)] px-3.5 py-2.5 font-mono text-[11.5px] text-[#fda4af]"
              >
                <span className="me-1.5 text-[#fb7185]">!</span>
                {error}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-5" aria-label={t('gameHeading')}>
              <div>
                <label
                  htmlFor="game-player"
                  className="mb-2 block font-mono text-[12px] tracking-[0.08em] text-[#a78bc9]"
                >
                  {t('gamePlayerField')}
                  <span className="text-[#a855f7]">_</span>
                </label>
                <div className="cyber-field">
                  <input
                    id="game-player"
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    spellCheck="false"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={t('gamePlayerPlaceholder')}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="game-level"
                  className="mb-2 block font-mono text-[12px] tracking-[0.08em] text-[#a78bc9]"
                >
                  {t('gameLevelField')}
                  <span className="text-[#a855f7]">_</span>
                </label>
                <div className="cyber-field">
                  <input
                    id="game-level"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('gameLevelPlaceholder')}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="cyber-btn mt-7" disabled={busy}>
                <span aria-hidden="true" className="text-[#c084fc]">
                  &gt;&gt;
                </span>
                <span>
                  {phase === 'pending'
                    ? t('gameConnectingBtn')
                    : phase === 'granted'
                      ? t('gameGranted')
                      : t('gameEnterBtn')}
                </span>
                <span aria-hidden="true" className="text-[#c084fc]">
                  &gt;&gt;
                </span>
              </button>
            </form>

            {terminalLines.length > 0 ? (
              <LoginTerminal lines={terminalLines} result={terminalResult} />
            ) : null}
          </div>

          {/* Secure session status */}
          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center font-mono text-[10px] tracking-[0.18em] text-[#8d7ba8]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            <span>{t('gameFooter')}</span>
          </p>
        </div>

        <aside className="hidden shrink-0 lg:block" aria-hidden="true">
          <SystemPanel title={t('gameSystemMode')} modules={modules} />
        </aside>
      </div>
    </div>
  )
}
