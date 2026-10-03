import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  RotateCcw,
  Search,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  CheckCircle2,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { formatMoney, formatDateTime, formatNumber } from '../lib/format.js'
import { PageHeader, Card, StatCard } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function PurchaseReturns() {
  const { t, language } = useLanguage()
  const { can, isOwner } = useAuth()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [supplierFilter, setSupplierFilter] = useState('ALL')

  const { data: responseData, loading, error, reload } = useFetch('/purchase-returns?limit=200')
  const returns = Array.isArray(responseData) ? responseData : responseData?.data || []

  const { data: suppliersData } = useFetch('/suppliers?limit=100')
  const suppliers = Array.isArray(suppliersData)
    ? suppliersData
    : suppliersData?.items || suppliersData?.data || []

  // Filtered returns
  const filteredReturns = useMemo(() => {
    if (!Array.isArray(returns)) return []

    return returns.filter((r) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (r.returnNumber && r.returnNumber.toLowerCase().includes(q)) ||
        (r.supplier?.name && r.supplier.name.toLowerCase().includes(q)) ||
        (r.purchase?.purchaseNumber && r.purchase.purchaseNumber.toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q))

      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter
      const matchesSupplier = supplierFilter === 'ALL' || String(r.supplierId) === String(supplierFilter)

      return matchesSearch && matchesStatus && matchesSupplier
    })
  }, [returns, search, statusFilter, supplierFilter])

  // Stats calculation
  const stats = useMemo(() => {
    if (!Array.isArray(returns)) {
      return { totalCount: 0, totalAmount: 0, confirmedCount: 0, draftCount: 0 }
    }
    return returns.reduce(
      (acc, r) => {
        const amt = Number(r.totalAmount || 0)
        acc.totalCount += 1
        acc.totalAmount += amt
        if (r.status === 'CONFIRMED') acc.confirmedCount += 1
        if (r.status === 'DRAFT') acc.draftCount += 1
        return acc
      },
      { totalCount: 0, totalAmount: 0, confirmedCount: 0, draftCount: 0 }
    )
  }, [returns])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge kind="ok">{t('returnStatusConfirmed') || 'Confirmed'}</Badge>
      case 'DRAFT':
        return <Badge kind="neutral">{t('returnStatusDraft') || 'Draft'}</Badge>
      case 'CANCELLED':
        return <Badge kind="neutral">{t('returnStatusCancelled') || 'Cancelled'}</Badge>
      default:
        return <Badge kind="neutral">{status}</Badge>
    }
  }

  const columns = [
    {
      key: 'returnNumber',
      label: t('returnNumber') || 'Return #',
      render: (r) => (
        <div className="flex flex-col">
          <Link
            to={`/purchase-returns/${r.id}`}
            className="font-bold text-[var(--purple)] hover:underline flex items-center gap-1.5 text-xs"
          >
            <RotateCcw className="h-4 w-4 text-[var(--purple)] shrink-0" />
            <span>{r.returnNumber}</span>
          </Link>
          <span className="text-[11px] text-[var(--ink-soft)] mt-0.5">
            {formatDateTime(r.returnDate || r.createdAt, language)}
          </span>
        </div>
      ),
    },
    {
      key: 'supplier',
      label: t('supplierLabel') || 'Supplier',
      render: (r) => (
        <div className="flex flex-col">
          {r.supplier ? (
            <Link
              to={`/suppliers/${r.supplier.id}`}
              className="font-semibold text-xs text-[var(--ink)] hover:text-[var(--purple)] flex items-center gap-1"
            >
              <Building2 className="h-3.5 w-3.5 text-[var(--ink-soft)] shrink-0" />
              <span>{r.supplier.name}</span>
            </Link>
          ) : (
            <span className="text-xs text-[var(--ink-soft)]">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'purchase',
      label: t('purchaseNumber') || 'Linked PO',
      render: (r) => (
        <div>
          {r.purchase ? (
            <Link
              to={`/purchases/${r.purchase.id}`}
              className="font-semibold text-xs text-[var(--purple)] hover:underline flex items-center gap-1"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>{r.purchase.purchaseNumber}</span>
            </Link>
          ) : (
            <span className="text-xs text-[var(--ink-soft)]">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'reason',
      label: t('returnReason') || 'Reason',
      render: (r) => (
        <span className="text-xs text-[var(--ink)]">
          {r.reason === 'DAMAGED'
            ? t('returnReasonDamaged') || 'Damaged / Defective'
            : r.reason === 'WRONG_ITEM'
            ? t('returnReasonWrongItem') || 'Wrong Item Received'
            : r.reason === 'EXCESS_STOCK'
            ? t('returnReasonExcessStock') || 'Excess Stock'
            : r.reason || '—'}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: t('totalAmount') || 'Credit Value',
      render: (r) => (
        <span className="text-xs font-bold text-[var(--ink)] tabular-nums">
          {formatMoney(r.totalAmount || 0, language)}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('supplierStatus') || 'Status',
      render: (r) => getStatusBadge(r.status),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-end',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Link
            to={`/purchase-returns/${r.id}`}
            className="p-1.5 rounded-[8px] border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--purple)] hover:bg-[var(--bg)] transition-colors"
            title={t('viewDetails') || 'View Details'}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('purchaseReturnsTitle') || 'Purchase Returns'}
        subtitle={t('purchaseReturnsSubtitle') || 'Manage goods returned to suppliers, credit adjustments, and stock write-downs'}
      />

      {error ? <ErrorBanner message={error} /> : null}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('totalReturnsCount') || 'Total Returns'}
          value={formatNumber(stats.totalCount)}
          tone="default"
          icon={RotateCcw}
        />
        <StatCard
          label={t('totalReturnsValue') || 'Total Return Value'}
          value={formatMoney(stats.totalAmount, language)}
          tone="brand"
          icon={DollarSign}
        />
        <StatCard
          label={t('confirmedReturns') || 'Confirmed Returns'}
          value={formatNumber(stats.confirmedCount)}
          tone="ok"
          icon={CheckCircle2}
        />
        <StatCard
          label={t('draftReturns') || 'Draft Returns'}
          value={formatNumber(stats.draftCount)}
          tone={stats.draftCount > 0 ? 'warning' : 'ok'}
          icon={AlertTriangle}
        />
      </div>

      {/* Filter Bar */}
      <Card className="flex flex-wrap items-center justify-between gap-3" padded>
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-soft)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchReturnsPlaceholder') || 'Search return #, supplier, PO #, reason...'}
            className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] ps-9 pe-3.5 py-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--purple)] focus:outline-none focus:ring-1 focus:ring-[var(--purple)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Supplier filter */}
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
          >
            <option value="ALL">{t('filterAllSuppliers') || 'All Suppliers'}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
          >
            <option value="ALL">{t('filterAllStatus') || 'All Statuses'}</option>
            <option value="CONFIRMED">{t('returnStatusConfirmed') || 'Confirmed'}</option>
            <option value="DRAFT">{t('returnStatusDraft') || 'Draft'}</option>
            <option value="CANCELLED">{t('returnStatusCancelled') || 'Cancelled'}</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padded={false}>
        <Table
          columns={columns}
          rows={filteredReturns}
          rowKey={(r) => r.id}
          loading={loading}
          empty={t('noReturnsFound') || 'No purchase returns found'}
        />
      </Card>
    </div>
  )
}
