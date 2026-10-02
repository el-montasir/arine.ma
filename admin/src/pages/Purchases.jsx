import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  Search,
  Plus,
  Building2,
  Calendar,
  DollarSign,
  Package,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  Eye,
  RotateCcw,
  Truck,
  CreditCard,
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

export default function Purchases() {
  const { t, language } = useLanguage()
  const { can, isOwner } = useAuth()
  const navigate = useNavigate()

  const canManage = isOwner || can('PURCHASES_MANAGE')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [supplierFilter, setSupplierFilter] = useState('ALL')

  const { data: responseData, loading, error, reload } = useFetch('/purchases?limit=200')
  const purchases = Array.isArray(responseData) ? responseData : responseData?.data || []

  // Fetch suppliers for filter dropdown
  const { data: suppliersData } = useFetch('/suppliers')
  const suppliers = Array.isArray(suppliersData) ? suppliersData : suppliersData?.data || []

  // Filtering
  const filteredPurchases = useMemo(() => {
    if (!Array.isArray(purchases)) return []

    return purchases.filter((p) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (p.purchaseNumber && p.purchaseNumber.toLowerCase().includes(q)) ||
        (p.supplier?.name && p.supplier.name.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
      const matchesSupplier = supplierFilter === 'ALL' || String(p.supplierId) === String(supplierFilter)

      return matchesSearch && matchesStatus && matchesSupplier
    })
  }, [purchases, search, statusFilter, supplierFilter])

  // Statistics calculation
  const stats = useMemo(() => {
    if (!Array.isArray(purchases)) {
      return { totalCount: 0, totalAmount: 0, pendingReceive: 0, totalPaid: 0 }
    }
    return purchases.reduce(
      (acc, p) => {
        acc.totalCount += 1
        acc.totalAmount += Number(p.grandTotal || 0)
        acc.totalPaid += Number(p.amountPaid || 0)
        if (p.status === 'ORDERED' || p.status === 'PARTIALLY_RECEIVED') {
          acc.pendingReceive += 1
        }
        return acc
      },
      { totalCount: 0, totalAmount: 0, pendingReceive: 0, totalPaid: 0 }
    )
  }, [purchases])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RECEIVED':
        return <Badge kind="ok">{t('purchaseStatusReceived') || 'Received'}</Badge>
      case 'PARTIALLY_RECEIVED':
        return <Badge kind="shipping">{t('purchaseStatusPartiallyReceived') || 'Partially Received'}</Badge>
      case 'ORDERED':
        return <Badge kind="pending">{t('purchaseStatusOrdered') || 'Ordered'}</Badge>
      case 'DRAFT':
        return <Badge kind="neutral">{t('purchaseStatusDraft') || 'Draft'}</Badge>
      case 'CANCELLED':
        return <Badge kind="neutral">{t('purchaseStatusCancelled') || 'Cancelled'}</Badge>
      default:
        return <Badge kind="neutral">{status}</Badge>
    }
  }

  const columns = [
    {
      key: 'purchaseNumber',
      label: t('purchaseNumber') || 'PO Number',
      render: (p) => (
        <div className="flex flex-col">
          <Link
            to={`/purchases/${p.id}`}
            className="font-bold text-[var(--purple)] hover:underline flex items-center gap-1.5 text-xs"
          >
            <FileText className="h-4 w-4 text-[var(--purple)] shrink-0" />
            <span>{p.purchaseNumber}</span>
          </Link>
          <span className="text-[11px] text-[var(--ink-soft)] mt-0.5">
            {formatDateTime(p.purchaseDate || p.createdAt, language)}
          </span>
        </div>
      ),
    },
    {
      key: 'supplier',
      label: t('supplierLabel') || 'Supplier',
      render: (p) => (
        <div className="flex flex-col">
          {p.supplier ? (
            <Link
              to={`/suppliers/${p.supplier.id}`}
              className="font-semibold text-[var(--ink)] hover:text-[var(--purple)] flex items-center gap-1 text-xs"
            >
              <Building2 className="h-3.5 w-3.5 text-[var(--ink-soft)] shrink-0" />
              <span>{p.supplier.name}</span>
            </Link>
          ) : (
            <span className="text-xs text-[var(--ink-soft)]">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'items',
      label: t('itemsLabel') || 'Items & Progress',
      render: (p) => {
        const totalOrdered = (p.items || []).reduce((sum, item) => sum + item.quantity, 0)
        const totalReceived = (p.items || []).reduce((sum, item) => sum + (item.quantityReceived || 0), 0)
        const pct = totalOrdered > 0 ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100)) : 0

        return (
          <div className="space-y-1 min-w-[120px]">
            <div className="flex items-center justify-between text-[11px] font-medium text-[var(--ink-soft)]">
              <span>
                {formatNumber(totalReceived)} / {formatNumber(totalOrdered)} {t('itemsLabel') || 'items'}
              </span>
              <span className="tabular-nums font-bold text-[var(--ink)]">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--bg)] overflow-hidden border border-[var(--line)]">
              <div
                className={`h-full transition-all ${
                  pct === 100 ? 'bg-[var(--green)]' : pct > 0 ? 'bg-[var(--purple)]' : 'bg-transparent'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      key: 'grandTotal',
      label: t('grandTotal') || 'Total Amount',
      render: (p) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[var(--ink)] tabular-nums">
            {formatMoney(p.grandTotal || 0, language)}
          </span>
          <span className="text-[11px] text-[var(--ink-soft)] tabular-nums mt-0.5">
            {t('paidLabel') || 'Paid'}: {formatMoney(p.amountPaid || 0, language)}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('purchaseStatus') || 'Status',
      render: (p) => getStatusBadge(p.status),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-end',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Link
            to={`/purchases/${p.id}`}
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
        title={t('purchasesTitle') || 'Purchase Orders'}
        subtitle={t('purchasesSubtitle') || 'Manage vendor procurement, goods receipt, and stock replenishment'}
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => navigate('/purchases/new')}>
              <Plus className="h-4 w-4" />
              {t('newPurchaseBtn') || 'New Purchase Order'}
            </Button>
          ) : null
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('totalPurchasesCount') || 'Total Purchase Orders'}
          value={formatNumber(stats.totalCount)}
          tone="default"
          icon={FileText}
        />
        <StatCard
          label={t('totalPurchasesValue') || 'Total Value'}
          value={formatMoney(stats.totalAmount, language)}
          tone="brand"
          icon={DollarSign}
        />
        <StatCard
          label={t('supplierTotalPaid') || 'Total Paid'}
          value={formatMoney(stats.totalPaid, language)}
          tone="ok"
          icon={CreditCard}
        />
        <StatCard
          label={t('pendingReceipts') || 'Pending Receipt'}
          value={formatNumber(stats.pendingReceive)}
          tone={stats.pendingReceive > 0 ? 'warning' : 'ok'}
          icon={Truck}
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
            placeholder={t('searchPurchasesPlaceholder') || 'Search by PO number, supplier, notes...'}
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
            <option value="DRAFT">{t('purchaseStatusDraft') || 'Draft'}</option>
            <option value="ORDERED">{t('purchaseStatusOrdered') || 'Ordered'}</option>
            <option value="PARTIALLY_RECEIVED">{t('purchaseStatusPartiallyReceived') || 'Partially Received'}</option>
            <option value="RECEIVED">{t('purchaseStatusReceived') || 'Received'}</option>
            <option value="CANCELLED">{t('purchaseStatusCancelled') || 'Cancelled'}</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padded={false}>
        <Table
          columns={columns}
          rows={filteredPurchases}
          rowKey={(p) => p.id}
          loading={loading}
          empty={t('noPurchasesFound') || 'No purchase orders found'}
        />
      </Card>
    </div>
  )
}
