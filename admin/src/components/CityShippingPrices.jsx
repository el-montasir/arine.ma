import { useState } from 'react'
import { MapPin, Plus, X, Save, CheckCircle2 } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { Card } from './ui/Card.jsx'
import Button from './ui/Button.jsx'
import ErrorBanner from './ui/ErrorBanner.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const field =
  'w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none'

// Per-city customer shipping price (e.g. Fes = 20 instead of the flat fee).
// Cities are the courier's (DIGYLOG) so the checkout can match them exactly.
export default function CityShippingPrices() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const canEdit = can('SHIPPING_UPDATE')
  const { data: config, reload } = useFetch('/shipping/config')
  const { data: cities } = useFetch('/shipping/cities')

  const [rows, setRows] = useState(null)
  const [loadedFor, setLoadedFor] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  if (config && loadedFor !== config) {
    setLoadedFor(config)
    setRows(Object.entries(config.cityPrices || {}).map(([city, price]) => ({ city, price: String(price) })))
  }

  const list = cities || []
  const known = (name) => list.some((c) => c.name === name)
  const arName = (name) => list.find((c) => c.name === name)?.nameAr

  const set = (i, patch) => {
    setSaved(false)
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }
  const valid =
    rows &&
    rows.every((r) => known(r.city) && /^\d+$/.test(r.price.trim())) &&
    new Set(rows.map((r) => r.city)).size === rows.length

  async function save() {
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      await api.put('/shipping/config', {
        cityPrices: Object.fromEntries(rows.map((r) => [r.city, Number(r.price.trim())])),
      })
      setSaved(true)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2.5 border-b border-[var(--line)] pb-3.5">
        <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-[var(--purple-bg)] text-[var(--purple)]">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-[var(--ink)]">{t('cityPricesTitle')}</h2>
          <p className="text-xs text-[var(--ink-soft)]">{t('cityPricesDesc', { flat: config?.flatFee ?? '—' })}</p>
        </div>
      </div>

      {list.length === 0 ? <p className="mb-3 text-xs text-[var(--orange)]">{t('cityPricesNoList')}</p> : null}

      <div className="space-y-2">
        {(rows || []).map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_110px_auto] items-center gap-2">
            <div>
              <input
                list="city-price-options"
                className={`${field} ${r.city && !known(r.city) ? 'border-[var(--red)]' : ''}`}
                value={r.city}
                disabled={!canEdit}
                onChange={(e) => set(i, { city: e.target.value.toUpperCase() })}
                placeholder={t('cityPricesCity')}
              />
              {arName(r.city) ? <span className="mt-0.5 block text-[10.5px] text-[var(--ink-soft)]">{arName(r.city)}</span> : null}
            </div>
            <input
              inputMode="numeric"
              className={`${field} ${/^\d+$/.test(r.price.trim()) ? '' : 'border-[var(--red)]'}`}
              value={r.price}
              disabled={!canEdit}
              onChange={(e) => set(i, { price: e.target.value })}
              placeholder="20"
              aria-label={t('cityPricesPrice')}
            />
            {canEdit ? (
              <button type="button" onClick={() => { setSaved(false); setRows((rs) => rs.filter((_, j) => j !== i)) }} className="rounded-[8px] p-1.5 text-[var(--ink-soft)] hover:bg-[var(--red-bg)] hover:text-[var(--red)]" aria-label={t('delete')}>
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}
        <datalist id="city-price-options">
          {list.map((c) => (
            <option key={c.name} value={c.name} label={c.nameAr || undefined} />
          ))}
        </datalist>
        {rows && rows.length === 0 ? <p className="text-xs text-[var(--ink-soft)]">{t('cityPricesEmpty')}</p> : null}
      </div>

      {error ? <div className="mt-3"><ErrorBanner message={error} /></div> : null}
      {saved ? (
        <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-[var(--green)]/30 bg-[var(--green-bg)] p-2.5 text-xs font-semibold text-[var(--green)]">
          <CheckCircle2 className="h-4 w-4" /> {t('saveShippingSuccess')}
        </div>
      ) : null}

      {canEdit ? (
        <div className="mt-4 flex flex-wrap justify-between gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setSaved(false); setRows((rs) => [...(rs || []), { city: '', price: '' }]) }}>
            <Plus className="h-3.5 w-3.5" /> {t('cityPricesAdd')}
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={busy || !valid}>
            <Save className="h-3.5 w-3.5" /> {busy ? t('saving') : t('cityPricesSave')}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
