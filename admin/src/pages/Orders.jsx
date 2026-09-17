import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft } from 'lucide-react'
import { api } from '../lib/api.js'
import { formatMoney, formatDate, PAYMENT_LABEL, orderStatus } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'

const STATUS_FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'PENDING', label: 'قيد الانتظار' },
  { value: 'CONFIRMED', label: 'مؤكد' },
  { value: 'SHIPPING', label: 'قيد الشحن' },
  { value: 'DELIVERED', label: 'تم التسليم' },
  { value: 'CANCELLED', label: 'ملغي' },
]

export default function Orders() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')

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
    { key: 'orderNumber', label: 'رقم الطلب', render: (r) => <span dir="ltr" className="font-mono text-xs text-brand-400">{r.orderNumber}</span> },
    { key: 'customer', label: 'العميل', render: (r) => (
      <div>
        <p className="font-medium">{r.fullName}</p>
        <p className="text-xs text-[#8b80a8]">{r.phone}</p>
      </div>
    ) },
    { key: 'city', label: 'المدينة', render: (r) => <span className="text-sm">{r.city}</span> },
    { key: 'total', label: 'الإجمالي', render: (r) => <span className="tabular-nums">{formatMoney(r.total)}</span> },
    { key: 'payment', label: 'الدفع', render: (r) => <span className="text-xs text-[#a79cc4]">{PAYMENT_LABEL[r.paymentMethod] || r.paymentMethod}</span> },
    { key: 'status', label: 'الحالة', render: (r) => <Badge kind={orderStatus(r.status).color}>{orderStatus(r.status).label}</Badge> },
    { key: 'created', label: 'التاريخ', render: (r) => <span className="text-xs text-[#8b80a8]">{formatDate(r.createdAt)}</span> },
    { key: 'go', label: '', render: () => <ChevronLeft className="h-4 w-4 text-[#6f6488]" aria-hidden="true" /> },
  ]

  return (
    <div>
      <PageHeader
        title="الطلبات"
        subtitle={`${rows.length} طلب`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-[#6f6488]" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setQuery(search.trim())
                }}
                placeholder="بحث برقم الطلب، الاسم، الهاتف…"
                aria-label="بحث في الطلبات"
                className="w-64 rounded-lg border border-line bg-ink-900 py-2 pe-3 ps-9 text-sm text-[#f2eefb] placeholder:text-[#6f6488] focus:border-brand-500 focus:outline-none"
              />
            </div>
            <Button variant="secondary" size="md" onClick={() => setQuery(search.trim())}>بحث</Button>
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
          empty="لا توجد طلبات مطابقة"
          onRowClick={(r) => navigate(`/orders/${r.id}`)}
        />
      </Card>
    </div>
  )
}