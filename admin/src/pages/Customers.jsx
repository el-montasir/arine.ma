import useFetch from '../lib/useFetch.js'
import { formatMoney, formatNumber, formatDateShort } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'

export default function Customers() {
  const { data: customers, loading, error } = useFetch('/customers')

  const columns = [
    { key: 'name', label: 'الاسم', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'phone', label: 'الهاتف', render: (r) => <span dir="ltr">{r.phone}</span> },
    { key: 'city', label: 'المدينة', render: (r) => r.city },
    { key: 'orderCount', label: 'عدد الطلبات', render: (r) => <span className="tabular-nums">{formatNumber(r.orderCount)}</span> },
    { key: 'totalSpent', label: 'إجمالي الإنفاق', render: (r) => <span className="tabular-nums">{formatMoney(r.totalSpent)}</span> },
    { key: 'lastOrder', label: 'آخر طلب', render: (r) => <span className="text-xs text-[#8b80a8]">{formatDateShort(r.lastOrderAt)}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="العملاء"
        subtitle="مشتق من الطلبات الفعلية — لا تظهر بيانات العملاء في واجهات المتجر العامة"
      />
      {error ? <ErrorBanner message={error} /> : null}
      <Card padded={false}>
        <Table
          columns={columns}
          rows={customers || []}
          rowKey={(r) => r.phone}
          loading={loading}
          empty="لا يوجد عملاء بعد"
        />
      </Card>
    </div>
  )
}