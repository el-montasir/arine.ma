import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Target,
  Compass,
  Layers,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Tag,
  Link2,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { formatMoney, formatNumber, formatDate } from '../lib/format.js'
import { PageHeader, Card, StatCard } from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Table from '../components/ui/Table.jsx'
import { Badge, StatusBadge } from '../components/ui/Badge.jsx'
import { Input, Select } from '../components/ui/Input.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function MarketingAttribution() {
  const { t, language } = useLanguage()

  const [tab, setTab] = useState('sources') // 'sources' | 'campaigns' | 'orders'
  const [overview, setOverview] = useState(null)
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [sourceFilter, setSourceFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const fetchAttribution = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'sources' || tab === 'campaigns') {
        const res = await api.get(`/marketing/attribution/overview?source=${sourceFilter}`)
        setOverview(res.data || null)
      } else if (tab === 'orders') {
        const query = new URLSearchParams({
          page: String(pagination.page),
          limit: String(pagination.limit),
          source: sourceFilter,
        })
        const res = await api.get(`/marketing/attribution/orders?${query}`)
        setOrders(res.data || [])
        if (res.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: res.pagination.total,
            totalPages: res.pagination.totalPages,
          }))
        }
      }
    } catch (err) {
      setError(err.message || t('failedToLoadData') || 'Failed to load attribution data')
    } finally {
      setLoading(false)
    }
  }, [tab, pagination.page, pagination.limit, sourceFilter, t])

  useEffect(() => {
    fetchAttribution()
  }, [fetchAttribution])

  const totals = overview?.totals || {}
  const sourcesBreakdown = overview?.bySource || []
  const campaignsBreakdown = overview?.byCampaign || []

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('attributionTitle') || 'Marketing Attribution & Acquisition Analytics'}
        subtitle={t('attributionSubtitle') || 'Track customer journey, acquisition channels, UTM tags, and attribute actual orders'}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchAttribution}
            disabled={loading}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t('refresh') || 'Refresh'}</span>
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('statAttributedRevenue') || 'Attributed Revenue'}
          value={formatMoney(totals.attributedRevenue || 0, language)}
          sub={`${t('statSpend') || 'Spend'}: ${formatMoney(totals.spend || 0, language)}`}
          tone="ok"
          icon={TrendingUp}
        />
        <StatCard
          label={t('statAttributedOrders') || 'Attributed Orders'}
          value={formatNumber(totals.attributedOrders || 0)}
          sub={`${totals.ordersPercentage || 0}% of all store orders`}
          tone="brand"
          icon={ShoppingBag}
        />
        <StatCard
          label={t('statRoas') || 'Blended ROAS'}
          value={totals.blendedRoas > 0 ? `${totals.blendedRoas}x` : '—'}
          sub="Attributed Revenue / Meta Spend"
          tone="brand"
          icon={Target}
        />
        <StatCard
          label={t('statCpa') || 'Blended CPA'}
          value={totals.blendedCpa > 0 ? formatMoney(totals.blendedCpa, language) : '—'}
          sub="Cost Per Attributed Order"
          tone="info"
          icon={DollarSign}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--line)] gap-2">
        {[
          { id: 'sources', label: t('tabSources') || 'Channels & Sources', icon: Compass },
          { id: 'campaigns', label: t('tabCampaignsAttr') || 'Campaigns', icon: Layers },
          { id: 'orders', label: t('tabOrdersAttr') || 'Orders & Attribution', icon: ShoppingBag },
        ].map((tItem) => {
          const Icon = tItem.icon
          const isActive = tab === tItem.id
          return (
            <button
              key={tItem.id}
              type="button"
              onClick={() => {
                setTab(tItem.id)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-[var(--purple)] text-[var(--purple)]'
                  : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tItem.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB 1: SOURCES BREAKDOWN */}
      {tab === 'sources' && (
        <Card padded={false}>
          <Table
            loading={loading}
            empty={t('noAttributionFound') || 'No source attribution data found'}
            rowKey={(r) => r.source || 'direct'}
            rows={sourcesBreakdown}
            columns={[
              {
                key: 'source',
                label: t('colSourceMedium') || 'Source / Medium',
                render: (row) => (
                  <div className="py-1">
                    <span className="font-bold text-xs text-[var(--ink)] block">
                      {row.source === 'direct' ? (t('directTraffic') || 'Direct / Organic') : row.source}
                    </span>
                    <span className="text-[11px] text-[var(--ink-soft)]">
                      medium: {row.medium || 'none'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'orders',
                label: t('colOrders') || 'Orders',
                render: (row) => (
                  <span className="text-xs font-bold text-[var(--ink)]">
                    {formatNumber(row.ordersCount || 0)}
                  </span>
                ),
              },
              {
                key: 'revenue',
                label: t('colRevenue') || 'Attributed Revenue',
                render: (row) => (
                  <span className="text-xs font-bold text-[var(--green)]">
                    {formatMoney(row.revenue || 0, language)}
                  </span>
                ),
              },
              {
                key: 'share',
                label: 'Share of Revenue',
                render: (row) => {
                  const share = totals.attributedRevenue > 0
                    ? Math.round(((row.revenue || 0) / totals.attributedRevenue) * 100)
                    : 0
                  return (
                    <div className="flex items-center gap-2 max-w-[160px]">
                      <div className="flex-1 bg-[var(--line)] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[var(--purple)] h-full rounded-full"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-[var(--ink-soft)]">{share}%</span>
                    </div>
                  )
                },
              },
            ]}
          />
        </Card>
      )}

      {/* TAB 2: CAMPAIGNS BREAKDOWN */}
      {tab === 'campaigns' && (
        <Card padded={false}>
          <Table
            loading={loading}
            empty={t('noAttributionFound') || 'No campaign attribution data found'}
            rowKey={(r) => r.campaign || 'untracked'}
            rows={campaignsBreakdown}
            columns={[
              {
                key: 'campaign',
                label: t('colCampaign') || 'UTM Campaign',
                render: (row) => (
                  <div className="py-1">
                    <span className="font-bold text-xs text-[var(--ink)] block">
                      {row.campaign || '—'}
                    </span>
                    <span className="text-[10.5px] font-mono text-[var(--ink-soft)]">
                      source: {row.source || 'meta'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'orders',
                label: t('colOrders') || 'Orders',
                render: (row) => (
                  <span className="text-xs font-bold text-[var(--ink)]">
                    {formatNumber(row.ordersCount || 0)}
                  </span>
                ),
              },
              {
                key: 'revenue',
                label: t('colRevenue') || 'Attributed Revenue',
                render: (row) => (
                  <span className="text-xs font-bold text-[var(--green)]">
                    {formatMoney(row.revenue || 0, language)}
                  </span>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* TAB 3: ORDERS WITH ATTRIBUTION */}
      {tab === 'orders' && (
        <Card padded={false}>
          <Table
            loading={loading}
            empty={t('noAttributionFound') || 'No attributed orders found'}
            rowKey={(r) => r.id}
            rows={orders}
            columns={[
              {
                key: 'order',
                label: t('colOrderNumber') || 'Order #',
                render: (row) => (
                  <Link
                    to={`/orders/${row.id}`}
                    className="text-xs font-semibold text-[var(--purple)] hover:underline flex items-center gap-1"
                  >
                    <span>#{row.orderNumber}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ),
              },
              {
                key: 'customer',
                label: t('colCustomer') || 'Customer',
                render: (row) => (
                  <div className="text-xs">
                    <div className="font-medium text-[var(--ink)]">{row.customerName}</div>
                    <div className="text-[10.5px] text-[var(--ink-soft)]">{row.customerPhone}</div>
                  </div>
                ),
              },
              {
                key: 'total',
                label: t('total') || 'Total',
                render: (row) => (
                  <span className="text-xs font-bold text-[var(--ink)]">
                    {formatMoney(row.total, language)}
                  </span>
                ),
              },
              {
                key: 'source',
                label: t('colSourceMedium') || 'Source / Medium',
                render: (row) => {
                  const attr = row.marketingAttribution || {}
                  return (
                    <div className="py-1">
                      <span className="px-2 py-0.5 rounded-[6px] text-[11px] font-bold bg-[var(--purple-subtle)] text-[var(--purple)] font-mono">
                        {attr.utmSource || 'direct'}
                      </span>
                      {attr.utmMedium && (
                        <span className="text-[10.5px] text-[var(--ink-soft)] block mt-0.5">
                          / {attr.utmMedium}
                        </span>
                      )}
                    </div>
                  )
                },
              },
              {
                key: 'campaign',
                label: t('colCampaign') || 'Campaign / Tags',
                render: (row) => {
                  const attr = row.marketingAttribution || {}
                  return (
                    <div className="text-xs">
                      <div className="font-medium text-[var(--ink)] truncate max-w-[160px]" title={attr.utmCampaign}>
                        {attr.utmCampaign || '—'}
                      </div>
                      {attr.fbclid && (
                        <span className="text-[10px] font-mono text-[var(--green)] flex items-center gap-1">
                          <Link2 className="h-2.5 w-2.5" />
                          fbclid verified
                        </span>
                      )}
                    </div>
                  )
                },
              },
              {
                key: 'date',
                label: t('date') || 'Date',
                render: (row) => (
                  <span className="text-xs text-[var(--ink-soft)]">
                    {formatDate(row.createdAt, language)}
                  </span>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  )
}
