import { useState } from 'react'
import useFetch from '../lib/useFetch.js'
import { Truck, Send, RefreshCw, TriangleAlert, Phone } from 'lucide-react'
import { api } from '../lib/api.js'
import { formatCents, formatDate } from '../lib/format.js'
import { Card } from './ui/Card.jsx'
import { Badge } from './ui/Badge.jsx'
import Button from './ui/Button.jsx'
import ErrorBanner from './ui/ErrorBanner.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

// Courier status ids → badge colour (DIGYLOG GET /statuses).
function statusKind(id) {
  if ([6, 45].includes(id)) return 'ok'
  if ([7, 8, 9, 25, 46, 47, 52].includes(id)) return 'danger'
  if ([4, 5, 21, 22, 43, 44, 55, 64, 65, 70, 71].includes(id)) return 'warn'
  return 'info'
}

// Parcel handed to DIGYLOG: tracking number, courier status, real fee, and the
// retry/refresh buttons when automatic sending or the webhook missed.
export default function OrderShipment({ order, onChange }) {
  const { t, language } = useLanguage()
  const { can } = useAuth()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const s = order.shipment
  const canSend = can('ORDERS_STATUS_UPDATE') && ['CONFIRMED', 'SHIPPING'].includes(order.status) && !s?.tracking
  const [city, setCity] = useState(order.city)
  // Only needed to fix a city the courier refused.
  const { data: cities } = useFetch(canSend && s?.error ? '/shipping/cities' : null)
  if (!s && !canSend) return null

  async function run(kind) {
    setBusy(kind)
    setError('')
    try {
      await api.post(`/orders/${order.id}/shipment/${kind}`, kind === 'send' && city.trim() !== order.city ? { city: city.trim() } : undefined)
      onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
        <Truck className="h-4 w-4 text-[var(--purple)]" aria-hidden="true" /> {t('shipCardTitle')}
      </h2>

      {s?.tracking ? (
        <div className="space-y-2 text-xs">
          <div>
            <span className="block text-[11px] text-[var(--ink-soft)]">{t('shipTracking')}</span>
            <span dir="ltr" className="font-mono text-sm font-bold text-[var(--purple)]">{s.tracking}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge kind={statusKind(s.statusId)}>{s.statusLabel || t('shipSent')}</Badge>
            {s.motif ? <span className="text-[11px] text-[var(--ink-soft)]">{s.motif}</span> : null}
          </div>
          {s.costCents != null ? (
            <div className="flex justify-between">
              <span className="text-[var(--ink-soft)]">{t('shipCost')}</span>
              <span className="tabular-nums font-semibold">{formatCents(s.costCents, language)}</span>
            </div>
          ) : null}
          {s.driverPhone ? (
            <a href={`tel:${s.driverPhone}`} dir="ltr" className="inline-flex items-center gap-1 font-mono text-[var(--purple)] hover:underline">
              <Phone className="h-3 w-3" /> {s.driverPhone}
            </a>
          ) : null}
          <p className="text-[10.5px] text-[var(--ink-soft)]">
            {t('shipSentAt')} {formatDate(s.sentAt, language)}
            {s.lastSyncAt ? ` · ${t('shipSyncedAt')} ${formatDate(s.lastSyncAt, language)}` : ''}
          </p>
          <Button size="sm" variant="secondary" onClick={() => run('sync')} disabled={Boolean(busy)} className="w-full">
            <RefreshCw className={`h-3.5 w-3.5 ${busy === 'sync' ? 'animate-spin' : ''}`} /> {t('shipSync')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          {s?.error ? (
            <div className="flex items-start gap-2 rounded-[10px] border border-[var(--red)]/30 bg-[var(--red-bg)] px-3 py-2 text-[var(--red)]">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{s.error}</span>
            </div>
          ) : (
            <p className="text-[var(--ink-soft)]">{t('shipNotSent')}</p>
          )}
          {canSend && s?.error ? (
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-[var(--ink)]">{t('shipCityLabel')}</span>
              <input
                list="digylog-cities"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
              />
              <datalist id="digylog-cities">
                {(cities || []).map((c) => (
                  <option key={c.name} value={c.name} label={c.nameAr || undefined} />
                ))}
              </datalist>
              <span className="mt-1 block text-[10.5px] text-[var(--ink-soft)]">{t('shipFixCity')}</span>
            </label>
          ) : null}
          {canSend ? (
            <Button size="sm" variant="primary" onClick={() => run('send')} disabled={Boolean(busy)} className="w-full">
              <Send className="h-3.5 w-3.5" /> {busy === 'send' ? t('saving') : t('shipSend')}
            </Button>
          ) : null}
        </div>
      )}
      {error ? <div className="mt-2"><ErrorBanner message={error} /></div> : null}
    </Card>
  )
}
