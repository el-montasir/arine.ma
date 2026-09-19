import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../lib/api.js'
import { formatMoney, formatDate, getPaymentLabel, getOrderStatus } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function Orders() {
  const navigate = useNavigate()
  const { t, language, isRTL } = useLanguage()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')

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

  const columns = [
    {
      key: 'orderNumber',
      label: t('orderNumber'),
      render: (r) => <span dir="ltr" className="font-mono text-xs text-brand-400">{r.orderNumber}</span>,
    },
    {
      key: 'customer',
      label: t('customerName'),
      render: (r) => (
        <div>
          <p className="font-medium">{r.fullName}</p>
          <p className="text-xs text-[#8b80a8]">{r.phone}</p>
        </div>
      ),
    },
    { key: 'city', label: t('customerCity'), render: (r) => <span className="text-sm">{r.city}</span> },
    { key: 'total', label: t('orderTotal'), render: (r) => <span className="tabular-nums font-semibold">{formatMoney(r.total, language)}</span> },
    { key: 'payment', label: t('paymentMethodLabel'), render: (r) => <span className="text-xs text-[#a79cc4]">{getPaymentLabel(r.paymentMethod, t)}</span> },
    {
      key: 'status',
      label: t('orderStatus'),
      render: (r) => {
        const meta = getOrderStatus(r.status, t)
        return <Badge kind={meta.color}>{meta.label}</Badge>
      },
    },
    { key: 'created', label: t('orderDate'), render: (r) => <span className="text-xs text-[#8b80a8]">{formatDate(r.createdAt, language)}</span> },
    { key: 'go', label: '', render: () => <ArrowIcon className="h-4 w-4 text-[#6f6488]" aria-hidden="true" /> },
  ]

  return (
    <div>
      <PageHeader
        title={t('ordersTitle')}
        subtitle={t('ordersCountSubtitle', { count: rows.length })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-gray-400 dark:text-[#6f6488]" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setQuery(search.trim())
                }}
                placeholder={t('searchOrdersPlaceholder')}
                aria-label={t('search')}
                className="w-64 rounded-lg border border-line bg-white dark:bg-ink-900 py-2 pe-3 ps-9 text-sm text-gray-900 dark:text-[#f2eefb] placeholder:text-gray-400 dark:placeholder:text-[#6f6488] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
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
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              status === f.value
                ? 'bg-brand-600 text-white'
                : 'border border-line bg-surface-800 text-[#a79cc4] hover:bg-surface-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

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
    </div>
  )
}
