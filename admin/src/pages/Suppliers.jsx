import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  Search,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Coins,
  Receipt,
  CreditCard,
  Package,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  User,
  MapPin,
  RefreshCw,
  X,
  Check,
  BookOpen,
  MessageCircle,
  Sliders,
  DollarSign,
  Info,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatNumber } from '../lib/format.js'
import { Card } from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Modal from '../components/ui/Modal.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Suppliers() {
  const { t, language, isRTL } = useLanguage()
  const { can, isOwner } = useAuth()
  const navigate = useNavigate()

  const canManage = isOwner || can('SUPPLIERS_MANAGE')

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'OUTSTANDING' | 'INACTIVE'
  const [refreshing, setRefreshing] = useState(false)
  const [feedbackToast, setFeedbackToast] = useState(null)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  // Fetch suppliers list
  const { data: responseData, loading, error, reload } = useFetch('/suppliers')

  // Standardize supplier extraction (supports { items, total, summary } or raw array)
  const suppliers = useMemo(() => {
    if (!responseData) return []
    if (Array.isArray(responseData)) return responseData
    if (Array.isArray(responseData.items)) return responseData.items
    if (Array.isArray(responseData.data)) return responseData.data
    return []
  }, [responseData])

  const apiSummary = responseData?.summary || null

  // Fetch product catalog for drawer product linking
  const { data: catalogData } = useFetch('/products?limit=500')
  const catalogProducts = useMemo(() => {
    if (!catalogData) return []
    if (Array.isArray(catalogData)) return catalogData
    if (Array.isArray(catalogData.items)) return catalogData.items
    if (Array.isArray(catalogData.data)) return catalogData.data
    return []
  }, [catalogData])

  // Toast feedback auto-dismiss
  useEffect(() => {
    if (!feedbackToast) return
    const timer = setTimeout(() => setFeedbackToast(null), 3500)
    return () => clearTimeout(timer)
  }, [feedbackToast])

  const showToast = (message, type = 'success') => {
    setFeedbackToast({ message, type })
  }

  // Manual refresh with single 360° spin animation (~420ms)
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await reload()
    } finally {
      setTimeout(() => setRefreshing(false), 420)
    }
  }

  // Aggregate KPI summary stats
  const stats = useMemo(() => {
    if (apiSummary) {
      return {
        total: Number(responseData?.total ?? suppliers.length),
        active: Number(apiSummary.activeCount ?? suppliers.filter((s) => s.isActive !== false).length),
        totalPurchases: Number(apiSummary.totalPurchasesAmount ?? 0),
        totalBalance: Number(apiSummary.totalOutstandingBalance ?? 0),
      }
    }

    return suppliers.reduce(
      (acc, s) => {
        acc.total += 1
        if (s.isActive !== false) acc.active += 1
        acc.totalPurchases += Number(s.totalPurchases || 0)
        acc.totalBalance += Number(s.balance || 0)
        return acc
      },
      { total: 0, active: 0, totalPurchases: 0, totalBalance: 0 }
    )
  }, [suppliers, apiSummary, responseData])

  // Filtered suppliers based on search query and status pill
  const filteredSuppliers = useMemo(() => {
    if (!Array.isArray(suppliers)) return []

    return suppliers.filter((s) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.whatsapp && s.whatsapp.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q))

      const isActive = s.isActive !== false
      const balance = Number(s.balance || 0)

      let matchesFilter = true
      if (filter === 'ACTIVE') {
        matchesFilter = isActive
      } else if (filter === 'OUTSTANDING') {
        matchesFilter = balance > 0
      } else if (filter === 'INACTIVE') {
        matchesFilter = !isActive
      }

      return matchesSearch && matchesFilter
    })
  }, [suppliers, search, filter])

  const handleOpenCreate = () => {
    setEditingSupplier(null)
    setDrawerOpen(true)
  }

  const handleOpenEdit = (s, e) => {
    if (e) e.stopPropagation()
    setEditingSupplier(s)
    setDrawerOpen(true)
  }

  const handleDeleteSupplier = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      await api.del(`/suppliers/${deleteTarget.id}`)
      showToast(t('supplierDeletedSuccess') || 'Supplier deleted successfully')
      setDeleteTarget(null)
      reload()
    } catch (err) {
      showToast(err.message || 'Failed to delete supplier', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="stock-page-enter relative space-y-6 pb-12">
      {/* Page Micro-Animations and Design Keyframes */}
      <style>{`
        @keyframes stockPageFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes stockCardEntry {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes stockRefreshOnce {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes stockDrawerSlideLTR {
          from { opacity: 0; transform: translateX(18px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes stockDrawerSlideRTL {
          from { opacity: 0; transform: translateX(-18px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .stock-page-enter {
          animation: stockPageFadeIn 220ms ease-out forwards;
        }
        .stock-card-anim {
          opacity: 0;
          animation: stockCardEntry 250ms ease-out forwards;
        }
        .stock-spin-once {
          animation: stockRefreshOnce 420ms cubic-bezier(0.4, 0, 0.2, 1) 1 forwards;
        }
        .stock-drawer-ltr {
          animation: stockDrawerSlideLTR 220ms ease-out forwards;
        }
        .stock-drawer-rtl {
          animation: stockDrawerSlideRTL 220ms ease-out forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .stock-page-enter,
          .stock-card-anim,
          .stock-spin-once,
          .stock-drawer-ltr,
          .stock-drawer-rtl {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* Page-Scoped Ambient Background Lighting Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-24 -end-24 w-96 h-96 rounded-full bg-gradient-to-br from-purple-600/12 to-indigo-600/5 blur-3xl" />
        <div className="absolute top-1/2 -start-24 w-80 h-80 rounded-full bg-gradient-to-tr from-violet-600/10 to-transparent blur-3xl" />
      </div>

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
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] flex items-center justify-center text-white shadow-[0_0_16px_rgba(124,58,237,0.35)] shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--ink)] tracking-tight">
              {t('suppliersTitle') || 'Suppliers Management'}
            </h1>
            <p className="text-xs text-[var(--ink-soft)] mt-0.5">
              {t('suppliersSubtitle') || 'Track vendors, credit balances, and negotiated purchase prices'}
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
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'stock-spin-once' : ''}`} />
            <span>{t('refresh') || 'Refresh'}</span>
          </Button>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              className="rounded-[10px] shadow-[0_0_14px_rgba(124,58,237,0.35)] hover:shadow-[0_0_18px_rgba(124,58,237,0.45)]"
            >
              <Plus className="h-4 w-4 me-1.5" />
              <span>{t('addSupplierBtn') || 'Add Supplier'}</span>
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* 4 Interactive KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
        {/* Card 1: Total Suppliers */}
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          aria-pressed={filter === 'ALL'}
          style={{ animationDelay: '0ms' }}
          className={`stock-card-anim text-start p-4 rounded-xl border transition-all duration-200 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)] hover:-translate-y-0.5 active:translate-y-0 ${
            filter === 'ALL'
              ? 'border-[var(--purple)] ring-1 ring-[var(--purple)]/50 bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--purple)]/15 shadow-[0_0_14px_rgba(124,58,237,0.35),0_0_28px_rgba(124,58,237,0.15)]'
              : 'border-[var(--line)] bg-gradient-to-br from-[var(--card)] to-[var(--purple)]/5 hover:border-[var(--purple)]/40 hover:shadow-[0_0_14px_rgba(124,58,237,0.22)]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wider">
              {t('supplierCardTotal') || 'Total Suppliers'}
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                filter === 'ALL'
                  ? 'bg-[var(--purple)] text-white shadow-[0_0_10px_rgba(124,58,237,0.5)]'
                  : 'bg-[var(--purple)]/10 text-[var(--purple)]'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--ink)] font-mono">
            {formatNumber(stats.total)}
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] mt-1 truncate">
            {t('supplierCardTotalSub') || 'Registered vendors in system'}
          </div>
        </button>

        {/* Card 2: Active Suppliers */}
        <button
          type="button"
          onClick={() => setFilter('ACTIVE')}
          aria-pressed={filter === 'ACTIVE'}
          style={{ animationDelay: '35ms' }}
          className={`stock-card-anim text-start p-4 rounded-xl border transition-all duration-200 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 hover:-translate-y-0.5 active:translate-y-0 ${
            filter === 'ACTIVE'
              ? 'border-emerald-500 ring-1 ring-emerald-500/50 bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-emerald-500/15 shadow-[0_0_14px_rgba(16,185,129,0.35),0_0_28px_rgba(16,185,129,0.15)]'
              : 'border-[var(--line)] bg-gradient-to-br from-[var(--card)] to-emerald-500/5 hover:border-emerald-500/40 hover:shadow-[0_0_14px_rgba(16,185,129,0.22)]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              {t('supplierCardActive') || 'Active Suppliers'}
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                filter === 'ACTIVE'
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatNumber(stats.active)}
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] mt-1 truncate">
            {t('supplierCardActiveSub') || 'Available for purchase orders'}
          </div>
        </button>

        {/* Card 3: Total Purchases */}
        <div
          style={{ animationDelay: '70ms' }}
          className="stock-card-anim p-4 rounded-xl border border-[var(--line)] bg-gradient-to-br from-[var(--card)] to-indigo-500/5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              {t('supplierCardPurchases') || 'Total Purchases'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Receipt className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-300 font-mono">
            {formatMoney(stats.totalPurchases, language)}
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] mt-1 truncate">
            {t('supplierCardPurchasesSub') || 'Total procurement volume'}
          </div>
        </div>

        {/* Card 4: Outstanding Balance */}
        <button
          type="button"
          onClick={() => setFilter('OUTSTANDING')}
          aria-pressed={filter === 'OUTSTANDING'}
          style={{ animationDelay: '105ms' }}
          className={`stock-card-anim text-start p-4 rounded-xl border transition-all duration-200 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 hover:-translate-y-0.5 active:translate-y-0 ${
            filter === 'OUTSTANDING'
              ? 'border-amber-500 ring-1 ring-amber-500/50 bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-amber-500/15 shadow-[0_0_14px_rgba(245,166,35,0.35),0_0_28px_rgba(245,166,35,0.15)]'
              : 'border-[var(--line)] bg-gradient-to-br from-[var(--card)] to-amber-500/5 hover:border-amber-500/40 hover:shadow-[0_0_14px_rgba(245,166,35,0.22)]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              {t('supplierCardBalance') || 'Outstanding Balance'}
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                filter === 'OUTSTANDING'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,166,35,0.4)]'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              <Coins className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${stats.totalBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {formatMoney(stats.totalBalance, language)}
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] mt-1 truncate">
            {t('supplierCardBalanceSub') || 'Pending vendor liabilities'}
          </div>
        </button>
      </div>

      {/* Main Table Card & Toolbar */}
      <Card padded={false} className="relative z-10 border border-[var(--line)] bg-[var(--card)] overflow-hidden shadow-sm">
        {/* Toolbar Header */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--line)] bg-[var(--card)]">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-soft)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchSuppliersPlaceholder') || 'Search by name, phone, city, or contact...'}
              className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] py-2 ps-9 pe-8 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]/40 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-[var(--purple)] text-white shadow-[0_0_10px_rgba(124,58,237,0.3)]'
                  : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              {t('supplierFilterAll') || 'All'} ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                filter === 'ACTIVE'
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-soft)] hover:text-emerald-400'
              }`}
            >
              {t('supplierFilterActive') || 'Active'} ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setFilter('OUTSTANDING')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                filter === 'OUTSTANDING'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,166,35,0.3)]'
                  : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-soft)] hover:text-amber-400'
              }`}
            >
              {t('supplierFilterOutstanding') || 'Outstanding'}
            </button>
            <button
              type="button"
              onClick={() => setFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                filter === 'INACTIVE'
                  ? 'bg-slate-500 text-white shadow-[0_0_10px_rgba(100,116,139,0.3)]'
                  : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              {t('supplierInactive') || 'Inactive'}
            </button>
          </div>
        </div>

        {/* Suppliers Table */}
        {loading && suppliers.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--ink-soft)]">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[var(--purple)]" />
            {t('loadingData') || 'Loading suppliers...'}
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-10 w-10 text-[var(--ink-soft)] mx-auto mb-3 opacity-40" />
            <div className="font-semibold text-[var(--ink)] text-sm mb-1">
              {t('noSuppliersFound') || 'No suppliers found'}
            </div>
            <p className="text-xs text-[var(--ink-soft)] max-w-sm mx-auto mb-4">
              {search
                ? t('noSearchResults') || 'No suppliers matching your search query.'
                : t('supplierDeactivateNotice') || 'Add your first supplier to start tracking purchases and catalog costs.'}
            </p>
            {canManage && !search && (
              <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 me-1.5" />
                {t('addSupplierBtn') || 'Add Supplier'}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-[var(--ink)]">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--bg)]/40 text-[11px] font-bold text-[var(--ink-soft)] uppercase tracking-wider">
                  <th className="px-4 py-3 text-start">{t('supplierName') || 'Supplier'}</th>
                  <th className="px-4 py-3 text-start">{t('contactInfo') || 'Contact & City'}</th>
                  <th className="px-4 py-3 text-center">{t('supplierProductsCount') || 'Catalog'}</th>
                  <th className="px-4 py-3 text-end">{t('supplierTotalPurchases') || 'Purchases'}</th>
                  <th className="px-4 py-3 text-end">{t('supplierTotalPaid') || 'Paid'}</th>
                  <th className="px-4 py-3 text-end">{t('supplierCurrentBalance') || 'Balance'}</th>
                  <th className="px-4 py-3 text-center">{t('supplierStatus') || 'Status'}</th>
                  <th className="px-4 py-3 text-end">{t('actions') || ''}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filteredSuppliers.map((s) => {
                  const isActive = s.isActive !== false
                  const balance = Number(s.balance || 0)
                  const productsCount = Number(s._count?.supplierProducts ?? s.productsCount ?? 0)

                  return (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/suppliers/${s.id}`)}
                      className="hover:bg-[var(--bg)]/50 transition-colors group cursor-pointer"
                    >
                      {/* Supplier Name & Contact Person */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--purple)]/15 to-indigo-500/10 border border-[var(--purple)]/30 flex items-center justify-center text-[var(--purple)] shrink-0 shadow-xs">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/suppliers/${s.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-sm text-[var(--ink)] hover:text-[var(--purple)] transition-colors line-clamp-1"
                            >
                              {s.name}
                            </Link>
                            {s.contactPerson ? (
                              <div className="text-xs text-[var(--ink-soft)] flex items-center gap-1.5 mt-0.5">
                                <User className="h-3 w-3 text-[var(--ink-soft)] shrink-0" />
                                <span className="line-clamp-1">{s.contactPerson}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Contact & City */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1 text-xs">
                          {s.phone ? (
                            <div className="flex items-center gap-1.5 text-[var(--ink)] font-mono" dir="ltr">
                              <Phone className="h-3 w-3 text-[var(--ink-soft)] shrink-0" />
                              <span>{s.phone}</span>
                            </div>
                          ) : null}

                          {s.whatsapp ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 font-mono" dir="ltr">
                              <MessageCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                              <span>{s.whatsapp}</span>
                            </div>
                          ) : null}

                          {s.city ? (
                            <div className="flex items-center gap-1.5 text-[var(--ink-soft)]">
                              <MapPin className="h-3 w-3 text-[var(--ink-soft)] shrink-0" />
                              <span className="line-clamp-1">{s.city}</span>
                            </div>
                          ) : null}

                          {!s.phone && !s.whatsapp && !s.city && (
                            <span className="text-[var(--ink-soft)]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Catalog Products Count */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-xs font-semibold bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]">
                          <Package className="h-3.5 w-3.5 text-[var(--purple)]" />
                          <span className="font-mono">{productsCount}</span>
                        </span>
                      </td>

                      {/* Total Purchases */}
                      <td className="px-4 py-3.5 text-end font-mono font-medium text-xs text-[var(--ink)]">
                        {formatMoney(s.totalPurchases || 0, language)}
                      </td>

                      {/* Total Paid */}
                      <td className="px-4 py-3.5 text-end font-mono font-medium text-xs text-[var(--ink-soft)]">
                        {formatMoney(s.totalPaid || 0, language)}
                      </td>

                      {/* Outstanding Balance */}
                      <td className="px-4 py-3.5 text-end">
                        <span
                          className={`inline-flex items-center font-mono text-xs font-bold px-2.5 py-1 rounded-full ${
                            balance > 0
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                              : balance < 0
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}
                        >
                          {formatMoney(balance, language)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <Badge kind={isActive ? 'ok' : 'neutral'}>
                          {isActive ? t('supplierActive') || 'Active' : t('supplierInactive') || 'Inactive'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-end" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/suppliers/${s.id}`}
                            className="p-1.5 rounded-[8px] text-[var(--ink-soft)] hover:text-[var(--purple)] hover:bg-[var(--bg)] transition-colors"
                            title={t('supplierDetailsTitle') || 'View Supplier Details'}
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>

                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleOpenEdit(s, e)}
                                className="p-1.5 rounded-[8px] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
                                title={t('editSupplierBtn') || 'Edit Info'}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteTarget(s)
                                }}
                                className="p-1.5 rounded-[8px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title={t('deleteSupplierBtn') || 'Delete Supplier'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
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

        {/* Table Footer */}
        <div className="p-3.5 border-t border-[var(--line)] bg-[var(--bg)]/30 flex items-center justify-between text-xs text-[var(--ink-soft)]">
          <span>
            {t('showingCount', { count: filteredSuppliers.length }) || `Showing ${filteredSuppliers.length} suppliers`}
          </span>
          <span className="font-mono">
            {filter !== 'ALL' ? `${t('filter') || 'Filtered'}: ${filter}` : ''}
          </span>
        </div>
      </Card>

      {/* Slide-Over Add / Edit Supplier Drawer */}
      {drawerOpen && (
        <SupplierDrawer
          supplier={editingSupplier}
          catalogProducts={catalogProducts}
          onClose={() => setDrawerOpen(false)}
          onSuccess={() => {
            setDrawerOpen(false)
            reload()
            showToast(
              editingSupplier
                ? t('supplierUpdatedSuccess') || 'Supplier updated successfully'
                : t('supplierCreatedSuccess') || 'Supplier created successfully'
            )
          }}
        />
      )}

      {/* Delete Supplier Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={true}
          onClose={() => !deleteBusy && setDeleteTarget(null)}
          title={t('deleteSupplierBtn') || 'Delete Supplier'}
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-xs leading-relaxed">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-red-100">{t('deleteSupplierConfirm') || 'Are you sure?'}</span>
                <p className="mt-1 text-red-300/90">
                  {t('supplierDeactivateNotice') ||
                    'If the supplier has purchase history, they will be safely deactivated instead of deleted.'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-xs space-y-1">
              <div className="font-bold text-[var(--ink)]">{deleteTarget.name}</div>
              {deleteTarget.contactPerson && (
                <div className="text-[var(--ink-soft)]">{deleteTarget.contactPerson}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteBusy}
              >
                {t('cancel') || 'Cancel'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteSupplier}
                disabled={deleteBusy}
              >
                {deleteBusy ? t('loading') || 'Processing...' : t('delete') || 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/**
 * Slide-Over Drawer for Adding and Editing Suppliers.
 * Incorporates:
 * - Direct Zod schema compliance (name, contactPerson, phone, whatsapp, email, city, address, notes, isActive).
 * - Optional initial catalog product linking on creation with unit cost (purchasePrice) and MOQ (minimumOrderQuantity).
 * - Keyboard Escape listener & directional animations.
 */
function SupplierDrawer({ supplier, catalogProducts, onClose, onSuccess }) {
  const { t, isRTL } = useLanguage()

  const isEditing = Boolean(supplier?.id)

  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contactPerson: supplier?.contactPerson || '',
    phone: supplier?.phone || '',
    whatsapp: supplier?.whatsapp || '',
    email: supplier?.email || '',
    city: supplier?.city || '',
    address: supplier?.address || '',
    notes: supplier?.notes || '',
    isActive: supplier ? supplier.isActive !== false : true,
  })

  // Optional initial product linking during creation
  const [includeProduct, setIncludeProduct] = useState(false)
  const [productForm, setProductForm] = useState({
    productId: '',
    purchasePrice: '',
    minimumOrderQuantity: '',
    supplierSku: '',
    notes: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [submitting, onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setError(t('nameRequired') || 'Supplier name is required')
      return
    }

    if (includeProduct && !isEditing) {
      if (!productForm.productId) {
        setError('Please select a catalog book to link')
        return
      }
      if (!productForm.purchasePrice || Number(productForm.purchasePrice) < 0) {
        setError('Valid purchase price (cost) is required')
        return
      }
    }

    setSubmitting(true)
    setError('')

    try {
      // Build clean payload adhering strictly to backend createSupplierSchema / updateSupplierSchema
      const payload = {
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim() || null,
        phone: formData.phone.trim() || null,
        whatsapp: formData.whatsapp.trim() || null,
        email: formData.email.trim() || null,
        city: formData.city.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
        isActive: Boolean(formData.isActive),
      }

      let createdSupplierId = supplier?.id

      if (isEditing) {
        await api.put(`/suppliers/${supplier.id}`, payload)
      } else {
        const res = await api.post('/suppliers', payload)
        const createdSupplier = res?.data || res
        createdSupplierId = createdSupplier?.id
      }

      // If initial product was specified on creation, link it immediately
      if (!isEditing && includeProduct && createdSupplierId && productForm.productId) {
        try {
          await api.post(`/suppliers/${createdSupplierId}/products`, {
            productId: Number(productForm.productId),
            purchasePrice: Number(productForm.purchasePrice),
            minimumOrderQuantity: productForm.minimumOrderQuantity
              ? Number(productForm.minimumOrderQuantity)
              : undefined,
            supplierSku: productForm.supplierSku.trim() || undefined,
            notes: productForm.notes.trim() || undefined,
            isActive: true,
          })
        } catch (prodErr) {
          // Supplier was created, but product linking failed - inform user
          console.warn('Initial product mapping notice:', prodErr)
        }
      }

      onSuccess()
    } catch (err) {
      setError(err.message || t('stockUpdateError') || 'Failed to save supplier')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        onClick={!submitting ? onClose : undefined}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Slide-Over Drawer Container */}
      <div className={`fixed inset-y-0 ${isRTL ? 'start-0' : 'end-0'} flex max-w-full z-50`}>
        <div
          className={`w-screen max-w-lg bg-[var(--card)] border-inline-start border-[var(--line)] shadow-2xl flex flex-col justify-between overflow-y-auto ${
            isRTL ? 'stock-drawer-rtl' : 'stock-drawer-ltr'
          }`}
        >
          {/* Drawer Header */}
          <div className="p-5 border-b border-[var(--line)] bg-[var(--card)] flex items-start justify-between gap-3 sticky top-0 z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--purple)]" />
                <h2 className="text-base font-bold text-[var(--ink)]">
                  {isEditing
                    ? t('supplierDrawerTitleEdit') || 'Edit Supplier'
                    : t('supplierDrawerTitleAdd') || 'Add New Supplier'}
                </h2>
              </div>
              <p className="text-xs text-[var(--ink-soft)] mt-0.5">
                {isEditing
                  ? t('supplierDrawerSubtitleEdit') || 'Update contact details, location, and account status'
                  : t('supplierDrawerSubtitleAdd') || 'Enter vendor info, phone, email, and negotiated catalog terms'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 rounded-lg border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <form id="supplier-drawer-form" onSubmit={handleSubmit} className="p-5 space-y-6 flex-1 overflow-y-auto">
            {error && <ErrorBanner message={error} />}

            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--purple)] uppercase tracking-wider">
                <Building2 className="h-3.5 w-3.5" />
                <span>{t('supplierSectionBasic') || 'Basic Information'}</span>
              </div>

              {/* Supplier Name (Required) */}
              <div>
                <label className="block text-xs font-medium text-[var(--ink)] mb-1.5">
                  {t('supplierName') || 'Supplier / Company Name'} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('supplierNamePlaceholder') || 'e.g. Moroccan Publishing House'}
                  className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]/40"
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-xs font-medium text-[var(--ink)] mb-1.5">
                  {t('supplierContactPerson') || 'Contact Person'}
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder={t('supplierContactPersonPlaceholder') || 'e.g. Abdellah El Alami'}
                  className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]/40"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)]/50">
                <div>
                  <div className="text-xs font-semibold text-[var(--ink)]">
                    {t('supplierStatus') || 'Supplier Active Status'}
                  </div>
                  <div className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                    {formData.isActive
                      ? t('supplierActiveDesc') || 'Supplier is enabled and available for purchases'
                      : t('supplierInactiveDesc') || 'Supplier is inactive and hidden from new orders'}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--purple)]" />
                </label>
              </div>
            </div>

            {/* Section 2: Contact Details & Location */}
            <div className="space-y-4 pt-2 border-t border-[var(--line)]">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--purple)] uppercase tracking-wider">
                <Phone className="h-3.5 w-3.5" />
                <span>{t('supplierSectionContact') || 'Contact & Location'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-[var(--ink)] mb-1.5">
                    {t('supplierPhone') || 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={t('supplierPhonePlaceholder') || '06XXXXXXXX'}
                    className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-xs font-medium text-[var(--ink)] mb-1.5 flex items-center gap-1">
                    <MessageCircle className="h-3 w-3 text-emerald-400" />
                    <span>{t('supplierWhatsapp') || 'WhatsApp'}</span>
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder={t('supplierWhatsappPlaceholder') || '06XXXXXXXX'}
                    className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-[var(--ink)] mb-1.5">
                    {t('supplierEmail') || 'Email Address'}
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t('supplierEmailPlaceholder') || 'supplier@example.com'}
                    className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-medium text-[var(--ink)] mb-1.5">
                    {t('supplierCity') || 'City'}
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder={t('supplierCityPlaceholder') || 'Casablanca, Rabat...'}
                    className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]"
                  />
                </div>
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-xs font-medium text-[var(--ink)] mb-1.5">
                  {t('supplierAddress') || 'Full Street Address'}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t('supplierAddressPlaceholder') || 'Street, District, Postal Code...'}
                  className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]"
                />
              </div>
            </div>

            {/* Section 3: Optional Initial Catalog Product Linking (Available on Creation) */}
            {!isEditing && (
              <div className="space-y-4 pt-2 border-t border-[var(--line)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--purple)] uppercase tracking-wider">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{t('supplierSectionCatalog') || 'Link Catalog Book (Optional)'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludeProduct(!includeProduct)}
                    className="text-xs text-[var(--purple)] font-semibold hover:underline cursor-pointer"
                  >
                    {includeProduct ? t('remove') || 'Remove' : `+ ${t('add') || 'Add'}`}
                  </button>
                </div>

                {includeProduct && (
                  <div className="p-4 rounded-xl border border-[var(--purple)]/30 bg-gradient-to-br from-[var(--bg)] to-[var(--purple)]/5 space-y-3.5 animate-fade-in">
                    <div className="text-xs text-[var(--ink-soft)]">
                      {t('supplierInitialProductPrompt') ||
                        'Associate a catalog title with negotiated purchase cost and supplier SKU immediately.'}
                    </div>

                    {/* Book Picker Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-[var(--ink)] mb-1">
                        {t('productLabel') || 'Select Catalog Title'} <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={productForm.productId}
                        onChange={(e) => setProductForm({ ...productForm, productId: e.target.value })}
                        className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--purple)]"
                      >
                        <option value="">-- {t('selectProductPlaceholder') || 'Select a product'} --</option>
                        {catalogProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} {p.sku ? `(SKU: ${p.sku})` : ''} - {t('currentStock') || 'Stock'}: {p.currentStock ?? 0}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cost and MOQ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[var(--ink)] mb-1">
                          {t('supplierProductPrice') || 'Purchase Price (MAD)'} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={productForm.purchasePrice}
                          onChange={(e) => setProductForm({ ...productForm, purchasePrice: e.target.value })}
                          placeholder="0.00"
                          className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--purple)]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[var(--ink)] mb-1">
                          {t('supplierMoq') || 'Min Order Qty (MOQ)'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={productForm.minimumOrderQuantity}
                          onChange={(e) => setProductForm({ ...productForm, minimumOrderQuantity: e.target.value })}
                          placeholder="1"
                          className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--purple)]"
                        />
                      </div>
                    </div>

                    {/* Supplier SKU */}
                    <div>
                      <label className="block text-xs font-medium text-[var(--ink)] mb-1">
                        {t('supplierSku') || 'Supplier Reference / SKU'}
                      </label>
                      <input
                        type="text"
                        value={productForm.supplierSku}
                        onChange={(e) => setProductForm({ ...productForm, supplierSku: e.target.value })}
                        placeholder="e.g. SUP-REF-992"
                        className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--purple)]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 4: Internal Notes */}
            <div className="space-y-3 pt-2 border-t border-[var(--line)]">
              <label className="block text-xs font-bold text-[var(--purple)] uppercase tracking-wider">
                {t('supplierNotes') || 'Internal Notes'}
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('supplierNotesPlaceholder') || 'Payment agreement details, delivery schedule, discount terms...'}
                className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-xs text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--purple)] focus:ring-1 focus:ring-[var(--purple)]/40 leading-relaxed"
              />
            </div>
          </form>

          {/* Drawer Footer */}
          <div className="p-5 border-t border-[var(--line)] bg-[var(--card)] flex items-center justify-end gap-3 sticky bottom-0 z-10">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="supplier-drawer-form"
              disabled={submitting}
              className="shadow-[0_0_14px_rgba(124,58,237,0.35)]"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin me-1.5" />
                  <span>{t('saving') || 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 me-1.5" />
                  <span>
                    {isEditing
                      ? t('saveChanges') || 'Save Changes'
                      : t('createSupplierBtn') || 'Create Supplier'}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
