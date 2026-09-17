import useFetch from '../lib/useFetch.js'
import { formatMoney, formatNumber, formatPercent } from '../lib/format.js'
import { PageHeader, Card, StatCard } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Spinner from '../components/ui/Spinner.jsx'

export default function Finance() {
  const { data: overview, loading, error } = useFetch('/profit/overview')
  const { data: byProduct = [] } = useFetch('/profit/by-product')
  const { data: byPeriod = [] } = useFetch('/profit/by-period')

  if (error) {
    return (
      <div>
        <PageHeader title="المالية والأرباح" />
        <ErrorBanner message={error} />
      </div>
    )
  }
  if (loading || !overview) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="جارِ احتسب…" />
      </div>
    )
  }

  const profit = overview.profit

  const productCols = [
    { key: 'title', label: 'الكتاب', render: (r) => <span className="font-medium">{r.productTitle}</span> },
    { key: 'qty', label: 'الكمية المباعة', render: (r) => <span className="tabular-nums">{formatNumber(r.quantity)}</span> },
    { key: 'revenue', label: 'الإيراد', render: (r) => <span className="tabular-nums">{formatMoney(r.revenue)}</span> },
    { key: 'cost', label: 'التكلفة', render: (r) => <span className="tabular-nums">{formatMoney(r.cost)}</span> },
    {
      key: 'profit',
      label: 'الربح',
      render: (r) =>
        r.profit == null ? (
          <span className="text-xs text-[#8b80a8]">—</span>
        ) : (
          <span className={`tabular-nums ${r.profit < 0 ? 'text-danger-400' : 'text-ok-400'}`}>{formatMoney(r.profit)}</span>
        ),
    },
    { key: 'unitProfit', label: 'متوسط ربح الوحدة', render: (r) => (r.unitProfit == null ? <span className="text-xs text-[#8b80a8]">—</span> : <span className="tabular-nums">{formatMoney(r.unitProfit)}</span>) },
  ]

  const periodCols = [
    { key: 'period', label: 'الفترة', render: (r) => <span dir="ltr" className="font-mono text-xs">{r.period}</span> },
    { key: 'orders', label: 'الطلبات', render: (r) => <span className="tabular-nums">{formatNumber(r.orders)}</span> },
    { key: 'revenue', label: 'الإيراد', render: (r) => <span className="tabular-nums">{formatMoney(r.revenue)}</span> },
    { key: 'cost', label: 'التكلفة', render: (r) => <span className="tabular-nums">{formatMoney(r.cost)}</span> },
    {
      key: 'profit',
      label: 'الربح',
      render: (r) =>
        r.profit == null ? (
          <span className="text-xs text-[#8b80a8]">—</span>
        ) : (
          <span className={`tabular-nums ${r.profit < 0 ? 'text-danger-400' : 'text-ok-400'}`}>{formatMoney(r.profit)}</span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="المالية والأرباح"
        subtitle={overview.profitAccurate ? 'بناءً على سجلات التكلفة الفعلية محفوظة وقت كل طلب' : 'الربح تقديري — بعض المنتجات لا تحمل سعر شراء'}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إيراد البضاعة" value={formatMoney(overview.revenue)} tone="brand" />
        <StatCard label="تكلفة الشراء" value={formatMoney(overview.cost)} />
        <StatCard
          label="الربح الإجمالي"
          value={profit == null ? '—' : formatMoney(profit)}
          tone={profit == null ? 'default' : profit < 0 ? 'danger' : 'ok'}
          sub={!overview.profitAccurate ? `سعر شراء ${overview.costUnknownItems} منتج غير مسجّل` : ''}
        />
        <StatCard
          label="هامش الربح"
          value={formatPercent(overview.profitMargin)}
          sub={`${formatNumber(overview.ordersCount)} طلب موثوق`}
        />
      </div>

      <div className="mt-5">
        <StatCard label="الشحن المحصّل" value={formatMoney(overview.collectedShipping)} />
      </div>

      {!overview.profitAccurate ? (
        <div className="mt-4">
          <Badge kind="warn">الربح تقديري — بعض المنتجات بدون سعر شراء</Badge>
        </div>
      ) : null}

      <div className="mt-8 space-y-6">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-white">الربح حسب المنتج</h2>
          <Card padded={false}>
            <Table columns={productCols} rows={byProduct} rowKey={(r) => r.productId} empty="لا توجد مبيعات بعد" />
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-white">الربح حسب الفترة</h2>
          <Card padded={false}>
            <Table columns={periodCols} rows={byPeriod} rowKey={(r) => r.period} empty="لا توجد مبيعات في هذه الفترات" />
          </Card>
        </div>
      </div>
    </div>
  )
}