import { useNavigate } from 'react-router-dom'
import useFetch from '../lib/useFetch.js'
import { formatMoney, formatNumber, formatDate, getOrderStatus, formatPercent } from '../lib/format.js'
import { Card, PageHeader, StatCard } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function Dashboard() {
  const { data, loading, error } = useFetch('/dashboard')
  const { t, language, isRTL } = useLanguage()
  const navigate = useNavigate()

  if (error) {
    return (
      <div>
        <PageHeader title={t('navDashboard')} />
        <ErrorBanner message={error} />
      </div>
    )
  }
  if (loading || !data) {
    return (
      <div>
        <PageHeader title={t('navDashboard')} subtitle={t('loading')} />
      </div>
    )
  }

  const profit = data.profit
  const profitLabel = profit != null ? formatMoney(profit, language) : '—'
  const accurate = data.costUnknownItems === 0

  const ordersCols = [
    {
      key: 'orderNumber',
      label: t('orderNumber'),
      render: (r) => <span dir="ltr" className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">{r.orderNumber}</span>,
    },
    {
      key: 'customer',
      label: t('customer'),
      render: (r) => <span className="font-medium text-text-main">{r.fullName}</span>,
    },
    {
      key: 'total',
      label: t('total'),
      render: (r) => <span className="tabular-nums font-semibold text-text-main">{formatMoney(r.total, language)}</span>,
    },
    {
      key: 'status',
      label: t('status'),
      render: (r) => {
        const s = getOrderStatus(r.status, t)
        return <Badge kind={s.color}>{s.label}</Badge>
      },
    },
    {
      key: 'created',
      label: t('date'),
      render: (r) => <span className="text-xs text-text-muted">{formatDate(r.createdAt, language)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-main">{t('dashboardTitle')}</h1>
        <p className="mt-1 text-xs text-text-muted">{t('dashboardSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('totalOrders')} value={formatNumber(data.orderCount)} />
        <StatCard label={t('statusPending')} value={formatNumber(data.pendingOrders)} tone="warn" />
        <StatCard label={t('statusConfirmed')} value={formatNumber(data.confirmedOrders)} tone="brand" />
        <StatCard label={t('statusDelivered')} value={formatNumber(data.deliveredOrders)} tone="ok" />
        <StatCard label={t('statusShipping')} value={formatNumber(data.shippingOrders)} tone="info" />
        <StatCard label={t('totalRevenue')} value={formatMoney(data.totalSales, language)} tone="brand" />
        <StatCard
          label={t('grossProfit')}
          value={profitLabel}
          tone={profit != null ? 'ok' : 'default'}
          sub={
            !accurate
              ? `${data.costUnknownItems} ${t('missingCost')}`
              : data.profitMargin != null
              ? `${t('profitMargin')}: ${formatPercent(data.profitMargin, language)}`
              : ''
          }
        />
        <StatCard
          label={`${t('booksCount')} / ${t('categoriesCount')}`}
          value={`${formatNumber(data.productCount)} / ${formatNumber(data.categoryCount)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card padded={false} className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold text-text-main">{t('recentOrders')}</h2>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
            >
              {t('viewAll')} {isRTL ? '←' : '→'}
            </button>
          </div>
          <Table
            columns={ordersCols}
            rows={data.recentOrders}
            rowKey={(r) => r.id}
            loading={loading}
            onRowClick={(r) => navigate(`/orders/${r.id}`)}
            empty={t('noOrders')}
          />
        </Card>

        <Card>
          <h2 className="text-sm font-bold text-text-main">{t('recentActivity')}</h2>
          <ul className="mt-4 space-y-1">
            {data.recentActivity.map((a, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-line/60 py-2.5 last:border-0">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-text-main">{a.label}</p>
                  <p className="text-[11px] text-text-subtle mt-0.5">{formatDate(a.createdAt, language)}</p>
                </div>
              </li>
            ))}
            {data.recentActivity.length === 0 ? <p className="text-xs text-text-muted">{t('noActivity')}</p> : null}
          </ul>
        </Card>
      </div>
    </div>
  )
}
