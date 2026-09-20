import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { api } from '../lib/api.js'
import { formatMoney, formatDate, getPaymentLabel, getOrderStatus } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'
import Modal from '../components/ui/Modal.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Orders() {
  const navigate = useNavigate()
  const { t, language, isRTL } = useLanguage()
  const { can, isOwner } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')

  // Delete modal state
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight

  const STATUS_FILTERS = [
    { value: '', label: t('filterAll') },
    { value: 'PENDING', label: t('statusPending') },
    { value: 'CONFIRMED', label: t('statusConfirmed') },
    { value: 'SHIPPING', label: t('statusShipping') },
    { value: 'DELIVERED', label: t('statusDelivered') },
    { value: 'CANCELLED', label: t('statusCancelled') },
  ]

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (query) params.set('search', query)
      if (status) params.set('status', status)
      const qs = params.toString()
      const json = await api.get(`/orders${qs ? `?${qs}` : ''}`)
      setRows(json.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status])

  async function handleConfirmDelete() {
    if (!orderToDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.del(`/orders/${orderToDelete.id}`)
      setActionSuccess(`${t('deleteOrderSuccess')} (${orderToDelete.orderNumber})`)
      setOrderToDelete(null)
      load()
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    {
      key: 'orderNumber',
      label: t('orderNumber'),
      render: (r) => <span dir="ltr" className="font-mono text-xs font-bold text-[var(--purple)]">{r.orderNumber}</span>,
    },
    {
      key: 'customer',
      label: t('customerName'),
      render: (r) => (
        <div>
          <p className="font-semibold text-[var(--ink)]">{r.fullName}</p>
          <p className="text-xs text-[var(--ink-soft)]">{r.phone}</p>
        </div>
      ),
    },
    { key: 'city', label: t('customerCity'), render: (r) => <span className="text-xs text-[var(--ink)]">{r.city}</span> },
    { key: 'total', label: t('orderTotal'), render: (r) => <span className="tabular-nums font-bold text-[var(--ink)]">{formatMoney(r.total, language)}</span> },
    { key: 'payment', label: t('paymentMethodLabel'), render: (r) => <span className="text-xs text-[var(--ink-soft)]">{getPaymentLabel(r.paymentMethod, t)}</span> },
    {
      key: 'status',
      label: t('orderStatus'),
      render: (r) => {
        const meta = getOrderStatus(r.status, t)
        return <Badge kind={meta.color}>{meta.label}</Badge>
      },
    },
    { key: 'created', label: t('orderDate'), render: (r) => <span className="text-xs text-[var(--ink-soft)]">{formatDate(r.createdAt, language)}</span> },
    {
      key: 'actions',
      label: '',
      render: (r) => {
        const canDelete = can('ORDERS_DELETE') || isOwner
        return (
          <div className="flex items-center justify-end gap-1.5">
            {canDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteError('')
                  setOrderToDelete(r)
                }}
                title={t('deleteOrderTitle')}
                aria-label={t('deleteOrderTitle')}
                className="rounded-[8px] p-1.5 text-[var(--ink-soft)] hover:bg-[var(--red-bg)] hover:text-[var(--red)] transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <ArrowIcon className="h-4 w-4 text-[var(--ink-soft)]" aria-hidden="true" />
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('ordersTitle')}
        subtitle={t('ordersCountSubtitle', { count: rows.length })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-[var(--ink-soft)]" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setQuery(search.trim())
                }}
                placeholder={t('searchOrdersPlaceholder')}
                aria-label={t('search')}
                className="w-64 rounded-[10px] border border-[var(--line)] bg-[var(--card)] py-2 pe-3 ps-9 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--purple)] focus:outline-none"
              />
            </div>
            <Button variant="secondary" size="md" onClick={() => setQuery(search.trim())}>
              {t('search')}
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            onClick={() => setStatus(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              status === f.value
                ? 'bg-[var(--purple)] text-white shadow-sm'
                : 'border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {actionSuccess && (
        <div className="mb-4 flex items-center justify-between rounded-[10px] border border-[var(--green)]/30 bg-[var(--green-bg)] p-3 text-xs font-semibold text-[var(--green)]">
          <span>✓ {actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess('')} className="text-[var(--green)] hover:underline cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {error ? <ErrorBanner message={error} /> : null}
      <Card padded={false}>
        <Table
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          empty={t('noOrdersMatch')}
          onRowClick={(r) => navigate(`/orders/${r.id}`)}
        />
      </Card>

      {/* Delete Order Confirmation Modal */}
      <Modal
        open={Boolean(orderToDelete)}
        onClose={() => !deleting && setOrderToDelete(null)}
        title={t('deleteOrderTitle')}
      >
        <div className="space-y-3">
          <p className="text-xs text-[var(--ink)]">
            {t('deleteOrderConfirm')}
          </p>
          <div className="rounded-[8px] border border-[var(--line)] bg-[var(--bg)] p-3 text-xs">
            <div className="text-[var(--ink-soft)] font-mono">
              {t('orderNumber')}: <strong className="text-[var(--purple)] font-bold">{orderToDelete?.orderNumber}</strong>
            </div>
            <div className="text-[var(--ink-soft)] mt-1.5">
              {t('customerName')}: <strong className="text-[var(--ink)] font-semibold">{orderToDelete?.fullName}</strong> ({orderToDelete?.phone})
            </div>
            <div className="text-[var(--ink-soft)] mt-1">
              {t('orderTotal')}: <strong className="text-[var(--ink)] tabular-nums font-bold">{orderToDelete && formatMoney(orderToDelete.total, language)}</strong>
            </div>
          </div>
          <p className="text-xs text-[var(--red)] font-medium">
            {t('deleteOrderWarning')}
          </p>
          {deleteError ? <ErrorBanner message={deleteError} onDismiss={() => setDeleteError('')} /> : null}
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--line)] pt-3">
          <Button variant="secondary" onClick={() => setOrderToDelete(null)} disabled={deleting}>
            {t('cancel')}
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={deleting}>
            {deleting ? t('deletingOrder') : t('delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
