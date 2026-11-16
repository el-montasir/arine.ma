import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HandCoins, CircleCheck, Ban, Percent, TriangleAlert } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatCents, formatDate, formatDateShort, formatNumber, formatRate, parseDhToCents, centsToInput } from '../lib/format.js'
import { PageHeader, Card, StatCard } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import Table from '../components/ui/Table.jsx'
import Button from '../components/ui/Button.jsx'
import Modal from '../components/ui/Modal.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { Input, Textarea } from '../components/ui/Input.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const STATUS_KIND = { OPEN: 'info', PENDING: 'warn', PAID: 'ok', NONE: 'neutral' }

const todayInput = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export default function Sadaqat() {
  const { t, language } = useLanguage()
  const { can } = useAuth()
  const navigate = useNavigate()
  const canManage = can('FINANCE_SADAQA_MANAGE')
  const money = (c) => formatCents(c, language)

  const summary = useFetch('/sadaqa/summary')
  const rates = useFetch('/sadaqa/rate')
  const [pickedMonth, setMonth] = useState('')
  // The most recent month is open until another one is picked.
  const month = pickedMonth || summary.data?.months?.[0]?.month || ''
  const detail = useFetch(month ? `/sadaqa/months/${month}` : null)

  const refreshAll = () => {
    summary.reload()
    detail.reload()
    rates.reload()
  }

  // ── Payment modal ──
  const [payOpen, setPayOpen] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', date: todayInput(), reference: '', note: '' })
  const [payBusy, setPayBusy] = useState(false)
  const [payError, setPayError] = useState('')

  function openPay() {
    setPayForm({ amount: centsToInput(detail.data.summary.remainingCents), date: todayInput(), reference: '', note: '' })
    setPayError('')
    setPayOpen(true)
  }
  async function submitPay() {
    const amountCents = parseDhToCents(payForm.amount)
    if (!amountCents) return setPayError(t('sqInvalidAmount'))
    setPayBusy(true)
    setPayError('')
    try {
      await api.post('/sadaqa/payments', {
        periodMonth: month,
        amountCents,
        // Noon local time keeps the chosen calendar day in any time zone.
        paidAt: new Date(`${payForm.date}T12:00:00`).toISOString(),
        reference: payForm.reference.trim() || null,
        note: payForm.note.trim() || null,
      })
      setPayOpen(false)
      refreshAll()
    } catch (err) {
      setPayError(err.message)
    } finally {
      setPayBusy(false)
    }
  }

  // ── Void modal ──
  const [voidTarget, setVoidTarget] = useState(null)
  const [voidReason, setVoidReason] = useState('')
  const [voidBusy, setVoidBusy] = useState(false)
  const [voidError, setVoidError] = useState('')
  async function submitVoid() {
    setVoidBusy(true)
    setVoidError('')
    try {
      await api.post(`/sadaqa/payments/${voidTarget.id}/void`, { reason: voidReason.trim() })
      setVoidTarget(null)
      refreshAll()
    } catch (err) {
      setVoidError(err.message)
    } finally {
      setVoidBusy(false)
    }
  }

  // ── Rate ──
  const [rateInput, setRateInput] = useState('')
  const [rateBusy, setRateBusy] = useState(false)
  const [rateError, setRateError] = useState('')
  const [rateConfirm, setRateConfirm] = useState(false)
  async function submitRate() {
    const bp = parseDhToCents(rateInput) // "7.5" → 750 basis points
    if (bp == null || bp > 10000) return setRateError(t('sqInvalidRate'))
    setRateBusy(true)
    setRateError('')
    try {
      await api.put('/sadaqa/rate', { rateBp: bp })
      setRateInput('')
      setRateConfirm(false)
      refreshAll()
    } catch (err) {
      setRateError(err.message)
      setRateConfirm(false)
    } finally {
      setRateBusy(false)
    }
  }

  if (summary.error) {
    return (
      <div>
        <PageHeader title={t('sqPageTitle')} />
        <ErrorBanner message={summary.error} />
      </div>
    )
  }
  if (summary.loading || !summary.data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t('loadingData')} />
      </div>
    )
  }

  const { months, totals, currentRateBp } = summary.data
  const statusLabel = (s) => t(`sqStatus_${s}`)
  const profitCell = (v) => (
    <span className={`tabular-nums font-semibold ${v == null ? 'text-[var(--ink-soft)]' : v < 0 ? 'text-[var(--red)]' : 'text-[var(--ink)]'}`}>{money(v)}</span>
  )

  const monthCols = [
    { key: 'month', label: t('sqColMonth'), render: (r) => <span dir="ltr" className="font-mono text-xs font-bold text-[var(--purple)]">{r.month}</span> },
    {
      key: 'orders',
      label: t('sqColOrders'),
      render: (r) => (
        <span className="tabular-nums">
          {formatNumber(r.ordersCount)}
          {r.incompleteCount > 0 ? <span className="ms-1 text-[10.5px] text-[var(--orange)]">(+{r.incompleteCount} {t('sqIncompleteShort')})</span> : null}
        </span>
      ),
    },
    { key: 'before', label: t('sqColProfitBefore'), render: (r) => profitCell(r.profitBeforeCents) },
    { key: 'due', label: t('sqColDue'), render: (r) => <span className="tabular-nums font-bold text-[var(--purple)]">{money(r.sadaqaDueCents)}</span> },
    { key: 'after', label: t('sqColProfitAfter'), render: (r) => profitCell(r.profitAfterCents) },
    { key: 'paid', label: t('sqColPaid'), render: (r) => <span className="tabular-nums">{money(r.paidCents)}</span> },
    {
      key: 'remaining',
      label: t('sqColRemaining'),
      render: (r) => (
        <span className="tabular-nums font-semibold">
          {money(r.remainingCents)}
          {r.overpaidCents > 0 ? <span className="block text-[10.5px] text-[var(--orange)]">{t('sqOverpaidShort', { amount: money(r.overpaidCents) })}</span> : null}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('sqColStatus'),
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <Badge kind={STATUS_KIND[r.status]}>{statusLabel(r.status)}</Badge>
          {r.adjustmentCents !== 0 ? <span className="text-[10.5px] text-[var(--orange)]">{t('sqAdjusted')}</span> : null}
        </div>
      ),
    },
  ]

  const orderCols = [
    { key: 'num', label: t('sqColOrder'), render: (r) => <span dir="ltr" className="font-mono text-xs font-bold text-[var(--purple)]">{r.orderNumber}</span> },
    {
      key: 'delivered',
      label: t('sqColDelivered'),
      render: (r) => (
        <span className="text-xs">
          {formatDateShort(r.deliveredAt, language)}
          {r.deliveredAtEstimated ? <span className="ms-1 text-[10.5px] text-[var(--orange)]">({t('sqEstimated')})</span> : null}
        </span>
      ),
    },
    { key: 'initial', label: t('sqInitialProfit'), render: (r) => profitCell(r.initialProfitCents) },
    {
      key: 'adjust',
      label: t('sqColAdjust'),
      render: (r) =>
        r.mode === 'MANUAL' ? (
          <Badge kind="info">{t('sqModeManual')}</Badge>
        ) : r.extraChargesCents > 0 ? (
          <span className="tabular-nums text-xs text-[var(--red)]">−{money(r.extraChargesCents)}</span>
        ) : (
          <span className="text-xs text-[var(--ink-soft)]">—</span>
        ),
    },
    { key: 'real', label: t('sqRealProfit'), render: (r) => profitCell(r.realProfitCents) },
    {
      key: 'sadaqa',
      label: t('sqColSadaqa'),
      render: (r) => (
        <span className="tabular-nums font-bold text-[var(--purple)]">
          {money(r.sadaqaCents)} <span className="text-[10px] font-normal text-[var(--ink-soft)]">{formatRate(r.rateBp, language)}</span>
        </span>
      ),
    },
    { key: 'after', label: t('sqProfitAfter'), render: (r) => profitCell(r.profitAfterCents) },
  ]

  const incompleteCols = [
    { key: 'num', label: t('sqColOrder'), render: (r) => <span dir="ltr" className="font-mono text-xs font-bold text-[var(--purple)]">{r.orderNumber}</span> },
    { key: 'name', label: t('customerName'), render: (r) => <span className="text-xs">{r.fullName}</span> },
    { key: 'delivered', label: t('sqColDelivered'), render: (r) => <span className="text-xs">{formatDateShort(r.deliveredAt, language)}</span> },
    { key: 'why', label: t('sqColWhy'), render: () => <span className="text-xs text-[var(--orange)]">{t('sqIncompleteReason')}</span> },
  ]

  const paymentCols = [
    { key: 'date', label: t('sqColPaidAt'), render: (r) => <span className="text-xs">{formatDateShort(r.paidAt, language)}</span> },
    {
      key: 'amount',
      label: t('sqColAmount'),
      render: (r) => <span className={`tabular-nums font-bold ${r.voidedAt ? 'line-through text-[var(--ink-soft)]' : 'text-[var(--green)]'}`}>{money(r.amountCents)}</span>,
    },
    { key: 'due', label: t('sqColDueAtPayment'), render: (r) => <span className="tabular-nums text-xs">{money(r.dueSnapshotCents)}</span> },
    { key: 'ref', label: t('sqColReference'), render: (r) => <span className="text-xs">{r.reference || '—'}{r.note ? <span className="block text-[10.5px] text-[var(--ink-soft)]">{r.note}</span> : null}</span> },
    { key: 'by', label: t('sqColBy'), render: (r) => <span className="text-xs">{r.createdBy || '—'}<span className="block text-[10.5px] text-[var(--ink-soft)]">{formatDate(r.createdAt, language)}</span></span> },
    {
      key: 'state',
      label: t('sqColStatus'),
      render: (r) =>
        r.voidedAt ? (
          <div className="text-[10.5px]">
            <Badge kind="danger">{t('sqVoided')}</Badge>
            <span className="block mt-0.5 text-[var(--ink-soft)]">{r.voidReason} — {r.voidedBy || '—'}</span>
          </div>
        ) : canManage ? (
          <Button size="sm" variant="ghost" onClick={() => { setVoidTarget(r); setVoidReason(''); setVoidError('') }}>
            <Ban className="h-3.5 w-3.5" /> {t('sqVoid')}
          </Button>
        ) : (
          <Badge kind="ok">{t('sqActive')}</Badge>
        ),
    },
  ]

  const d = detail.data
  const s = d?.summary

  return (
    <div>
      <PageHeader title={t('sqPageTitle')} subtitle={t('sqPageSubtitle')} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label={t('sqStatRemaining')} value={money(totals.remainingCents)} tone={totals.remainingCents > 0 ? 'warn' : 'ok'} icon={HandCoins} />
        <StatCard label={t('sqStatOpenMonth')} value={money(totals.openMonthDueCents)} tone="brand" sub={t('sqStatOpenMonthSub')} />
        <StatCard label={t('sqStatPaid')} value={money(totals.paidCents)} tone="ok" icon={CircleCheck} />
        <StatCard label={t('sqStatIncomplete')} value={formatNumber(totals.incompleteCount)} tone={totals.incompleteCount > 0 ? 'warn' : 'default'} sub={t('sqStatIncompleteSub')} />
        <StatCard label={t('sqStatRate')} value={formatRate(currentRateBp, language)} icon={Percent} />
      </div>

      <Card padded={false} className="mb-4">
        <div className="border-b border-[var(--line)] px-5 py-3.5 text-sm font-bold text-[var(--ink)]">{t('sqMonthsTitle')}</div>
        <Table columns={monthCols} rows={months} rowKey={(r) => r.month} empty={t('sqNoMonths')} onRowClick={(r) => setMonth(r.month)} />
      </Card>

      {month ? (
        <Card className="mb-4">
          {detail.error ? <ErrorBanner message={detail.error} /> : null}
          {detail.loading || !d ? (
            <Spinner label={t('loadingData')} />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
                  {t('sqMonthDetail')} <span dir="ltr" className="font-mono text-[var(--purple)]">{month}</span>
                  <Badge kind={STATUS_KIND[s.status]}>{statusLabel(s.status)}</Badge>
                </h2>
                {canManage && s.finished && s.remainingCents > 0 ? (
                  <Button variant="primary" size="sm" onClick={openPay}>
                    <CircleCheck className="h-3.5 w-3.5" /> {t('sqMarkPaid')}
                  </Button>
                ) : null}
              </div>

              {!s.finished ? <p className="text-xs text-[var(--blue)]">{t('sqOpenMonthNote')}</p> : null}
              {s.adjustmentCents !== 0 ? (
                <div className="flex items-start gap-2 rounded-[10px] border border-[var(--orange)]/30 bg-[var(--orange-bg)] px-3 py-2 text-xs text-[var(--orange)]">
                  <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {t('sqAdjustmentNote', { amount: money(s.adjustmentCents) })}
                    {s.overpaidCents > 0 ? ` ${t('sqOverpaidNote', { amount: money(s.overpaidCents) })}` : ''}
                  </span>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  [t('sqColProfitBefore'), money(s.profitBeforeCents)],
                  [t('sqColDue'), money(s.sadaqaDueCents)],
                  [t('sqColPaid'), money(s.paidCents)],
                  [t('sqColRemaining'), money(s.remainingCents)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2">
                    <span className="block text-[11px] text-[var(--ink-soft)]">{label}</span>
                    <span className="text-sm font-bold tabular-nums text-[var(--ink)]">{value}</span>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold text-[var(--ink)]">{t('sqOrdersTitle')} ({d.orders.length})</h3>
                <Table columns={orderCols} rows={d.orders} rowKey={(r) => r.id} empty={t('sqNoOrders')} onRowClick={(r) => navigate(`/orders/${r.id}`)} />
              </div>

              {d.incompleteOrders.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-bold text-[var(--orange)]">{t('sqIncompleteTitle')} ({d.incompleteOrders.length})</h3>
                  <Table columns={incompleteCols} rows={d.incompleteOrders} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/orders/${r.id}`)} />
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 text-xs font-bold text-[var(--ink)]">{t('sqPaymentsTitle')}</h3>
                <Table columns={paymentCols} rows={d.payments} rowKey={(r) => r.id} empty={t('sqNoPayments')} />
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {/* Rate */}
      <Card>
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
          <Percent className="h-4 w-4 text-[var(--purple)]" aria-hidden="true" /> {t('sqRateTitle')}
        </h2>
        <p className="mb-3 text-xs text-[var(--ink-soft)]">{t('sqRateHint')}</p>
        {canManage ? (
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <div className="w-40">
              <Input label={t('sqNewRate')} inputMode="decimal" value={rateInput} onChange={(e) => { setRateInput(e.target.value); setRateError('') }} placeholder={String(currentRateBp / 100)} />
            </div>
            <Button variant="secondary" onClick={() => setRateConfirm(true)} disabled={!rateInput.trim() || rateBusy}>
              {t('sqChangeRate')}
            </Button>
          </div>
        ) : null}
        {rateError ? <ErrorBanner message={rateError} /> : null}
        <div className="space-y-1 text-xs">
          {(rates.data?.history || []).map((r) => (
            <div key={r.id} className="flex justify-between border-b border-[var(--line)] py-1.5 last:border-0">
              <span className="font-bold tabular-nums">{formatRate(r.rateBp, language)}</span>
              <span className="text-[var(--ink-soft)]">
                {new Date(r.effectiveFrom).getUTCFullYear() <= 1970 ? t('sqRateDefault') : `${t('sqRateFrom')} ${formatDate(r.effectiveFrom, language)}`}
                {r.createdBy ? ` — ${r.createdBy}` : ''}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Mark-as-paid modal */}
      <Modal open={payOpen} onClose={() => !payBusy && setPayOpen(false)} title={`${t('sqMarkPaid')} — \u2066${month}\u2069`}>
        <div className="space-y-3">
          <p className="text-xs text-[var(--ink-soft)]">{t('sqPayExplain', { remaining: s ? money(s.remainingCents) : '—' })}</p>
          <Input label={t('sqColAmount')} inputMode="decimal" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} />
          <Input label={t('sqColPaidAt')} type="date" value={payForm.date} max={todayInput()} onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))} />
          <Input label={t('sqColReference')} value={payForm.reference} maxLength={100} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} />
          <Textarea label={t('sqPayNote')} rows={2} value={payForm.note} maxLength={1000} onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))} />
          {payError ? <ErrorBanner message={payError} /> : null}
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--line)] pt-3">
          <Button variant="secondary" onClick={() => setPayOpen(false)} disabled={payBusy}>{t('cancel')}</Button>
          <Button variant="primary" onClick={submitPay} disabled={payBusy}>{payBusy ? t('saving') : t('sqConfirmPaid')}</Button>
        </div>
      </Modal>

      {/* Void modal */}
      <Modal open={Boolean(voidTarget)} onClose={() => !voidBusy && setVoidTarget(null)} title={t('sqVoidTitle')}>
        <div className="space-y-3">
          <p className="text-xs text-[var(--ink)]">
            {t('sqVoidExplain', { amount: voidTarget ? money(voidTarget.amountCents) : '—' })}
          </p>
          <Textarea label={t('sqVoidReason')} rows={2} value={voidReason} maxLength={500} onChange={(e) => setVoidReason(e.target.value)} />
          {voidError ? <ErrorBanner message={voidError} /> : null}
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--line)] pt-3">
          <Button variant="secondary" onClick={() => setVoidTarget(null)} disabled={voidBusy}>{t('cancel')}</Button>
          <Button variant="danger" onClick={submitVoid} disabled={voidBusy || voidReason.trim().length < 3}>{t('sqVoid')}</Button>
        </div>
      </Modal>

      {/* Rate confirmation */}
      <Modal open={rateConfirm} onClose={() => !rateBusy && setRateConfirm(false)} title={t('sqChangeRate')}>
        <p className="text-xs text-[var(--ink)]">
          {t('sqRateConfirm', { from: formatRate(currentRateBp, language), to: formatRate(parseDhToCents(rateInput), language) })}
        </p>
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--line)] pt-3">
          <Button variant="secondary" onClick={() => setRateConfirm(false)} disabled={rateBusy}>{t('cancel')}</Button>
          <Button variant="primary" onClick={submitRate} disabled={rateBusy}>{rateBusy ? t('saving') : t('sqChangeRate')}</Button>
        </div>
      </Modal>
    </div>
  )
}
