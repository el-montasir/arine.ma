import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Megaphone,
  Activity,
  DollarSign,
  Target,
  MousePointer,
  Eye,
  ShoppingBag,
  RefreshCw,
  Layers,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BarChart3,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { formatMoney, formatNumber, formatDate } from '../lib/format.js'
import { PageHeader, Card, StatCard } from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import { Badge, StatusBadge } from '../components/ui/Badge.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function MarketingOverview() {
  const { t, language, isRTL } = useLanguage()
  const { can, isOwner } = useAuth()

  const [period, setPeriod] = useState('last_30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const fetchOverview = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = await api.get(`/marketing/overview?period=${period}`)
      setData(res.data)
    } catch (err) {
      setError(err.message || t('failedToLoadData') || 'Failed to load marketing overview')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [period, t])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  const kpis = data?.kpis || {}
  const health = data?.trackingHealth || {}
  const timeline = data?.timeline || []
  const topCampaigns = data?.topCampaigns || []
  const recentEvents = data?.recentEvents || []

  // Compute SVG chart points
  const maxVal = Math.max(...timeline.map((d) => Math.max(d.revenue || 0, d.spend || 0)), 100)
  const chartHeight = 160
  const chartWidth = 600

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('marketingOverviewTitle') || 'Marketing & Meta Ads Overview'}
        subtitle={t('marketingOverviewSubtitle') || 'Live monitoring of ad campaigns, ROAS performance, and CAPI tracking health'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-[10px] border border-[var(--line)] bg-[var(--card)] p-0.5">
              {[
                { id: 'today', label: t('filterToday') || 'Today' },
                { id: 'yesterday', label: t('filterYesterday') || 'Yesterday' },
                { id: 'last_7d', label: t('filter7d') || '7 Days' },
                { id: 'last_30d', label: t('filter30d') || '30 Days' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPeriod(tab.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
                    period === tab.id
                      ? 'bg-[var(--purple)] text-white shadow-sm'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchOverview(true)}
              disabled={loading || refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{t('refresh') || 'Refresh'}</span>
            </Button>
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner label={t('loadingData') || 'Loading…'} />
        </div>
      ) : (
        <>
          {/* Quick Sub-navigation Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { to: '/marketing/campaigns', label: t('navMarketingCampaigns') || 'Meta Campaigns', icon: Megaphone },
              { to: '/marketing/tracking', label: t('navMarketingTracking') || 'Tracking & CAPI', icon: Activity },
              { to: '/marketing/attribution', label: t('navMarketingAttribution') || 'Attribution', icon: Target },
              { to: '/marketing/catalog', label: t('navMarketingCatalog') || 'Product Catalog', icon: Database },
              { to: '/marketing/settings', label: t('navMarketingSettings') || 'Meta Settings', icon: ShieldCheck },
            ].map((nav) => {
              const Icon = nav.icon
              return (
                <Link
                  key={nav.to}
                  to={nav.to}
                  className="flex items-center justify-between p-3.5 rounded-[12px] border border-[var(--line)] bg-[var(--card)] hover:border-[var(--purple)] hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-[8px] bg-[var(--purple-subtle)] text-[var(--purple)] group-hover:scale-110 transition-transform">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-[var(--ink)]">{nav.label}</span>
                  </div>
                  <ChevronRight className={`h-3.5 w-3.5 text-[var(--ink-soft)] group-hover:text-[var(--purple)] transition-colors ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              )
            })}
          </div>

          {/* Primary KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={t('statSpend') || 'Ad Spend'}
              value={formatMoney(kpis.spend || 0, language)}
              sub={`${t('colImpressions') || 'Impressions'}: ${formatNumber(kpis.impressions || 0)}`}
              tone="brand"
              icon={DollarSign}
            />
            <StatCard
              label={t('statAttributedRevenue') || 'Attributed Revenue'}
              value={formatMoney(kpis.attributedRevenue || 0, language)}
              sub={`${t('statAttributedOrders') || 'Orders'}: ${formatNumber(kpis.attributedOrders || 0)}`}
              tone="ok"
              icon={TrendingUp}
            />
            <StatCard
              label={t('statRoas') || 'ROAS'}
              value={kpis.roas > 0 ? `${kpis.roas}x` : '—'}
              sub={`${t('statCpa') || 'CPA'}: ${formatMoney(kpis.cpa || 0, language)}`}
              tone={kpis.roas >= 3 ? 'ok' : kpis.roas >= 1.5 ? 'brand' : 'warn'}
              icon={Target}
            />
            <StatCard
              label={t('statClicks') || 'Clicks & CTR'}
              value={`${formatNumber(kpis.clicks || 0)} (${kpis.ctr || 0}%)`}
              sub={`${t('statCpc') || 'CPC'}: ${formatMoney(kpis.cpc || 0, language)}`}
              tone="info"
              icon={MousePointer}
            />
          </div>

          {/* Performance Trend Chart & Health Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <Card className="lg:col-span-2 flex flex-col justify-between" padded>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--line)]">
                <div>
                  <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[var(--purple)]" />
                    {t('trendChartTitle') || 'Spend vs Attributed Revenue Trend'}
                  </h3>
                  <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                    {period === 'today' ? (t('filterToday') || 'Today') : period === 'yesterday' ? (t('filterYesterday') || 'Yesterday') : period === 'last_7d' ? (t('filter7d') || '7 Days') : (t('filter30d') || '30 Days')}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--green)]" />
                    <span className="text-[var(--ink-soft)] font-medium">{t('trendRevenueLegend') || 'Revenue'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--purple)]" />
                    <span className="text-[var(--ink-soft)] font-medium">{t('trendSpendLegend') || 'Spend'}</span>
                  </div>
                </div>
              </div>

              {timeline.length === 0 ? (
                <div className="py-16 text-center text-xs text-[var(--ink-soft)]">
                  {t('noData') || 'No data recorded for this period'}
                </div>
              ) : (
                <div className="pt-6 pb-2 overflow-x-auto">
                  <div className="min-w-[500px]">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible">
                      {/* Grid horizontal guidelines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                        const y = chartHeight - pct * (chartHeight - 30) - 15
                        return (
                          <line
                            key={i}
                            x1="0"
                            y1={y}
                            x2={chartWidth}
                            y2={y}
                            stroke="var(--line)"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                        )
                      })}

                      {/* Revenue Polygon & Line (Green) */}
                      {timeline.length > 1 && (
                        <>
                          <polyline
                            fill="none"
                            stroke="var(--green)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={timeline
                              .map((d, i) => {
                                const x = (i / (timeline.length - 1)) * (chartWidth - 40) + 20
                                const y = chartHeight - ((d.revenue || 0) / maxVal) * (chartHeight - 30) - 15
                                return `${x},${y}`
                              })
                              .join(' ')}
                          />
                          {timeline.map((d, i) => {
                            const x = (i / (timeline.length - 1)) * (chartWidth - 40) + 20
                            const y = chartHeight - ((d.revenue || 0) / maxVal) * (chartHeight - 30) - 15
                            return (
                              <circle
                                key={`rev-${i}`}
                                cx={x}
                                cy={y}
                                r="3.5"
                                fill="var(--green)"
                                stroke="var(--card)"
                                strokeWidth="2"
                              />
                            )
                          })}
                        </>
                      )}

                      {/* Spend Line (Purple) */}
                      {timeline.length > 1 && (
                        <>
                          <polyline
                            fill="none"
                            stroke="var(--purple)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={timeline
                              .map((d, i) => {
                                const x = (i / (timeline.length - 1)) * (chartWidth - 40) + 20
                                const y = chartHeight - ((d.spend || 0) / maxVal) * (chartHeight - 30) - 15
                                return `${x},${y}`
                              })
                              .join(' ')}
                          />
                          {timeline.map((d, i) => {
                            const x = (i / (timeline.length - 1)) * (chartWidth - 40) + 20
                            const y = chartHeight - ((d.spend || 0) / maxVal) * (chartHeight - 30) - 15
                            return (
                              <circle
                                key={`spd-${i}`}
                                cx={x}
                                cy={y}
                                r="3.5"
                                fill="var(--purple)"
                                stroke="var(--card)"
                                strokeWidth="2"
                              />
                            )
                          })}
                        </>
                      )}
                    </svg>

                    {/* X-Axis Labels */}
                    <div className="flex justify-between text-[10.5px] font-medium text-[var(--ink-soft)] px-2 pt-2">
                      {timeline.filter((_, idx) => idx === 0 || idx === Math.floor(timeline.length / 2) || idx === timeline.length - 1).map((d, i) => (
                        <span key={i}>{d.date}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Tracking & Connection Health Card */}
            <Card className="flex flex-col justify-between space-y-4" padded>
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[var(--purple)]" />
                  {t('trackingHealthTitle') || 'Tracking & Sync Health'}
                </h3>
                <Link
                  to="/marketing/tracking"
                  className="text-xs font-semibold text-[var(--purple)] hover:underline flex items-center gap-1"
                >
                  <span>{t('details') || 'Details'}</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {/* Meta Connection */}
                <div className="flex items-center justify-between p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)]">
                  <div className="flex items-center gap-2.5">
                    <Megaphone className="h-4 w-4 text-[var(--purple)]" />
                    <div>
                      <div className="text-xs font-bold text-[var(--ink)]">{t('secMetaAuth') || 'Meta API & Pixel'}</div>
                      <div className="text-[11px] text-[var(--ink-soft)]">
                        {health.pixelConfigured ? t('connectionStatusConnected') || 'Configured' : t('connectionStatusNotConfigured') || 'Not configured'}
                      </div>
                    </div>
                  </div>
                  {health.pixelConfigured ? (
                    <Badge kind="ok">{t('statusActive') || 'Active'}</Badge>
                  ) : (
                    <Badge kind="neutral">{t('connectionStatusNotConfigured') || 'Disabled'}</Badge>
                  )}
                </div>

                {/* Conversions API (CAPI) */}
                <div className="flex items-center justify-between p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)]">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-[var(--green)]" />
                    <div>
                      <div className="text-xs font-bold text-[var(--ink)]">{t('capiCardTitle') || 'Conversions API'}</div>
                      <div className="text-[11px] text-[var(--ink-soft)]">
                        {health.capiConfigured ? t('connectionStatusConnected') || 'Server Dual Tracking' : t('connectionStatusNotConfigured') || 'Disabled'}
                      </div>
                    </div>
                  </div>
                  {health.capiConfigured ? (
                    <Badge kind="ok">{t('statusActive') || 'Active'}</Badge>
                  ) : (
                    <Badge kind="neutral">{t('connectionStatusNotConfigured') || 'Off'}</Badge>
                  )}
                </div>

                {/* Event Delivery Rate */}
                <div className="p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--ink)]">{t('deliveryRate') || 'CAPI Delivery Rate'}</span>
                    <span className="font-bold text-[var(--ink)]">{health.eventDeliveryRate || 100}%</span>
                  </div>
                  <div className="w-full bg-[var(--line)] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[var(--green)] h-full transition-all duration-500 rounded-full"
                      style={{ width: `${health.eventDeliveryRate || 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10.5px] text-[var(--ink-soft)]">
                    <span>{t('total') || 'Total'}: {formatNumber(health.totalEvents24h || 0)}</span>
                    <span className={health.failedEvents24h > 0 ? 'text-[var(--red)] font-semibold' : ''}>
                      {t('eventStatusFailed') || 'Failed'}: {formatNumber(health.failedEvents24h || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link to="/marketing/settings">
                  <Button variant="secondary" size="sm" className="w-full justify-center">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{t('navMarketingSettings') || 'Configure Connection'}</span>
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Top Campaigns & Recent Events Streams */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Campaigns */}
            <Card padded>
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-4">
                <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-[var(--purple)]" />
                  {t('topCampaignsTitle') || 'Top Performing Campaigns'}
                </h3>
                <Link
                  to="/marketing/campaigns"
                  className="text-xs font-semibold text-[var(--purple)] hover:underline flex items-center gap-1"
                >
                  <span>{t('view') || 'All Campaigns'}</span>
                  <ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              </div>

              {topCampaigns.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--ink-soft)]">
                  {t('noCampaignsFound') || 'No campaigns synchronized yet'}
                </div>
              ) : (
                <div className="space-y-3">
                  {topCampaigns.map((camp) => (
                    <div
                      key={camp.id}
                      className="p-3 rounded-[10px] border border-[var(--line)] bg-[var(--bg)] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--ink)] truncate">{camp.name}</span>
                          <StatusBadge
                            kind={camp.status === 'ACTIVE' ? 'ok' : 'neutral'}
                            label={camp.status === 'ACTIVE' ? (t('statusActive') || 'Active') : (t('statusPaused') || 'Paused')}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[var(--ink-soft)]">
                          <span>{t('colSpend') || 'Spend'}: <b className="text-[var(--ink)]">{formatMoney(camp.spend || 0, language)}</b></span>
                          <span>{t('colAttributedRevenue') || 'Revenue'}: <b className="text-[var(--ink)]">{formatMoney(camp.attributedRevenue || 0, language)}</b></span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-[var(--purple)]">
                          {camp.roas ? `${camp.roas}x ROAS` : '—'}
                        </div>
                        <div className="text-[10.5px] text-[var(--ink-soft)]">
                          {camp.attributedOrders || 0} {t('colOrders') || 'orders'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Events Feed */}
            <Card padded>
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-4">
                <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[var(--green)]" />
                  {t('recentEventsTitle') || 'Recent Tracking Events'}
                </h3>
                <Link
                  to="/marketing/tracking"
                  className="text-xs font-semibold text-[var(--purple)] hover:underline flex items-center gap-1"
                >
                  <span>{t('view') || 'Live Stream'}</span>
                  <ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              </div>

              {recentEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--ink-soft)]">
                  {t('noEventsFound') || 'No tracking events logged yet'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--bg)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2 py-0.5 rounded-[6px] text-[10.5px] font-bold bg-[var(--purple-subtle)] text-[var(--purple)] font-mono">
                          {evt.eventName}
                        </span>
                        <div className="truncate">
                          <span className="text-[var(--ink)] font-medium">
                            {evt.order ? `${t('colOrderNumber') || 'Order'} #${evt.order.orderNumber}` : (evt.source || 'Storefront')}
                          </span>
                          <span className="text-[10px] text-[var(--ink-soft)] block">
                            {formatDate(evt.eventTime || evt.createdAt, language)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {evt.value > 0 && (
                          <span className="font-semibold text-[var(--ink)]">
                            {formatMoney(evt.value, language)}
                          </span>
                        )}
                        <StatusBadge
                          kind={evt.status === 'SENT' ? 'ok' : evt.status === 'FAILED' ? 'danger' : 'warn'}
                          label={
                            evt.status === 'SENT'
                              ? (t('eventStatusSent') || 'Sent')
                              : evt.status === 'FAILED'
                              ? (t('eventStatusFailed') || 'Failed')
                              : (t('eventStatusSkipped') || 'Skipped')
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
