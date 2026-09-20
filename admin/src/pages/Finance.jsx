import useFetch from '../lib/useFetch.js'
import { formatMoney, formatNumber, formatPercent } from '../lib/format.js'
import { PageHeader, Card, StatCard } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function Finance() {
  const { t, language } = useLanguage()
  const { data: overview, loading, error } = useFetch('/profit/overview')
  const { data: byProduct = [] } = useFetch('/profit/by-product')
  const { data: byPeriod = [] } = useFetch('/profit/by-period')

  if (error) {
    return (
      <div>
        <PageHeader title={t('financeTitle')} />
        <ErrorBanner message={error} />
      </div>
    )
  }
  if (loading || !overview) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t('calculatingFinance')} />
      </div>
    )
  }

  const profit = overview.profit

  const productCols = [
    { key: 'title', label: t('colBook'), render: (r) => <span className="font-semibold text-[var(--ink)]">{r.productTitle}</span> },
    { key: 'qty', label: t('unitsSold'), render: (r) => <span className="tabular-nums font-semibold text-[var(--ink)]">{formatNumber(r.quantity)}</span> },
    { key: 'revenue', label: t('revenueGenerated'), render: (r) => <span className="tabular-nums font-bold text-[var(--ink)]">{formatMoney(r.revenue, language)}</span> },
    { key: 'cost', label: t('totalCogs'), render: (r) => <span className="tabular-nums text-xs text-[var(--ink-soft)]">{formatMoney(r.cost, language)}</span> },
    {
      key: 'profit',
      label: t('profit'),
      render: (r) =>
        r.profit == null ? (
          <span className="text-xs text-[var(--ink-soft)]">—</span>
        ) : (
          <span className={`tabular-nums font-bold ${r.profit < 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>{formatMoney(r.profit, language)}</span>
        ),
    },
    { key: 'unitProfit', label: t('avgUnitProfit'), render: (r) => (r.unitProfit == null ? <span className="text-xs text-[var(--ink-soft)]">—</span> : <span className="tabular-nums text-xs text-[var(--ink)]">{formatMoney(r.unitProfit, language)}</span>) },
  ]

  const periodCols = [
    { key: 'period', label: t('periodCol'), render: (r) => <span dir="ltr" className="font-mono text-xs font-semibold text-[var(--purple)]">{r.period}</span> },
    { key: 'orders', label: t('statTotalOrders'), render: (r) => <span className="tabular-nums font-semibold text-[var(--ink)]">{formatNumber(r.orders)}</span> },
    { key: 'revenue', label: t('revenueGenerated'), render: (r) => <span className="tabular-nums font-bold text-[var(--ink)]">{formatMoney(r.revenue, language)}</span> },
    { key: 'cost', label: t('totalCogs'), render: (r) => <span className="tabular-nums text-xs text-[var(--ink-soft)]">{formatMoney(r.cost, language)}</span> },
    {
      key: 'profit',
      label: t('profit'),
      render: (r) =>
        r.profit == null ? (
          <span className="text-xs text-[var(--ink-soft)]">—</span>
        ) : (
          <span className={`tabular-nums font-bold ${r.profit < 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>{formatMoney(r.profit, language)}</span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('financeTitle')}
        subtitle={overview.profitAccurate ? t('financeSubtitleAccurate') : t('financeSubtitleEstimated')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('grossRevenue')} value={formatMoney(overview.revenue, language)} tone="brand" />
        <StatCard label={t('totalCogs')} value={formatMoney(overview.cost, language)} />
        <StatCard
          label={t('netProfit')}
          value={profit == null ? '—' : formatMoney(profit, language)}
          tone={profit == null ? 'default' : profit < 0 ? 'danger' : 'ok'}
          sub={!overview.profitAccurate ? t('costUnknownItems', { count: overview.costUnknownItems }) : ''}
        />
        <StatCard
          label={t('avgProfitMargin')}
          value={formatPercent(overview.profitMargin, language)}
          sub={t('reliableOrdersCount', { count: formatNumber(overview.ordersCount) })}
        />
      </div>

      <div className="mt-4">
        <StatCard label={t('collectedShipping')} value={formatMoney(overview.collectedShipping, language)} />
      </div>

      {!overview.profitAccurate ? (
        <div className="mt-4">
          <Badge kind="warn">{t('profitEstimatedWarning')}</Badge>
        </div>
      ) : null}

      <div className="mt-8 space-y-6">
        <div>
          <h2 className="mb-3 text-sm font-bold text-[var(--ink)]">{t('profitByProductTitle')}</h2>
          <Card padded={false}>
            <Table columns={productCols} rows={byProduct} rowKey={(r) => r.id || r.productId} empty={t('noSalesYet')} />
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold text-[var(--ink)]">{t('profitByPeriodTitle')}</h2>
          <Card padded={false}>
            <Table columns={periodCols} rows={byPeriod} rowKey={(r) => r.period} empty={t('noPeriodSales')} />
          </Card>
        </div>
      </div>
    </div>
  )
}
