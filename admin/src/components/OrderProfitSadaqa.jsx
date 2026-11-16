import { useMemo, useState } from 'react'
import { HandCoins, Plus, X, Save, Info, TriangleAlert } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatCents, formatDate, formatRate, parseDhToCents, centsToInput } from '../lib/format.js'
import { Card } from './ui/Card.jsx'
import { Badge } from './ui/Badge.jsx'
import Button from './ui/Button.jsx'
import ErrorBanner from './ui/ErrorBanner.jsx'
import Spinner from './ui/Spinner.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const CHARGE_TYPES = ['SHIPPING_EXTRA', 'PACKAGING', 'OTHER']

const field =
  'w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none disabled:opacity-60'

// Same rounding as the server (half-up on centimes). Display only — the
// server recomputes and its figures are the ones saved.
const applyRate = (cents, bp) => Math.floor((cents * bp + 5000) / 10000)

// ISO → value for <input type="datetime-local"> in the browser's time zone.
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function Row({ label, value, strong, tone }) {
  return (
    <div className={`flex justify-between gap-3 py-1.5 ${strong ? 'text-sm font-extrabold' : 'text-xs'}`}>
      <span className="text-[var(--ink-soft)] font-medium">{label}</span>
      <span className={`tabular-nums font-semibold ${tone || 'text-[var(--ink)]'}`}>{value}</span>
    </div>
  )
}

function formFromData(data) {
  return {
    mode: data.mode,
    manualProfit: centsToInput(data.manualProfitCents),
    costOverride: centsToInput(data.goodsCostOverrideCents),
    charges: data.charges.map((c) => ({ type: c.type, amount: centsToInput(c.amountCents), note: c.note || '' })),
    note: data.note || '',
    deliveredAt: toLocalInput(data.deliveredAt),
  }
}

