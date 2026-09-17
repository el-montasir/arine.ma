import { useNavigate } from 'react-router-dom'
import useFetch from '../lib/useFetch.js'
import { formatMoney, formatNumber, formatDate, orderStatus } from '../lib/format.js'
import { Card, PageHeader, StatCard } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import { Badge } from '../components/ui/Badge.jsx'

export default function Dashboard() {
  const { data, loading, error } = useFetch('/dashboard')
  const navigate = useNavigate()

  if (error) {
    return (
      <div>
        <PageHeader title="نظرة عامة" />
        <ErrorBanner message={error} />
      </div>
    )
  }
  if (loading || !data) {
    return (
      <div>
        <PageHeader title="نظرة عامة" subtitle="جارِ تحميل البيانات…" />
      </div>
    )
  }

  const profit = data.profit
  const profitLabel = profit != null ? formatMoney(profit) : '—'
  const accurate = data.costUnknownItems === 0

  const ordersCols = [
    { key: 'orderNumber', label: 'رقم الطلب', render: (r) => <span dir="ltr" className="font-mono text-xs text-brand-400">{r.orderNumber}</span> },
    { key: 'customer', label: 'العميل', render: (r) => r.fullName },
    { key: 'total', label: 'الإجمالي', render: (r) => <span className="tabular-nums">{formatMoney(r.total)}</span> },
    { key: 'status', label: 'الحالة', render: (r) => <Badge kind={orderStatus(r.status).color}>{orderStatus(r.status).label}</Badge> },
    { key: 'created', label: 'التاريخ', render: (r) => <span className="text-xs text-[#8b80a8]">{formatDate(r.createdAt)}</span> },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">نظرة عامة</h1>
        <p className="mt-1 text-sm text-[#8b80a8]">لمحة عن أداء المتجر الآن</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الطلبات" value={formatNumber(data.orderCount)} />
        <StatCard label="قيد الانتظار" value={formatNumber(data.pendingOrders)} tone="warn" />
        <StatCard label="مؤكد" value={formatNumber(data.confirmedOrders)} tone="brand" />
        <StatCard label="تم التسليم" value={formatNumber(data.deliveredOrders)} tone="ok" />
        <StatCard label="قيد الشحن" value={formatNumber(data.shippingOrders)} tone="info" />
        <StatCard label="إجمالي المبيعات" value={formatMoney(data.totalSales)} tone="brand" />
        <StatCard
          label="الربح الإجمالي"
          value={profitLabel}
          tone={profit != null ? 'ok' : 'default'}
          sub={!accurate ? `يحتاج سعر شراء ${data.costUnknownItems} منتج${data.costUnknownItems === 1 ? '' : 'ات'} — تقديري` : data.profitMargin != null ? `هامش ${data.profitMargin}٪` : ''}
        />
        <StatCard label="الكتب / التصنيفات" value={`${formatNumber(data.productCount)} / ${formatNumber(data.categoryCount)}`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card padded={false} className="xl:col-span-2">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold text-white">أحدث الطلبات</h2>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-medium text-brand-400 hover:text-brand-300"
            >
              عرض الكل ←
            </button>
          </div>
          <Table columns={ordersCols} rows={data.recentOrders} rowKey={(r) => r.id} loading={loading} onRowClick={(r) => navigate(`/orders/${r.id}`)} empty="لا توجد طلبات بعد" />
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-white">النشاط الأخير</h2>
          <ul className="mt-4 space-y-1">
            {data.recentActivity.map((a, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-line-soft/50 py-2.5 last:border-0">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-[#d9d1e9]">{a.label}</p>
                  <p className="text-[11px] text-[#6f6488]">{formatDate(a.createdAt)}</p>
                </div>
              </li>
            ))}
            {data.recentActivity.length === 0 ? <p className="text-sm text-[#8b80a8]">لا يوجد نشاط بعد</p> : null}
          </ul>
        </Card>
      </div>
    </div>
  )
}