import useFetch from '../lib/useFetch.js'
import { formatMoney, formatNumber, formatDateShort } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function Customers() {
  const { t, language } = useLanguage()
  const { data: customers, loading, error } = useFetch('/customers')

  const columns = [
    { key: 'name', label: t('customerNameLabel'), render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'phone', label: t('customerPhoneLabel'), render: (r) => <span dir="ltr">{r.phone}</span> },
    { key: 'city', label: t('customerCityCol'), render: (r) => r.city },
    { key: 'orderCount', label: t('ordersPlaced'), render: (r) => <span className="tabular-nums">{formatNumber(r.orderCount)}</span> },
    { key: 'totalSpent', label: t('totalSpent'), render: (r) => <span className="tabular-nums">{formatMoney(r.totalSpent, language)}</span> },
    { key: 'lastOrder', label: t('lastOrderDate'), render: (r) => <span className="text-xs text-[#8b80a8]">{formatDateShort(r.lastOrderAt, language)}</span> },
  ]

  return (
    <div>
      <PageHeader
        title={t('customersTitle')}
        subtitle={t('customersSubtitle')}
      />
      {error ? <ErrorBanner message={error} /> : null}
      <Card padded={false}>
        <Table
          columns={columns}
          rows={customers || []}
          rowKey={(r) => r.phone}
          loading={loading}
          empty={t('noCustomersYet')}
        />
      </Card>
    </div>
  )
}