export default function OrderProfitSadaqa({ orderId, refreshKey }) {
  const { t, language } = useLanguage()
  const { can } = useAuth()
  const canEdit = can('FINANCE_SADAQA_MANAGE')

  const { data, loading, error, reload } = useFetch(`/orders/${orderId}/profit`, [refreshKey])
  const [form, setForm] = useState(null)
  const [formFor, setFormFor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  // Reset the form whenever fresh data arrives (first load, save, status change).
  if (data && formFor !== data) {
    setFormFor(data)
    setForm(formFromData(data))
  }

  const live = useMemo(() => {
    if (!data || !form) return null
    const c = data.calc
    const missingCost = c.costSource !== 'SNAPSHOT'
    const goodsCostCents = missingCost ? parseDhToCents(form.costOverride) : c.goodsCostCents
    const initial = goodsCostCents == null ? null : c.goodsRevenueCents - goodsCostCents
    const charges = form.charges.map((ch) => parseDhToCents(ch.amount))
    const chargesValid = charges.every((v) => v != null && v > 0)
    const extra = charges.reduce((s, v) => s + (v || 0), 0)
    const manual = parseDhToCents(form.manualProfit, { allowNegative: true })
    const real = form.mode === 'MANUAL' ? manual : initial == null ? null : initial - extra
    const sadaqa = real == null ? null : real > 0 ? applyRate(real, c.rateBp) : 0
    return {
      missingCost,
      goodsCostCents,
      initial,
      extra,
      chargesValid,
      manual,
      real,
      sadaqa,
      after: real == null ? null : real - sadaqa,
    }
  }, [data, form])

  if (error) return <ErrorBanner message={error} />
  if (loading || !data || !form || !live) {
    return (
      <Card>
        <Spinner label={t('loadingData')} />
      </Card>
    )
  }

  const c = data.calc
  const set = (patch) => {
    setSaved(false)
    setForm((f) => ({ ...f, ...patch }))
  }
  const setCharge = (i, patch) => set({ charges: form.charges.map((ch, j) => (j === i ? { ...ch, ...patch } : ch)) })
  const addCharge = (amount = '') => set({ charges: [...form.charges, { type: 'SHIPPING_EXTRA', amount, note: '' }] })
  const removeCharge = (i) => set({ charges: form.charges.filter((_, j) => j !== i) })

  const manualMissing = form.mode === 'MANUAL' && live.manual == null
  const reasonMissing = form.mode === 'MANUAL' && !form.note.trim()
  const canSave = canEdit && !saving && live.chargesValid && !manualMissing && !reasonMissing

  async function save() {
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      await api.put(`/orders/${orderId}/profit`, {
        mode: form.mode,
        manualProfitCents: form.mode === 'MANUAL' ? live.manual : null,
        goodsCostOverrideCents: live.missingCost ? parseDhToCents(form.costOverride) : null,
        charges: form.charges.map((ch) => ({
          type: ch.type,
          amountCents: parseDhToCents(ch.amount),
          note: ch.note.trim() || null,
        })),
        note: form.note.trim() || null,
        deliveredAt:
          data.status === 'DELIVERED' && form.deliveredAt ? new Date(form.deliveredAt).toISOString() : null,
      })
      setSaved(true)
      reload()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const money = (cents) => formatCents(cents, language)
  const monthLabel = data.month ? `\u2066${data.month}\u2069` : ''
  const profitTone = (v) => (v == null ? 'text-[var(--ink-soft)]' : v < 0 ? 'text-[var(--red)]' : 'text-[var(--green)]')

  let eligibility
  if (data.eligible) eligibility = <Badge kind="ok">{t('sqEligibleMonth', { month: monthLabel })}</Badge>
  else if (data.status === 'CANCELLED' || data.status === 'RETURNED') eligibility = <Badge kind="neutral">{t('sqNotEligibleClosed')}</Badge>
  else eligibility = <Badge kind="warn">{t('sqNotEligibleYet')}</Badge>

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
          <HandCoins className="h-4 w-4 text-[var(--purple)]" aria-hidden="true" /> {t('sqOrderTitle')}
        </h2>
        {eligibility}
      </div>

      {data.monthPaid ? (
        <div className="mb-3 flex items-start gap-2 rounded-[10px] border border-[var(--orange)]/30 bg-[var(--orange-bg)] px-3 py-2 text-xs text-[var(--orange)]">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('sqMonthPaidWarning', { month: monthLabel })}</span>
        </div>
      ) : null}

      {/* How the goods profit is built, book by book */}
      <h3 className="mb-1.5 text-xs font-bold text-[var(--ink)]">{t('sqBreakdownTitle')}</h3>
      <div className="mb-3 overflow-x-auto rounded-[12px] border border-[var(--line)]">
        <table className="w-full text-xs">
          <thead className="bg-[var(--bg)] text-[var(--ink-soft)]">
            <tr>
              <th className="px-3 py-2 text-start font-semibold">{t('colBook')}</th>
              <th className="px-3 py-2 text-start font-semibold">{t('sqColSale')}</th>
              <th className="px-3 py-2 text-start font-semibold">{t('sqColCost')}</th>
              <th className="px-3 py-2 text-start font-semibold">{t('sqColLineProfit')}</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l, i) => (
              <tr key={i} className="border-t border-[var(--line)]">
                <td className="px-3 py-2">
                  <span className="font-semibold text-[var(--ink)]">{l.type === 'PACKAGE' ? `[${t('coPackage')}] ` : ''}{l.title}</span>
                  <span className="block text-[10.5px] text-[var(--ink-soft)]">
                    <bdi>{l.quantity} × {money(l.unitPriceCents)}</bdi>
                    {l.unitCostCents != null ? <> · {t('sqUnitCost')} <bdi>{money(l.unitCostCents)}</bdi></> : null}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">{money(l.revenueCents)}</td>
                <td className={`px-3 py-2 tabular-nums ${l.costCents == null ? 'text-[var(--orange)]' : 'text-[var(--ink-soft)]'}`}>
                  {l.costCents == null ? t('sqCostUnknownShort') : `− ${money(l.costCents)}`}
                </td>
                <td className={`px-3 py-2 tabular-nums font-semibold ${profitTone(l.profitCents)}`}>{money(l.profitCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-[var(--line)] font-bold">
            <tr>
              <td className="px-3 py-2">{t('sqBooksTotal')}</td>
              <td className="px-3 py-2 tabular-nums">{money(c.goodsRevenueCents)}</td>
              <td className="px-3 py-2 tabular-nums">{live.goodsCostCents == null ? '—' : `− ${money(live.goodsCostCents)}`}</td>
              <td className={`px-3 py-2 tabular-nums ${profitTone(live.initial)}`}>{money(live.initial)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {live.missingCost ? (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">{t('sqGoodsCostManual')}</label>
          <input
            inputMode="decimal"
            className={field}
            value={form.costOverride}
            onChange={(e) => set({ costOverride: e.target.value })}
            disabled={!canEdit}
            placeholder="0"
          />
          <span className="mt-1 block text-[11px] text-[var(--orange)]">
            {t('sqGoodsCostMissing', { count: c.costUnknownItems })}
          </span>
        </div>
      ) : null}

      {/* Figures read from the order — never changed here */}
      <div className="divide-y divide-[var(--line)]">
        <Row label={t('sqCollected')} value={money(c.collectedCents)} />
        <div className="py-1.5">
          <Row label={t('sqShippingBilled')} value={money(c.shippingBilledCents)} />
          <p className="text-[11px] text-[var(--ink-soft)]">
            {c.shippingBilledCents > 0 ? t('sqShippingPassThrough', { amount: money(c.shippingBilledCents) }) : t('sqShippingFreeNote')}
          </p>
        </div>
        <div className="py-1.5">
          <Row label={t('sqInitialProfit')} value={money(live.initial)} tone={profitTone(live.initial)} />
          <p className="text-[11px] text-[var(--ink-soft)]">
            {live.initial == null ? (
              t('sqInitialUnknown')
            ) : (
              <>
                <bdi>{money(c.collectedCents)}</bdi> − <bdi>{money(c.shippingBilledCents)}</bdi> − <bdi>{money(live.goodsCostCents)}</bdi>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Mode */}
      <div className="mt-4">
        <span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">{t('sqModeLabel')}</span>
        <div className="grid grid-cols-2 gap-2">
          {['AUTO', 'MANUAL'].map((m) => (
            <button
              key={m}
              type="button"
              disabled={!canEdit}
              onClick={() => set({ mode: m })}
              className={`rounded-[10px] border px-3 py-2 text-start text-xs transition-colors disabled:cursor-not-allowed ${
                form.mode === m
                  ? 'border-[var(--purple)] bg-[var(--purple-bg)] text-[var(--purple)] font-bold'
                  : 'border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--bg)]'
              }`}
            >
              <span className="block">{t(m === 'AUTO' ? 'sqModeAuto' : 'sqModeManual')}</span>
              <span className="block text-[10.5px] font-normal opacity-80">
                {t(m === 'AUTO' ? 'sqModeAutoHint' : 'sqModeManualHint')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Extra charges */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--ink)]">{t('sqChargesLabel')}</span>
          {canEdit ? (
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => addCharge('5')}>+5</Button>
              <Button size="sm" variant="secondary" onClick={() => addCharge('10')}>+10</Button>
              <Button size="sm" variant="secondary" onClick={() => addCharge()}>
                <Plus className="h-3.5 w-3.5" /> {t('sqAddCharge')}
              </Button>
            </div>
          ) : null}
        </div>
        {data.shipping === 0 ? (
          <p className="mb-2 flex items-start gap-1.5 text-[11px] text-[var(--blue)]">
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {t('sqFreeShippingHint')}
          </p>
        ) : null}
        {form.charges.length === 0 ? (
          <p className="text-[11px] text-[var(--ink-soft)]">{t('sqNoCharges')}</p>
        ) : (
          <div className={`space-y-2 ${form.mode === 'MANUAL' ? 'opacity-60' : ''}`}>
            {form.charges.map((ch, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_1fr_auto] items-center gap-1.5">
                <select className={field} value={ch.type} disabled={!canEdit} onChange={(e) => setCharge(i, { type: e.target.value })}>
                  {CHARGE_TYPES.map((type) => (
                    <option key={type} value={type}>{t(`sqCharge_${type}`)}</option>
                  ))}
                </select>
                <input
                  inputMode="decimal"
                  className={`${field} ${parseDhToCents(ch.amount) > 0 ? '' : 'border-[var(--red)]'}`}
                  value={ch.amount}
                  disabled={!canEdit}
                  onChange={(e) => setCharge(i, { amount: e.target.value })}
                  placeholder="0"
                  aria-label={t('sqChargeAmount')}
                />
                <input
                  className={field}
                  value={ch.note}
                  disabled={!canEdit}
                  onChange={(e) => setCharge(i, { note: e.target.value })}
                  placeholder={t('sqChargeNote')}
                  maxLength={200}
                />
                {canEdit ? (
                  <button type="button" onClick={() => removeCharge(i)} className="rounded-[8px] p-1.5 text-[var(--ink-soft)] hover:bg-[var(--red-bg)] hover:text-[var(--red)]" aria-label={t('delete')}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
            <Row label={t('sqChargesTotal')} value={money(live.extra)} />
            {form.mode === 'MANUAL' ? <p className="text-[11px] text-[var(--ink-soft)]">{t('sqChargesIgnoredManual')}</p> : null}
          </div>
        )}
      </div>

      {form.mode === 'MANUAL' ? (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">{t('sqManualProfit')}</label>
          <input
            inputMode="decimal"
            className={`${field} ${manualMissing ? 'border-[var(--red)]' : ''}`}
            value={form.manualProfit}
            disabled={!canEdit}
            onChange={(e) => set({ manualProfit: e.target.value })}
            placeholder="0"
          />
        </div>
      ) : null}

      <div className="mt-4">
        <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">
          {t('sqReason')} {form.mode === 'MANUAL' ? <span className="text-[var(--red)]">*</span> : null}
        </label>
        <textarea
          rows={2}
          className={`${field} ${reasonMissing ? 'border-[var(--red)]' : ''}`}
          value={form.note}
          disabled={!canEdit}
          onChange={(e) => set({ note: e.target.value })}
          maxLength={500}
          placeholder={t('sqReasonPlaceholder')}
        />
      </div>

      {data.status === 'DELIVERED' ? (
        <div className="mt-4">
          <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
            {t('sqDeliveredAt')}
            {data.deliveredAtEstimated ? <Badge kind="warn">{t('sqEstimated')}</Badge> : null}
          </label>
          <input
            type="datetime-local"
            className={field}
            value={form.deliveredAt}
            disabled={!canEdit}
            onChange={(e) => set({ deliveredAt: e.target.value })}
          />
        </div>
      ) : null}

      {/* Result */}
      <div className="mt-4 rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 divide-y divide-[var(--line)]">
        <Row label={t('sqRealProfit')} value={money(live.real)} tone={profitTone(live.real)} strong />
        <Row label={t('sqSadaqaRate', { rate: formatRate(c.rateBp, language) })} value={money(live.sadaqa)} tone="text-[var(--purple)]" />
        <Row label={t('sqProfitAfter')} value={money(live.after)} tone={profitTone(live.after)} />
      </div>
      {live.real == null ? <p className="mt-2 text-[11px] text-[var(--orange)]">{t('sqIncompleteHint')}</p> : null}

      {saveError ? <div className="mt-3"><ErrorBanner message={saveError} /></div> : null}
      {saved ? (
        <div className="mt-3 rounded-[10px] border border-[var(--green)]/30 bg-[var(--green-bg)] px-3 py-2 text-xs font-semibold text-[var(--green)]">
          {t('sqSaved')}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-[var(--ink-soft)]">
          {data.updatedAt ? t('sqLastUpdate', { by: data.updatedBy || '—', at: formatDate(data.updatedAt, language) }) : t('sqNeverSaved')}
        </span>
        {canEdit ? (
          <Button variant="primary" size="sm" onClick={save} disabled={!canSave}>
            <Save className="h-3.5 w-3.5" />
            {saving ? t('saving') : t('sqSave')}
          </Button>
        ) : (
          <span className="text-[11px] text-[var(--ink-soft)]">{t('sqReadOnly')}</span>
        )}
      </div>
    </Card>
  )
}
