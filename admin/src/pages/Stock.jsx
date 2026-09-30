import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Warehouse,
  Search,
  RefreshCw,
  Settings2,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  BookOpen,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Sliders,
  History,
  X,
  Plus,
  Minus,
  Equal,
  Clock,
  User,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react'
import { api } from '../lib/api.js'
import useFetch from '../lib/useFetch.js'
import { getImageUrl } from '../lib/images.js'
import { Card } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Status badge with pulse indicator for stock health.
 */
function StockStatusPill({ product, t }) {
  if (!product.trackStock) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        {t('stockStatusNotTracked') || 'Not Tracked'}
      </span>
    )
  }

  const stock = product.currentStock ?? 0
  const threshold = product.lowStockThreshold ?? 5

  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/25">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        {t('stockStatusOutOfStock') || 'Out of Stock'}
      </span>
    )
  }

  if (stock <= threshold) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        {t('stockStatusLowStock') || 'Low Stock'}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {t('stockStatusInStock') || 'In Stock'}
    </span>
  )
}

/**
 * Main Stock Management Page.
 */
export default function Stock() {
  const { t, language, isRTL } = useLanguage()
  const { can, isOwner } = useAuth()

  const canAdjust = isOwner || can('STOCK_ADJUST')
  const canSettings = isOwner || can('STOCK_SETTINGS_UPDATE')

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'in-stock' | 'low-stock' | 'out-of-stock'
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const [feedbackToast, setFeedbackToast] = useState(null)

  // Overall catalog summary statistics
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    notTracked: 0,
  })

  // URL builder for paginated table
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

  // Fetch overall catalog statistics for the 5 summary cards
  const fetchGlobalStats = useCallback(async () => {
    try {
      const res = await api.get('/stock?limit=1000')
      if (res && res.items) {
        let inStock = 0
        let lowStock = 0
        let outOfStock = 0
        let notTracked = 0

        res.items.forEach((p) => {
          if (!p.trackStock) {
            notTracked++
          } else {
            const qty = p.currentStock ?? 0
            const thresh = p.lowStockThreshold ?? 5
            if (qty <= 0) {
              outOfStock++
            } else if (qty <= thresh) {
              lowStock++
            } else {
              inStock++
            }
          }
        })

        setSummaryStats({
          total: res.total || res.items.length,
          inStock,
          lowStock,
          outOfStock,
          notTracked,
        })
      }
    } catch {
      // Fallback silently if overview fetch encounters an issue
    }
  }, [])

  useEffect(() => {
    fetchGlobalStats()
  }, [fetchGlobalStats])

  // Toast feedback auto-dismiss
  useEffect(() => {
    if (!feedbackToast) return
    const timer = setTimeout(() => setFeedbackToast(null), 3500)
    return () => clearTimeout(timer)
  }, [feedbackToast])

  const [adjustTarget, setAdjustTarget] = useState(null)
  const [movementsTarget, setMovementsTarget] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Manual refresh with 360° spin animation
  async function handleRefresh() {
    setRefreshing(true)
    try {
      await Promise.all([reload(), reloadSettings(), fetchGlobalStats()])
    } finally {
      setTimeout(() => setRefreshing(false), 400)
    }
  }

  function handleSearch(e) {
    setSearch(e.target.value)
    setPage(1)
  }

  function clearSearch() {
    setSearch('')
    setPage(1)
  }

  function handleFilter(f) {
    setFilter(f)
    setPage(1)
  }

  const attentionCount = summaryStats.lowStock + summaryStats.outOfStock
  const hasAttentionItems = attentionCount > 0

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900/95 border border-[var(--purple)]/40 text-white shadow-xl backdrop-blur-md animate-fade-in text-sm">
          {feedbackToast.type === 'success' ? (
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] flex items-center justify-center text-white shadow-[0_0_16px_rgba(124,58,237,0.35)] shrink-0">
            <Warehouse className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--ink)] tracking-tight">
              {t('stockTitle') || 'Stock Management'}
            </h1>
            <p className="text-xs text-[var(--ink-soft)] mt-0.5">
              {t('stockSubtitle') || 'Track book quantities, inventory levels, and stock movements'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--bg)]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{t('refresh') || 'Refresh'}</span>
          </Button>

          {canSettings && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] hover:border-[var(--purple)]/40 hover:text-[var(--purple)]"
            >
              <Settings2 className="h-4 w-4 me-1.5" />
              <span>{t('stockSettingsBtn') || 'Stock Settings'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Global Stock Management Disabled Notice */}
      {settings && !settings.stockManagementEnabled && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-300 backdrop-blur-xs">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-amber-200">{t('stockDisabledWarning')}</span>
          </div>
          {canSettings && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-1 rounded-[8px] bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold text-xs transition-colors shrink-0"
            >
              {t('stockEnableBtn') || 'Enable'}
            </button>
          )}
        </div>
      )}

      {/* Attention Required Banner */}
      {hasAttentionItems && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-200">
                {t('stockAttentionBannerTitle', { count: attentionCount }) ||
                  `${attentionCount} products require inventory attention`}
              </div>
              <div className="text-xs text-amber-300/80 mt-0.5">
                {t('stockAttentionBannerDesc', {
                  low: summaryStats.lowStock,
                  out: summaryStats.outOfStock,
                }) ||
                  `${summaryStats.lowStock} low stock and ${summaryStats.outOfStock} out of stock items in your catalog.`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {summaryStats.lowStock > 0 && (
              <button
                type="button"
                onClick={() => handleFilter('low-stock')}
                className="px-3 py-1.5 rounded-[8px] bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold transition-colors"
              >
                {t('stockFilterLow')} ({summaryStats.lowStock})
              </button>
            )}
            {summaryStats.outOfStock > 0 && (
              <button
                type="button"
                onClick={() => handleFilter('out-of-stock')}
                className="px-3 py-1.5 rounded-[8px] bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-xs font-semibold transition-colors"
              >
                {t('stockFilterOut')} ({summaryStats.outOfStock})
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5 Data-Driven Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Products */}
        <div
          onClick={() => handleFilter('all')}
          className={`p-3.5 rounded-xl border bg-[var(--card)] transition-all cursor-pointer group ${
            filter === 'all'
              ? 'border-[var(--purple)] ring-1 ring-[var(--purple)]/40 shadow-[0_0_12px_rgba(124,58,237,0.2)]'
              : 'border-[var(--line)] hover:border-[var(--purple)]/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wider">
              {t('stockCardTotal') || 'Total Products'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-[var(--purple)]/10 text-[var(--purple)] flex items-center justify-center">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--ink)] font-mono">
            {summaryStats.total}
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] mt-1 truncate">
            {t('stockCardTotalSub') || 'All catalog book titles'}
          </div>
        </div>

        {/* Card 2: In Stock */}
        <div
          className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--card)] transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              {t('stockCardInStock') || 'In Stock'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {summaryStats.inStock}
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] mt-1 truncate">
            {t('stockCardInStockSub') || 'Healthy available inventory'}
          </div>
        </div>

        {/* Card 3: Low Stock */}
        <div
          onClick={() => handleFilter('low-stock')}
          className={`p-3.5 rounded-xl border bg-[var(--card)] transition-all cursor-pointer group ${
            filter === 'low-stock'
              ? 'border-amber-500 ring-1 ring-amber-500/40 shadow-[0_0_12px_rgba(245,166,35,0.2)]'
              : 'border-[var(--line)] hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              {t('stockCardLowStock') || 'Low Stock'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingDown className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {summaryStats.lowStock}
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] mt-1 truncate">
            {t('stockCardLowStockSub') || 'At or below alert threshold'}
          </div>
        </div>

        {/* Card 4: Out of Stock */}
        <div
          onClick={() => handleFilter('out-of-stock')}
          className={`p-3.5 rounded-xl border bg-[var(--card)] transition-all cursor-pointer group ${
            filter === 'out-of-stock'
              ? 'border-red-500 ring-1 ring-red-500/40 shadow-[0_0_12px_rgba(255,65,108,0.2)]'
              : 'border-[var(--line)] hover:border-red-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              {t('stockCardOutOfStock') || 'Out of Stock'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <XCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-400 font-mono">
            {summaryStats.outOfStock}
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] mt-1 truncate">
            {t('stockCardOutOfStockSub') || 'Zero or negative inventory'}
          </div>
        </div>

        {/* Card 5: Not Tracked */}
        <div
          className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--card)] transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('stockCardNotTracked') || 'Not Tracked'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-500/10 text-slate-400 flex items-center justify-center">
              <EyeOff className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-300 font-mono">
            {summaryStats.notTracked}
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] mt-1 truncate">
            {t('stockCardNotTrackedSub') || 'Inventory tracking disabled'}
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Main Stock Card & Toolbar */}
      <Card padded={false} className="border border-[var(--line)] bg-[var(--card)] overflow-hidden shadow-sm">
        {/* Toolbar Header */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--line)] bg-[var(--card)]">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-soft)]" />
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder={t('stockSearchPlaceholder') || 'Search by title or author…'}
              className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] py-2 ps-9 pe-8 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]/40 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleFilter('all')}
              className={`flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-[var(--purple)] text-white shadow-[0_0_12px_rgba(124,58,237,0.35)]'
                  : 'border border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--purple)]/40'
              }`}
            >
              <span>{t('stockFilterAll') || 'All'}</span>
              <span
                className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-mono ${
                  filter === 'all' ? 'bg-white/20 text-white' : 'bg-[var(--card)] text-[var(--ink-soft)]'
                }`}
              >
                {summaryStats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleFilter('low-stock')}
              className={`flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                filter === 'low-stock'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,166,35,0.4)]'
                  : 'border border-[var(--line)] bg-[var(--bg)] text-amber-400 hover:border-amber-500/40'
              }`}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              <span>{t('stockFilterLow') || 'Low Stock'}</span>
              <span
                className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-mono ${
                  filter === 'low-stock' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/15 text-amber-300'
                }`}
              >
                {summaryStats.lowStock}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleFilter('out-of-stock')}
              className={`flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                filter === 'out-of-stock'
                  ? 'bg-red-500 text-white font-bold shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                  : 'border border-[var(--line)] bg-[var(--bg)] text-red-400 hover:border-red-500/40'
              }`}
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>{t('stockFilterOut') || 'Out of Stock'}</span>
              <span
                className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-mono ${
                  filter === 'out-of-stock' ? 'bg-white/20 text-white' : 'bg-red-500/15 text-red-300'
                }`}
              >
                {summaryStats.outOfStock}
              </span>
            </button>
          </div>
        </div>

        {/* Content Area: Table / Skeletons / Empty State */}
        {loading ? (
          <div className="divide-y divide-[var(--line)]">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="flex items-center justify-between p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-14 rounded-md bg-[var(--bg)]" />
                  <div className="space-y-2">
                    <div className="h-4 w-44 rounded bg-[var(--bg)]" />
                    <div className="h-3 w-28 rounded bg-[var(--bg)]" />
                  </div>
                </div>
                <div className="h-6 w-16 rounded bg-[var(--bg)]" />
                <div className="h-6 w-12 rounded bg-[var(--bg)]" />
                <div className="h-6 w-24 rounded bg-[var(--bg)]" />
                <div className="h-8 w-28 rounded bg-[var(--bg)]" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center text-[var(--ink-soft)]">
              <Warehouse className="h-6 w-6 opacity-60" />
            </div>
            <div className="text-base font-semibold text-[var(--ink)]">
              {search || filter !== 'all'
                ? t('stockNoProductsFiltered') || 'No products match the selected filters.'
                : t('stockNoProductsCatalog') || 'No books or products found in the catalog.'}
            </div>
            {(search || filter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setFilter('all')
                  setPage(1)
                }}
                className="mt-1 px-3.5 py-1.5 rounded-[9px] border border-[var(--line)] bg-[var(--card)] hover:border-[var(--purple)] text-xs font-semibold text-[var(--purple)] transition-colors"
              >
                {t('stockClearFilters') || 'Clear Filters'}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--ink-soft)] text-xs font-semibold uppercase tracking-wider bg-[var(--bg)]/50">
                  <th className="px-4 py-3 text-start">{t('stockColProduct') || 'Product'}</th>
                  <th className="px-4 py-3 text-center">{t('stockColCurrentQty') || 'Current Qty'}</th>
                  <th className="px-4 py-3 text-center">{t('stockColThreshold') || 'Alert Threshold'}</th>
                  <th className="px-4 py-3 text-center">{t('stockColStatus') || 'Status'}</th>
                  <th className="px-4 py-3 text-center">
                    {t('stockTrackingLabel') || 'Track Stock'}
                  </th>
                  <th className="px-4 py-3 text-end">{t('stockColActions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {products.map((p) => {
                  const imageSrc = p.images?.[0]?.url || p.image
                  const isTracked = !!p.trackStock
                  const stock = p.currentStock ?? 0
                  const threshold = p.lowStockThreshold ?? 5

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[var(--bg)]/60 transition-colors group"
                    >
                      {/* Product Thumbnail & Details */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-12 rounded-[6px] overflow-hidden bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center shrink-0 shadow-xs">
                            {imageSrc ? (
                              <img
                                src={getImageUrl(imageSrc)}
                                alt={p.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                }}
                              />
                            ) : (
                              <BookOpen className="h-4 w-4 text-[var(--ink-soft)]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--ink)] leading-snug line-clamp-1 group-hover:text-[var(--purple)] transition-colors">
                              {p.title}
                            </div>
                            {p.author && (
                              <div className="text-xs text-[var(--ink-soft)] mt-0.5 line-clamp-1">
                                {p.author}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Current Quantity */}
                      <td className="px-4 py-3 text-center">
                        {isTracked ? (
                          <div className="inline-flex items-center justify-center">
                            <span
                              className={`font-mono font-bold text-base px-2.5 py-0.5 rounded-[7px] ${
                                stock <= 0
                                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                  : stock <= threshold
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {stock}
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-slate-500">
                            {stock ?? 0}
                          </span>
                        )}
                      </td>

                      {/* Threshold */}
                      <td className="px-4 py-3 text-center">
                        {isTracked ? (
                          <span className="font-mono text-xs font-medium text-[var(--ink-soft)] px-2 py-0.5 rounded-[6px] bg-[var(--bg)] border border-[var(--line)]">
                            {threshold}
                          </span>
                        ) : (
                          <span className="text-[var(--ink-soft)] text-xs">—</span>
                        )}
                      </td>

                      {/* Status Pill */}
                      <td className="px-4 py-3 text-center">
                        <StockStatusPill product={p} t={t} />
                      </td>

                      {/* Track Stock Status Badge (Read-Only) */}
                      <td className="px-4 py-3 text-center">
                        {isTracked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            {t('stockTrackingEnabled') || 'Enabled'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            {t('stockTrackingDisabled') || 'Disabled'}
                          </span>
                        )}
                      </td>

                      {/* Actions (History & Adjust Drawer Trigger) */}
                      <td className="px-4 py-3 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setMovementsTarget(p)}
                            className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-xs font-medium text-[var(--ink-soft)] border border-[var(--line)] bg-[var(--card)] hover:text-[var(--ink)] hover:border-[var(--ink-soft)] transition-colors"
                            title={t('stockHistoryBtn') || 'History'}
                          >
                            <History className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">{t('stockHistoryBtn') || 'History'}</span>
                          </button>

                          {canAdjust && (
                            <button
                              type="button"
                              onClick={() => setAdjustTarget(p)}
                              className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-xs font-semibold text-white bg-[var(--purple)] hover:bg-[#6d28d9] shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all"
                            >
                              <Sliders className="h-3.5 w-3.5" />
                              <span>
                                {p.trackStock
                                  ? t('stockAdjustBtn') || 'Adjust'
                                  : t('stockSetQtyBtn') || 'Set Stock'}
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[var(--line)] px-4 py-3 gap-3 bg-[var(--card)]">
          <span className="text-xs text-[var(--ink-soft)]">
            {t('stockShowingCount', {
              start: Math.min((page - 1) * 50 + 1, total),
              end: Math.min(page * 50, total),
              total,
            }) || `Showing ${Math.min((page - 1) * 50 + 1, total)}–${Math.min(page * 50, total)} of ${total} products`}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-[8px] border border-[var(--line)] bg-[var(--card)] p-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title={t('prev') || 'Previous'}
              >
                {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>

              <span className="px-2 text-xs font-mono text-[var(--ink-soft)]">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-[8px] border border-[var(--line)] bg-[var(--card)] p-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title={t('next') || 'Next'}
              >
                {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Slide-Over Stock Adjustment Drawer */}
      {adjustTarget && (
        <StockAdjustmentDrawer
          product={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onDone={() => {
            setAdjustTarget(null)
            reload()
            fetchGlobalStats()
          }}
        />
      )}

      {/* Full Movement History Modal */}
      {movementsTarget && (
        <MovementsModal
          product={movementsTarget}
          onClose={() => setMovementsTarget(null)}
        />
      )}

      {/* Stock Settings Modal */}
      {settingsOpen && (
        <StockSettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onDone={() => {
            setSettingsOpen(false)
            reloadSettings()
            fetchGlobalStats()
          }}
        />
      )}
    </div>
  )
}

/**
 * Slide-Over Stock Adjustment Drawer.
 * Supports Add (+), Remove (-), and Set Exact (=) modes with live arithmetic before/after preview.
 */
function StockAdjustmentDrawer({ product, onClose, onDone }) {
  const { t, language, isRTL } = useLanguage()

  // Mode: 'add' | 'remove' | 'set'
  const [mode, setMode] = useState('add')
  const [amount, setAmount] = useState('1')
  const [reason, setReason] = useState('MANUAL_ADJUSTMENT')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const currentStock = product.currentStock ?? 0

  // Fetch recent 3 movements for this book to display right in drawer
  const { data: recentMovData } = useFetch(
    `/stock/products/${product.id}/movements?limit=3`
  )
  const recentMovements = recentMovData?.items ?? []

  // Live arithmetic calculation
  const calculatedStock = useMemo(() => {
    const val = parseInt(amount, 10)
    if (isNaN(val) || val < 0) return currentStock

    if (mode === 'add') {
      return currentStock + val
    }
    if (mode === 'remove') {
      return Math.max(0, currentStock - val)
    }
    if (mode === 'set') {
      return val
    }
    return currentStock
  }, [mode, amount, currentStock])

  const calculatedDelta = calculatedStock - currentStock

  async function handleSubmit(e) {
    e.preventDefault()
    const targetQty = calculatedStock

    if (!Number.isInteger(targetQty) || targetQty < 0) {
      setError(t('stockInvalidQtyError') || 'Enter a valid quantity (0 or more)')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await api.post(`/stock/products/${product.id}/adjust`, {
        newStock: targetQty,
        reason,
        note: note.trim() || undefined,
      })
      onDone()
    } catch (err) {
      setError(err.message || t('stockUpdateError') || 'Failed to update stock')
    } finally {
      setSubmitting(false)
    }
  }

  function handleQuickIncrement(delta) {
    const currentVal = parseInt(amount, 10) || 0
    const nextVal = Math.max(1, currentVal + delta)
    setAmount(String(nextVal))
  }

  const imageSrc = product.images?.[0]?.url || product.image

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Drawer Container (Slides from Right in LTR, Left in RTL) */}
      <div
        className={`fixed inset-y-0 ${
          isRTL ? 'start-0' : 'end-0'
        } flex max-w-full z-50`}
      >
        <div className="w-screen max-w-md bg-[var(--card)] border-inline-start border-[var(--line)] shadow-2xl flex flex-col justify-between overflow-y-auto">
          {/* Header */}
          <div className="p-5 border-b border-[var(--line)] bg-[var(--card)] flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--purple)]" />
                <h2 className="text-base font-bold text-[var(--ink)]">
                  {t('stockDrawerTitle') || 'Adjust Stock'}
                </h2>
              </div>
              <p className="text-xs text-[var(--ink-soft)] mt-0.5">
                {t('stockDrawerSubtitle') ||
                  'Update quantity and log an inventory movement'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5 flex-1 overflow-y-auto">
            {error && <ErrorBanner message={error} />}

            {/* Product Card Summary */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[var(--line)] bg-[var(--bg)]/60">
              <div className="w-11 h-14 rounded-md overflow-hidden bg-[var(--card)] border border-[var(--line)] flex items-center justify-center shrink-0">
                {imageSrc ? (
                  <img
                    src={getImageUrl(imageSrc)}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="h-5 w-5 text-[var(--ink-soft)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-[var(--ink)] line-clamp-1">
                  {product.title}
                </div>
                {product.author && (
                  <div className="text-xs text-[var(--ink-soft)] mt-0.5 line-clamp-1">
                    {product.author}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {t('stockDrawerPreviewCurrent') || 'Current Stock'}:
                  </span>
                  <span className="font-mono font-bold text-xs text-[var(--ink)] px-1.5 py-0.2 rounded bg-[var(--card)] border border-[var(--line)]">
                    {currentStock}
                  </span>
                </div>
              </div>
            </div>

            {/* Mode Selector Segmented Pill */}
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wider mb-2">
                {t('stockAdjustmentMode') || 'Adjustment Mode'}
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl border border-[var(--line)] bg-[var(--bg)]">
                <button
                  type="button"
                  onClick={() => {
                    setMode('add')
                    setReason('RESTOCK')
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-xs font-bold transition-all cursor-pointer ${
                    mode === 'add'
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(32,215,154,0.35)]'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('stockDrawerModeAdd') || 'Add (+)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('remove')
                    setReason('MANUAL_ADJUSTMENT')
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-xs font-bold transition-all cursor-pointer ${
                    mode === 'remove'
                      ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(255,65,108,0.35)]'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  <Minus className="h-3.5 w-3.5" />
                  <span>{t('stockDrawerModeRemove') || 'Remove (-)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('set')
                    setReason('MANUAL_ADJUSTMENT')
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-xs font-bold transition-all cursor-pointer ${
                    mode === 'set'
                      ? 'bg-[var(--purple)] text-white shadow-[0_0_12px_rgba(124,58,237,0.35)]'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  <Equal className="h-3.5 w-3.5" />
                  <span>{t('stockDrawerModeSet') || 'Set Exact (=)'}</span>
                </button>
              </div>
            </div>

            {/* Quantity Input with Quick Step Chips */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wider">
                  {mode === 'set'
                    ? t('stockDrawerExactStockLabel') || 'New Exact Quantity'
                    : t('stockDrawerAdjustAmountLabel') || 'Adjustment Amount'}
                </label>
                <span className="text-[11px] text-[var(--ink-soft)]">
                  {mode === 'add' && `+${amount || 0}`}
                  {mode === 'remove' && `-${amount || 0}`}
                  {mode === 'set' && `=${amount || 0}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickIncrement(-1)}
                  className="w-10 h-10 rounded-[10px] border border-[var(--line)] bg-[var(--bg)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--purple)] transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 text-center font-mono font-bold text-lg rounded-[10px] border border-[var(--line)] bg-[var(--bg)] py-2 text-[var(--ink)] focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]/40"
                />

                <button
                  type="button"
                  onClick={() => handleQuickIncrement(1)}
                  className="w-10 h-10 rounded-[10px] border border-[var(--line)] bg-[var(--bg)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--purple)] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Quick Increment Presets */}
              <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                {[5, 10, 25, 50, 100].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setAmount(String(step))}
                    className="px-2.5 py-1 rounded-[7px] border border-[var(--line)] bg-[var(--card)] hover:border-[var(--purple)] hover:text-[var(--purple)] text-[11px] font-mono text-[var(--ink-soft)] transition-colors"
                  >
                    {mode === 'set' ? `${step}` : `+${step}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Arithmetic Preview Box */}
            <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--bg)]/90 shadow-inner">
              <div className="text-[11px] font-semibold text-[var(--ink-soft)] uppercase tracking-wider mb-2.5">
                {t('stockPreviewArithmetic') || 'Inventory Balance Preview'}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* Before */}
                <div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--card)]">
                  <div className="text-[10px] text-[var(--ink-soft)] truncate">
                    {t('stockDrawerPreviewCurrent') || 'Current'}
                  </div>
                  <div className="font-mono font-bold text-base text-[var(--ink)] mt-0.5">
                    {currentStock}
                  </div>
                </div>

                {/* Delta */}
                <div
                  className={`p-2.5 rounded-lg border ${
                    calculatedDelta > 0
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : calculatedDelta < 0
                      ? 'border-red-500/30 bg-red-500/10 text-red-400'
                      : 'border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)]'
                  }`}
                >
                  <div className="text-[10px] truncate">
                    {t('stockDrawerPreviewDelta') || 'Delta'}
                  </div>
                  <div className="font-mono font-bold text-base mt-0.5">
                    {calculatedDelta > 0 ? `+${calculatedDelta}` : calculatedDelta}
                  </div>
                </div>

                {/* After */}
                <div className="p-2.5 rounded-lg border border-[var(--purple)]/40 bg-[var(--purple)]/10 text-[var(--purple)] shadow-[0_0_12px_rgba(124,58,237,0.15)]">
                  <div className="text-[10px] font-semibold truncate">
                    {t('stockDrawerPreviewAfter') || 'New Total'}
                  </div>
                  <div className="font-mono font-black text-base mt-0.5">
                    {calculatedStock}
                  </div>
                </div>
              </div>
            </div>

            {/* Reason Selector */}
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wider mb-1.5">
                {t('stockReasonLabel') || 'Reason'}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]/40"
              >
                <option value="MANUAL_ADJUSTMENT">
                  {t('stockReasonManualAdjustment') || 'Manual adjustment'}
                </option>
                <option value="RESTOCK">
                  {t('stockReasonRestock') || 'Restock'}
                </option>
              </select>
            </div>

            {/* Optional Note */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wider">
                  {t('stockNoteLabel') || 'Note'}
                </label>
                <span className="text-[11px] text-[var(--ink-soft)]">
                  {t('stockOptional') || '(optional)'}
                </span>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={
                  t('stockNotePlaceholder') ||
                  'e.g. Received new shipment from publisher…'
                }
                className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] resize-none focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]/40"
              />
            </div>

            {/* Mini Recent Movements Timeline */}
            {recentMovements.length > 0 && (
              <div className="pt-2 border-t border-[var(--line)]">
                <div className="text-[11px] font-semibold text-[var(--ink-soft)] uppercase tracking-wider mb-2.5">
                  {t('stockRecentMovements') || 'Recent Movements for this Product'}
                </div>
                <div className="space-y-2">
                  {recentMovements.map((mov) => (
                    <div
                      key={mov.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--line)] bg-[var(--bg)]/50 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                            mov.delta > 0
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-red-500/15 text-red-400'
                          }`}
                        >
                          {mov.delta > 0 ? `+${mov.delta}` : mov.delta}
                        </span>
                        <span className="text-[var(--ink-soft)] text-[11px]">
                          {mov.reason === 'RESTOCK'
                            ? t('stockReasonRestock')
                            : mov.reason === 'ORDER_CONFIRMED'
                            ? t('stockReasonOrderConfirmed')
                            : mov.reason === 'ORDER_CANCELLED'
                            ? t('stockReasonOrderCancelled')
                            : t('stockReasonManualAdjustment')}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-[var(--ink-soft)]">
                        {new Date(mov.createdAt).toLocaleDateString(
                          language === 'ar'
                            ? 'ar-MA'
                            : language === 'fr'
                            ? 'fr-MA'
                            : 'en-GB'
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-[var(--line)] bg-[var(--card)] flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
              className="rounded-[10px]"
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-[10px] bg-[var(--purple)] hover:bg-[#6d28d9] shadow-[0_0_16px_rgba(124,58,237,0.35)]"
            >
              {submitting
                ? t('stockSaving') || 'Saving…'
                : t('stockSaveBtn') || 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Movements Modal for viewing full product movement history.
 */
function MovementsModal({ product, onClose }) {
  const { t, language } = useLanguage()
  const { data: rawMov, loading, error } = useFetch(
    `/stock/products/${product.id}/movements?limit=50`
  )
  const movements = rawMov?.items ?? []

  function formatDelta(delta) {
    if (delta > 0)
      return (
        <span className="text-emerald-400 font-mono font-bold">
          +{delta}
        </span>
      )
    return (
      <span className="text-red-400 font-mono font-bold">
        {delta}
      </span>
    )
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString(
      language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-MA' : 'en-GB',
      { dateStyle: 'short', timeStyle: 'short' }
    )
  }

  function getReasonBadge(reason) {
    switch (reason) {
      case 'MANUAL_ADJUSTMENT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/10 text-slate-300 border border-slate-500/20">
            {t('stockReasonManualAdjustment') || 'Manual adjustment'}
          </span>
        )
      case 'RESTOCK':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {t('stockReasonRestock') || 'Restock'}
          </span>
        )
      case 'ORDER_CONFIRMED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {t('stockReasonOrderConfirmed') || 'Order confirmed'}
          </span>
        )
      case 'ORDER_CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {t('stockReasonOrderCancelled') || 'Order cancelled'}
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/10 text-slate-300">
            {reason}
          </span>
        )
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        t('stockHistoryModalTitle', { title: product.title }) ||
        `Stock History — ${product.title}`
      }
      width="max-w-3xl"
    >
      <div className="pt-2">
        {error && <ErrorBanner message={error} />}

        {loading ? (
          <div className="py-12 text-center text-sm text-[var(--ink-soft)]">
            {t('loading') || 'Loading…'}
          </div>
        ) : movements.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--ink-soft)]">
            {t('stockNoMovements') || 'No stock movements recorded'}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-sm text-start">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--ink-soft)] text-xs font-semibold uppercase tracking-wide bg-[var(--bg)]/50">
                  <th className="px-3.5 py-2.5 text-start">
                    {t('stockColDate') || 'Date'}
                  </th>
                  <th className="px-3.5 py-2.5 text-center">
                    {t('stockColChange') || 'Change'}
                  </th>
                  <th className="px-3.5 py-2.5 text-center">
                    {t('stockColNewStock') || 'Balance After'}
                  </th>
                  <th className="px-3.5 py-2.5 text-start">
                    {t('stockColReason') || 'Reason'}
                  </th>
                  <th className="px-3.5 py-2.5 text-start">
                    {t('colCustomer') || 'Admin / Order'}
                  </th>
                  <th className="px-3.5 py-2.5 text-start">
                    {t('stockColNote') || 'Note'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--bg)]/60">
                    <td className="px-3.5 py-2.5 text-xs text-[var(--ink-soft)] whitespace-nowrap">
                      {formatDate(m.createdAt)}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      {formatDelta(m.delta)}
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-mono font-bold text-[var(--ink)]">
                      {m.newStock}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {getReasonBadge(m.reason)}
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-[var(--ink-soft)]">
                      {m.actorAdmin
                        ? m.actorAdmin.name || m.actorAdmin.username
                        : m.order
                        ? `#${m.order.orderNumber}`
                        : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-[var(--ink-soft)] max-w-[180px] truncate">
                      {m.note || '—'}
                    </td>
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

/**
 * Stock Settings Modal.
 */
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
      setError(err.message || t('stockUpdateError') || 'Failed to save settings')
    } finally {
      setSubmitting(false)
    }
  }

  function toggle(key) {
    setForm((f) => ({ ...f, [key]: !f[key] }))
  }

  return (
    <Modal open onClose={onClose} title={t('stockSettingsModalTitle') || 'Stock Settings'}>
      <form onSubmit={handleSubmit} className="space-y-5 pt-2">
        {error && <ErrorBanner message={error} />}

        <ToggleRow
          label={t('stockSettingEnableManagement') || 'Enable Stock Management'}
          description={
            t('stockSettingEnableManagementDesc') ||
            'When enabled, quantities are automatically deducted upon order confirmation'
          }
          checked={form.stockManagementEnabled}
          onChange={() => toggle('stockManagementEnabled')}
          isRTL={isRTL}
        />

        <ToggleRow
          label={
            t('stockSettingAllowOverselling') || 'Allow Selling When Out of Stock'
          }
          description={
            t('stockSettingAllowOversellingDesc') ||
            'If enabled, orders can be confirmed even if stock is exhausted'
          }
          checked={form.allowOverselling}
          onChange={() => toggle('allowOverselling')}
          isRTL={isRTL}
        />

        <ToggleRow
          label={t('stockSettingLowStockAlert') || 'Low Stock Alerts'}
          description={
            t('stockSettingLowStockAlertDesc') ||
            'Warnings appear when products approach the minimum threshold'
          }
          checked={form.lowStockAlertEnabled}
          onChange={() => toggle('lowStockAlertEnabled')}
          isRTL={isRTL}
        />

        <div>
          <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">
            {t('stockSettingDefaultThreshold') || 'Default Low Stock Threshold'}
          </label>
          <input
            type="number"
            min="0"
            max="10000"
            value={form.defaultLowStockThreshold}
            onChange={(e) =>
              setForm((f) => ({ ...f, defaultLowStockThreshold: e.target.value }))
            }
            className="w-32 rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]/40"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--line)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
            className="rounded-[10px]"
          >
            {t('cancel') || 'Cancel'}
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="rounded-[10px] bg-[var(--purple)] hover:bg-[#6d28d9] shadow-[0_0_14px_rgba(124,58,237,0.35)]"
          >
            {submitting
              ? t('stockSaving') || 'Saving…'
              : t('stockSaveSettingsBtn') || 'Save Settings'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Toggle Switch Row Component.
 */
function ToggleRow({ label, description, checked, onChange, isRTL }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div
          className={`h-5 w-9 rounded-full transition-colors duration-200 ${
            checked ? 'bg-[var(--purple)]' : 'bg-slate-700'
          }`}
        />
        <div
          className={`absolute top-0.5 start-0.5 h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked
              ? isRTL
                ? '-translate-x-4'
                : 'translate-x-4'
              : 'translate-x-0'
          }`}
        />
      </div>
      <div>
        <div className="text-sm font-semibold text-[var(--ink)]">{label}</div>
        {description && (
          <div className="text-xs text-[var(--ink-soft)] mt-0.5">{description}</div>
        )}
      </div>
    </label>
  )
}
