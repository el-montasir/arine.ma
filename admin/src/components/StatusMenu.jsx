import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { getOrderStatus } from '../lib/format.js'
import { useLanguage } from '../context/LanguageContext.jsx'

const STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'RETURNED']
// Same tokens as the status badges (index.css .status-*).
const DOT = {
  'status-warn': 'var(--orange)',
  'status-brand': 'var(--blue)',
  'status-info': 'var(--purple)',
  'status-ok': 'var(--green)',
  'status-danger': 'var(--red)',
  'status-neutral': 'var(--ink-soft)',
}
const MENU_WIDTH = 208

// Order status as a badge that opens a menu: a popover on desktop, a bottom
// sheet on phones. Rendered in a portal so table scrolling never clips it.
export default function StatusMenu({ status, onChange, busy = false }) {
  const { t, isRTL } = useLanguage()
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const [mobile, setMobile] = useState(false)

  const meta = getOrderStatus(status, t)

  // Desktop placement under the badge, flipped above when near the bottom.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const isMobile = window.innerWidth < 640
      setMobile(isMobile)
      if (isMobile || !btnRef.current) return
      const r = btnRef.current.getBoundingClientRect()
      const menuH = menuRef.current?.offsetHeight || 280
      const below = r.bottom + 6 + menuH <= window.innerHeight
      const left = isRTL ? Math.max(8, r.right - MENU_WIDTH) : Math.min(r.left, window.innerWidth - MENU_WIDTH - 8)
      setPos({ left, top: below ? r.bottom + 6 : Math.max(8, r.top - 6 - menuH) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, isRTL])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (next) => {
    setOpen(false)
    if (next !== status) onChange(next)
  }

  const items = STATUSES.map((s) => {
    const m = getOrderStatus(s, t)
    const current = s === status
    return (
      <button
        key={s}
        type="button"
        role="menuitemradio"
        aria-checked={current}
        onClick={() => pick(s)}
        className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 text-start font-semibold transition-colors ${
          mobile ? 'py-3.5 text-sm' : 'py-2 text-xs'
        } ${current ? 'bg-[var(--purple-bg)] text-[var(--purple)]' : 'text-[var(--ink)] hover:bg-[var(--bg)]'}`}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DOT[m.color] }} aria-hidden="true" />
        <span className="flex-1">{m.label}</span>
        {current ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      </button>
    )
  })

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('orderStatus')}: ${meta.label}`}
        onClick={(e) => {
          e.stopPropagation()
          setMobile(window.innerWidth < 640)
          setOpen((o) => !o)
        }}
        className={`badge ${meta.color} cursor-pointer gap-1 transition-shadow hover:shadow-[0_0_0_3px_var(--line)] disabled:cursor-wait`}
      >
        {meta.label}
        {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />}
      </button>

      {open
        ? createPortal(
            mobile ? (
              <div className="fixed inset-0 z-[60] flex items-end bg-black/40 backdrop-blur-[2px]" onClick={(e) => e.stopPropagation()}>
                <div
                  ref={menuRef}
                  role="menu"
                  dir={isRTL ? 'rtl' : 'ltr'}
                  className="w-full rounded-t-[22px] border-t border-[var(--line)] bg-[var(--card)] px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl"
                >
                  <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-[var(--line)]" aria-hidden="true" />
                  <p className="px-3 pb-2 text-xs font-bold text-[var(--ink-soft)]">{t('statusMenuTitle')}</p>
                  <div className="space-y-1">{items}</div>
                </div>
              </div>
            ) : (
              <div
                ref={menuRef}
                role="menu"
                dir={isRTL ? 'rtl' : 'ltr'}
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: MENU_WIDTH }}
                className="z-[60] space-y-0.5 rounded-[14px] border border-[var(--line)] bg-[var(--card)] p-1.5 shadow-[0_18px_40px_-12px_rgba(16,24,40,0.28)]"
              >
                {items}
              </div>
            ),
            document.body
          )
        : null}
    </>
  )
}
