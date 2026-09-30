import { useState, useCallback } from 'react'
import { Warehouse, Search, RefreshCw, Settings2, TrendingDown, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../lib/api.js'
import useFetch from '../lib/useFetch.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function stockStatusBadge(product, t) {
  if (!product.trackStock) return <Badge kind="neutral">{t('stockStatusNotTracked')}</Badge>
  if (product.currentStock === 0) return <Badge kind="danger">{t('stockStatusOutOfStock')}</Badge>
  if (product.currentStock <= product.lowStockThreshold) return <Badge kind="warn">{t('stockStatusLowStock')}</Badge>
  return <Badge kind="ok">{t('stockStatusInStock')}</Badge>
}

export default function Stock() {
  const { t, language, isRTL } = useLanguage()
  const { can, isOwner } = useAuth()

  const canAdjust = isOwner || can('STOCK_ADJUST')
  const canSettings = isOwner || can('STOCK_SETTINGS_UPDATE')

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({ page, limit: 50, filter })
    if (search.trim()) params.set('search', search.trim())
    return `/stock?${params}`
  }, [page, filter, search])

  const { data: rawData, loading, error, reload } = useFetch(buildUrl())
  const { data: settings, reload: reloadSettings } = useFetch('/stock/settings')

  const products = rawData?.items ?? []
  const total = rawData?.total ?? 0
  const totalPages = rawData?.totalPages ?? 1

  const [adjustTarget, setAdjustTarget] = useState(null)
  const [movementsTarget, setMovementsTarget] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  function handleSearch(e) {
    setSearch(e.target.value)
    setPage(1)
  }

  function handleFilter(f) {
    setFilter(f)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('stockTitle') || t('navStock')}
        subtitle={t('stockProductCount', { count: total })}
        actions={
          canSettings ? (
            <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="h-4 w-4 me-1.5" />
              {t('stockSettingsBtn')}
            </Button>
          ) : null
        }
      />

      {settings && !settings.stockManagementEnabled && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t('stockDisabledWarning')}</span>
          {canSettings && (
            <button className="ms-auto font-semibold underline underline-offset-2" onClick={() => setSettingsOpen(true)}>
              {t('stockEnableBtn')}
            </button>
          )}
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      <Card padded={false}>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--line)]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-soft)]" />
            <input
              value={search}
              onChange={handleSearch}
              placeholder={t('stockSearchPlaceholder')}
              className="w-full rounded-[9px] border border-[var(--line)] bg-[var(--bg)] py-2 ps-9 pe-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--purple)]/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <FilterBtn active={filter === 'all'} onClick={() => handleFilter('all')}>
              {t('stockFilterAll')}
            </FilterBtn>
            <FilterBtn active={filter === 'low-stock'} onClick={() => handleFilter('low-stock')}>
              <TrendingDown className="h-3.5 w-3.5 me-1" />
              {t('stockFilterLow')}
            </FilterBtn>
            <FilterBtn active={filter === 'out-of-stock'} onClick={() => handleFilter('out-of-stock')}>
              {t('stockFilterOut')}
            </FilterBtn>
            <button
              onClick={reload}
              className="rounded-[9px] border border-[var(--line)] p-2 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
              title={t('refresh')}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[var(--ink-soft)] text-sm">{t('loading')}</div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--ink-soft)]">
            <Warehouse className="h-10 w-10 opacity-30" />
            <p className="text-sm">{t('stockNoProductsMatch')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--ink-soft)] text-xs font-semibold uppercase tracking-wide">
                  <th className="px-4 py-3 text-start">{t('stockColProduct')}</th>
                  <th className="px-4 py-3 text-center">{t('stockColCurrentQty')}</th>
                  <th className="px-4 py-3 text-center">{t('stockColThreshold')}</th>
                  <th className="px-4 py-3 text-center">{t('stockColStatus')}</th>
                  <th className="px-4 py-3 text-end">{t('stockColActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--bg)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--ink)] leading-snug">{p.title}</div>
                      {p.author && <div className="text-xs text-[var(--ink-soft)] mt-0.5">{p.author}</div>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.trackStock ? (
                        <span className={`font-mono font-semibold text-base ${p.currentStock === 0 ? 'text-red-500' : p.currentStock <= p.lowStockThreshold ? 'text-amber-500' : 'text-[var(--ink)]'}`}>
                          {p.currentStock}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-[var(--ink-soft)]">{p.currentStock ?? 0}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-[var(--ink-soft)]">
                      {p.lowStockThreshold ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">{stockStatusBadge(p, t)}</td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setMovementsTarget(p)}
                          className="rounded-[7px] px-2.5 py-1.5 text-xs font-medium text-[var(--ink-soft)] border border-[var(--line)] hover:text-[var(--ink)] transition-colors"
                        >
                          {t('stockHistoryBtn')}
                        </button>
                        {canAdjust && (
                          <button
                            onClick={() => setAdjustTarget(p)}
                            className="rounded-[7px] px-2.5 py-1.5 text-xs font-medium text-[var(--purple)] border border-[var(--purple)]/30 hover:bg-[var(--purple)]/5 transition-colors"
                          >
                            {p.trackStock ? t('stockAdjustBtn') : t('stockSetQtyBtn')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-3">
            <span className="text-xs text-[var(--ink-soft)]">{t('stockPagination', { page, totalPages })}</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="rounded-[7px] border border-[var(--line)] p-1.5 disabled:opacity-40"
                title={t('prev')}
              >
                {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="rounded-[7px] border border-[var(--line)] p-1.5 disabled:opacity-40"
                title={t('next')}
              >
                {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </Card>

      {adjustTarget && (
        <AdjustModal
          product={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onDone={() => { setAdjustTarget(null); reload() }}
        />
      )}

      {movementsTarget && (
        <MovementsModal
          product={movementsTarget}
          onClose={() => setMovementsTarget(null)}
        />
      )}

      {settingsOpen && (
        <StockSettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onDone={() => { setSettingsOpen(false); reloadSettings() }}
        />
      )}
    </div>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center rounded-[9px] border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-[var(--purple)] bg-[var(--purple)] text-white'
          : 'border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
      }`}
    >
      {children}
    </button>
  )
}

function AdjustModal({ product, onClose, onDone }) {
  const { t } = useLanguage()
  const [newStock, setNewStock] = useState(String(product.currentStock ?? 0))
  const [reason, setReason] = useState('MANUAL_ADJUSTMENT')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const qty = Number(newStock)
    if (!Number.isInteger(qty) || qty < 0) {
      setError(t('stockInvalidQtyError'))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api.post(`/stock/products/${product.id}/adjust`, {
        newStock: qty,
        reason,
        note: note.trim() || undefined,
      })
      onDone()
    } catch (err) {
      setError(err.message || t('stockUpdateError'))
    } finally {
      setSubmitting(false)
    }
  }

  const modalTitle = product.trackStock
    ? t('stockAdjustModalTitle', { title: product.title })
    : t('stockSetModalTitle', { title: product.title })

  return (
    <Modal open onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && <ErrorBanner message={error} />}
        <div>
          <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">{t('stockNewQuantity')}</label>
          <input
            type="number"
            min="0"
            value={newStock}
            onChange={e => setNewStock(e.target.value)}
            className="w-full rounded-[9px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--purple)]/30"
          />
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            {t('stockCurrentQuantityLabel', { qty: product.currentStock ?? 0 })}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">{t('stockReasonLabel')}</label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full rounded-[9px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--purple)]/30"
          >
            <option value="MANUAL_ADJUSTMENT">{t('stockReasonManualAdjustment')}</option>
            <option value="RESTOCK">{t('stockReasonRestock')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">
            {t('stockNoteLabel')} <span className="text-[var(--ink-soft)] font-normal">{t('stockOptional')}</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full rounded-[9px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--purple)]/30"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {t('stockSaveAdjustmentBtn')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function MovementsModal({ product, onClose }) {
  const { t, language } = useLanguage()
  const { data: rawMov, loading, error } = useFetch(`/stock/products/${product.id}/movements?limit=30`)
  const movements = rawMov?.items ?? []

  function formatDelta(delta) {
    if (delta > 0) return <span className="text-green-600 font-mono font-semibold">+{delta}</span>
    return <span className="text-red-500 font-mono font-semibold">{delta}</span>
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString(language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-MA' : 'en-GB', {
      dateStyle: 'short', timeStyle: 'short',
    })
  }

  function getReasonLabel(reason) {
    switch (reason) {
      case 'MANUAL_ADJUSTMENT':
        return t('stockReasonManualAdjustment')
      case 'RESTOCK':
        return t('stockReasonRestock')
      case 'ORDER_CONFIRMED':
        return t('stockReasonOrderConfirmed')
      case 'ORDER_CANCELLED':
        return t('stockReasonOrderCancelled')
      default:
        return reason
    }
  }

  return (
    <Modal open onClose={onClose} title={t('stockHistoryModalTitle', { title: product.title })} width="max-w-3xl">
      <div className="pt-1">
        {error && <ErrorBanner message={error} />}
        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--ink-soft)]">{t('loading')}</p>
        ) : movements.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--ink-soft)]">{t('stockNoMovements')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--ink-soft)] text-xs font-semibold uppercase tracking-wide">
                  <th className="px-3 py-2 text-start">{t('stockColDate')}</th>
                  <th className="px-3 py-2 text-center">{t('stockColChange')}</th>
                  <th className="px-3 py-2 text-center">{t('stockColNewStock')}</th>
                  <th className="px-3 py-2 text-start">{t('stockColReason')}</th>
                  <th className="px-3 py-2 text-start">{t('stockColNote')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--bg)]">
                    <td className="px-3 py-2.5 text-xs text-[var(--ink-soft)] whitespace-nowrap">{formatDate(m.createdAt)}</td>
                    <td className="px-3 py-2.5 text-center">{formatDelta(m.delta)}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-[var(--ink)]">{m.newStock}</td>
                    <td className="px-3 py-2.5 text-xs text-[var(--ink-soft)]">
                      {getReasonLabel(m.reason)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[var(--ink-soft)] max-w-[200px] truncate">{m.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}

function StockSettingsModal({ settings, onClose, onDone }) {
  const { t, isRTL } = useLanguage()
  const [form, setForm] = useState({
    stockManagementEnabled: settings?.stockManagementEnabled ?? false,
    allowOverselling: settings?.allowOverselling ?? false,
    lowStockAlertEnabled: settings?.lowStockAlertEnabled ?? true,
    defaultLowStockThreshold: settings?.defaultLowStockThreshold ?? 5,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.patch('/stock/settings', {
        ...form,
        defaultLowStockThreshold: Number(form.defaultLowStockThreshold),
      })
      onDone()
    } catch (err) {
      setError(err.message || t('stockUpdateError'))
    } finally {
      setSubmitting(false)
    }
  }

  function toggle(key) {
    setForm(f => ({ ...f, [key]: !f[key] }))
  }

  return (
    <Modal open onClose={onClose} title={t('stockSettingsModalTitle')}>
      <form onSubmit={handleSubmit} className="space-y-5 pt-1">
        {error && <ErrorBanner message={error} />}

        <ToggleRow
          label={t('stockSettingEnableManagement')}
          description={t('stockSettingEnableManagementDesc')}
          checked={form.stockManagementEnabled}
          onChange={() => toggle('stockManagementEnabled')}
          isRTL={isRTL}
        />
        <ToggleRow
          label={t('stockSettingAllowOverselling')}
          description={t('stockSettingAllowOversellingDesc')}
          checked={form.allowOverselling}
          onChange={() => toggle('allowOverselling')}
          isRTL={isRTL}
        />
        <ToggleRow
          label={t('stockSettingLowStockAlert')}
          description={t('stockSettingLowStockAlertDesc')}
          checked={form.lowStockAlertEnabled}
          onChange={() => toggle('lowStockAlertEnabled')}
          isRTL={isRTL}
        />

        <div>
          <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">{t('stockSettingDefaultThreshold')}</label>
          <input
            type="number"
            min="0"
            max="10000"
            value={form.defaultLowStockThreshold}
            onChange={e => setForm(f => ({ ...f, defaultLowStockThreshold: e.target.value }))}
            className="w-32 rounded-[9px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--purple)]/30"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>{t('cancel')}</Button>
          <Button type="submit" disabled={submitting}>{t('stockSaveSettingsBtn')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function ToggleRow({ label, description, checked, onChange, isRTL }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
        <div
          className={`h-5 w-9 rounded-full transition-colors ${checked ? 'bg-[var(--purple)]' : 'bg-[var(--line)]'}`}
        />
        <div
          className={`absolute top-0.5 start-0 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked
              ? isRTL ? '-translate-x-4' : 'translate-x-4'
              : isRTL ? '-translate-x-0.5' : 'translate-x-0.5'
          }`}
        />
      </div>
      <div>
        <div className="text-sm font-medium text-[var(--ink)]">{label}</div>
        {description && <div className="text-xs text-[var(--ink-soft)] mt-0.5">{description}</div>}
      </div>
    </label>
  )
}
