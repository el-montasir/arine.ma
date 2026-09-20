import { useState, useEffect, useCallback } from 'react'
import {
  Megaphone,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Play,
  Pause,
  DollarSign,
  TrendingUp,
  Target,
  MousePointer,
  Eye,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { formatMoney, formatNumber, formatDate } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Table from '../components/ui/Table.jsx'
import { Badge, StatusBadge } from '../components/ui/Badge.jsx'
import { Input, Select } from '../components/ui/Input.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function MarketingCampaigns() {
  const { t, language } = useLanguage()
  const { can, isOwner } = useAuth()

  const [tab, setTab] = useState('campaigns') // 'campaigns' | 'adsets' | 'ads'
  const [campaigns, setCampaigns] = useState([])
  const [adSets, setAdSets] = useState([])
  const [ads, setAds] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [togglingId, setTogglingId] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'campaigns') {
        const query = new URLSearchParams({
          page: String(pagination.page),
          limit: String(pagination.limit),
          status: statusFilter,
          search,
        })
        const res = await api.get(`/marketing/campaigns?${query}`)
        setCampaigns(res.data || [])
        if (res.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: res.pagination.total,
            totalPages: res.pagination.totalPages,
          }))
        }
      } else if (tab === 'adsets') {
        const res = await api.get('/marketing/adsets')
        setAdSets(res.data || [])
      } else if (tab === 'ads') {
        const res = await api.get('/marketing/ads')
        setAds(res.data || [])
      }
    } catch (err) {
      setError(err.message || t('failedToLoadData') || 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [tab, pagination.page, pagination.limit, statusFilter, search, t])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const handleSyncFromMeta = async () => {
    setSyncing(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await api.post('/marketing/campaigns/sync', {})
      setSuccessMsg(res.message || t('syncSuccess') || 'Campaigns synced with Meta successfully')
      fetchCampaigns()
    } catch (err) {
      setError(err.message || t('syncFailed') || 'Failed to sync with Meta')
    } finally {
      setSyncing(false)
    }
  }

  const handleToggleStatus = async (campaign) => {
    const nextStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setTogglingId(campaign.id)
    setError('')
    try {
      await api.patch(`/marketing/campaigns/${campaign.id}/status`, { status: nextStatus })
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, status: nextStatus } : c))
      )
      setSuccessMsg(
        nextStatus === 'ACTIVE'
          ? t('resumeActionSuccess') || 'Campaign activated'
          : t('pauseActionSuccess') || 'Campaign paused'
      )
    } catch (err) {
      setError(err.message || t('updateFailed') || 'Failed to update campaign status')
    } finally {
      setTogglingId(null)
    }
  }

  const canManage = isOwner || can('MARKETING_CAMPAIGNS_MANAGE') || can('MARKETING_MANAGE')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('campaignsTitle') || 'Meta Ads Campaigns'}
        subtitle={t('campaignsSubtitle') || 'Manage and monitor campaigns, ad sets, and ads with live real-time metrics'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSyncFromMeta}
                disabled={syncing || loading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? (t('syncingCampaigns') || 'Syncing…') : (t('syncFromMetaBtn') || 'Sync from Meta')}</span>
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchCampaigns}
              disabled={loading || syncing}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{t('refresh') || 'Refresh'}</span>
            </Button>
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}
      {successMsg && (
        <div className="p-3 rounded-[10px] border border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)] text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-[var(--green)] hover:opacity-75 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--line)] gap-2">
        {[
          { id: 'campaigns', label: t('tabCampaigns') || 'Campaigns', icon: Megaphone },
          { id: 'adsets', label: t('tabAdSets') || 'Ad Sets', icon: Layers },
          { id: 'ads', label: t('tabAds') || 'Individual Ads', icon: Sparkles },
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

      {/* Filters (Campaigns Tab) */}
      {tab === 'campaigns' && (
        <Card padded>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="absolute top-2.5 right-3 h-4 w-4 text-[var(--ink-soft)]" />
              <input
                type="text"
                placeholder={t('search') || 'Search campaigns…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchCampaigns()}
                className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3.5 py-2 text-xs text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--purple)] focus:outline-none"
              />
            </div>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">{t('filterAllStatuses') || 'All Statuses'}</option>
              <option value="ACTIVE">{t('statusActive') || 'Active'}</option>
              <option value="PAUSED">{t('statusPaused') || 'Paused'}</option>
              <option value="ARCHIVED">{t('statusArchived') || 'Archived'}</option>
            </Select>
          </div>
        </Card>
      )}

      {/* Content Tables */}
      <Card padded={false}>
        {tab === 'campaigns' && (
          <Table
            loading={loading}
            empty={t('noCampaignsFound') || 'No campaigns found'}
            rowKey={(r) => r.id}
            rows={campaigns}
            columns={[
              {
                key: 'name',
                label: t('colCampaign') || 'Campaign',
                render: (row) => (
                  <div className="py-1">
                    <div className="font-bold text-xs text-[var(--ink)]">{row.name}</div>
                    <div className="text-[10.5px] font-mono text-[var(--ink-soft)]">
                      ID: {row.metaCampaignId}
                    </div>
                  </div>
                ),
              },
              {
                key: 'status',
                label: t('status') || 'Status',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      kind={row.status === 'ACTIVE' ? 'ok' : 'neutral'}
                      label={row.status === 'ACTIVE' ? (t('statusActive') || 'Active') : (t('statusPaused') || 'Paused')}
                    />
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(row)}
                        disabled={togglingId === row.id}
                        title={row.status === 'ACTIVE' ? (t('pauseAction') || 'Pause') : (t('resumeAction') || 'Resume')}
                        className="p-1 rounded-[6px] border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--bg)] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {togglingId === row.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : row.status === 'ACTIVE' ? (
                          <Pause className="h-3 w-3 text-[var(--orange)]" />
                        ) : (
                          <Play className="h-3 w-3 text-[var(--green)]" />
                        )}
                      </button>
                    )}
                  </div>
                ),
              },
              {
                key: 'objective',
                label: t('colObjective') || 'Objective',
                render: (row) => (
                  <span className="text-xs font-mono text-[var(--ink-soft)]">
                    {row.objective || 'OUTCOME_SALES'}
                  </span>
                ),
              },
              {
                key: 'budget',
                label: t('colBudget') || 'Budget',
                render: (row) => {
                  const b = row.dailyBudget || row.lifetimeBudget
                  if (!b) return <span className="text-xs text-[var(--ink-soft)]">—</span>
                  return (
                    <div className="text-xs font-semibold text-[var(--ink)]">
                      {formatMoney(b, language)}
                      <span className="text-[10px] font-normal text-[var(--ink-soft)] block">
                        {row.dailyBudget ? (t('dailyBudgetLabel') || 'Daily') : (t('lifetimeBudgetLabel') || 'Lifetime')}
                      </span>
                    </div>
                  )
                },
              },
              {
                key: 'spend',
                label: t('colSpend') || 'Spend',
                render: (row) => (
                  <span className="text-xs font-bold text-[var(--ink)]">
                    {formatMoney(row.spend || 0, language)}
                  </span>
                ),
              },
              {
                key: 'attributedRevenue',
                label: t('colAttributedRevenue') || 'Revenue',
                render: (row) => (
                  <span className="text-xs font-bold text-[var(--green)]">
                    {formatMoney(row.attributedRevenue || 0, language)}
                  </span>
                ),
              },
              {
                key: 'roas',
                label: t('colRoas') || 'ROAS',
                render: (row) => (
                  <span className="text-xs font-bold text-[var(--purple)]">
                    {row.roas ? `${row.roas}x` : '—'}
                  </span>
                ),
              },
              {
                key: 'cpa',
                label: t('colCpa') || 'CPA',
                render: (row) => (
                  <span className="text-xs font-medium text-[var(--ink)]">
                    {row.cpa ? formatMoney(row.cpa, language) : '—'}
                  </span>
                ),
              },
              {
                key: 'performance',
                label: `${t('colClicks') || 'Clicks'} / ${t('colImpressions') || 'Impressions'}`,
                render: (row) => (
                  <div className="text-xs">
                    <span className="font-semibold text-[var(--ink)]">{formatNumber(row.clicks || 0)}</span>
                    <span className="text-[var(--ink-soft)]"> / {formatNumber(row.impressions || 0)}</span>
                    <span className="text-[10px] text-[var(--ink-soft)] block">CTR: {row.ctr || 0}%</span>
                  </div>
                ),
              },
            ]}
          />
        )}

        {tab === 'adsets' && (
          <Table
            loading={loading}
            empty={t('noData') || 'No Ad Sets available'}
            rowKey={(r) => r.id}
            rows={adSets}
            columns={[
              {
                key: 'name',
                label: t('adSetName') || 'Ad Set Name',
                render: (row) => (
                  <div>
                    <div className="font-bold text-xs text-[var(--ink)]">{row.name}</div>
                    <div className="text-[10px] font-mono text-[var(--ink-soft)]">ID: {row.id}</div>
                  </div>
                ),
              },
              {
                key: 'campaignName',
                label: t('colCampaign') || 'Campaign',
                render: (row) => (
                  <span className="text-xs text-[var(--ink)]">{row.campaignName || '—'}</span>
                ),
              },
              {
                key: 'status',
                label: t('status') || 'Status',
                render: (row) => (
                  <StatusBadge
                    kind={row.status === 'ACTIVE' ? 'ok' : 'neutral'}
                    label={row.status === 'ACTIVE' ? (t('statusActive') || 'Active') : (t('statusPaused') || 'Paused')}
                  />
                ),
              },
              {
                key: 'optimizationGoal',
                label: t('optimizationGoal') || 'Optimization Goal',
                render: (row) => (
                  <span className="text-xs font-mono text-[var(--ink-soft)]">
                    {row.optimization_goal || 'OFFSITE_CONVERSIONS'}
                  </span>
                ),
              },
              {
                key: 'dailyBudget',
                label: t('colBudget') || 'Budget',
                render: (row) => (
                  <span className="text-xs font-medium text-[var(--ink)]">
                    {row.daily_budget ? formatMoney(row.daily_budget / 100, language) : '—'}
                  </span>
                ),
              },
              {
                key: 'spend',
                label: t('colSpend') || 'Spend',
                render: (row) => (
                  <span className="text-xs font-bold text-[var(--ink)]">
                    {formatMoney(row.spend || 0, language)}
                  </span>
                ),
              },
              {
                key: 'clicks',
                label: t('colClicks') || 'Clicks',
                render: (row) => (
                  <span className="text-xs font-medium text-[var(--ink)]">
                    {formatNumber(row.clicks || 0)}
                  </span>
                ),
              },
            ]}
          />
        )}

        {tab === 'ads' && (
          <Table
            loading={loading}
            empty={t('noData') || 'No individual Ads available'}
            rowKey={(r) => r.id}
            rows={ads}
            columns={[
              {
                key: 'name',
                label: t('adName') || 'Ad Name',
                render: (row) => (
                  <div>
                    <div className="font-bold text-xs text-[var(--ink)]">{row.name}</div>
                    <div className="text-[10px] font-mono text-[var(--ink-soft)]">ID: {row.id}</div>
                  </div>
                ),
              },
              {
                key: 'campaignName',
                label: t('colCampaign') || 'Campaign / Ad Set',
                render: (row) => (
                  <div>
                    <div className="text-xs text-[var(--ink)]">{row.campaignName || '—'}</div>
                    <div className="text-[10.5px] text-[var(--ink-soft)]">{row.adSetName || ''}</div>
                  </div>
                ),
              },
              {
                key: 'status',
                label: t('status') || 'Status',
                render: (row) => (
                  <StatusBadge
                    kind={row.status === 'ACTIVE' ? 'ok' : 'neutral'}
                    label={row.status === 'ACTIVE' ? (t('statusActive') || 'Active') : (t('statusPaused') || 'Paused')}
                  />
                ),
              },
              {
                key: 'creative',
                label: t('creativePreview') || 'Creative',
                render: (row) => (
                  <div className="text-xs text-[var(--ink-soft)] max-w-xs truncate">
                    {row.creative?.title || row.creative?.body || 'Dynamic Catalog Creative'}
                  </div>
                ),
              },
              {
                key: 'spend',
                label: t('colSpend') || 'Spend',
                render: (row) => (
                  <span className="text-xs font-bold text-[var(--ink)]">
                    {formatMoney(row.spend || 0, language)}
                  </span>
                ),
              },
              {
                key: 'performance',
                label: `${t('colClicks') || 'Clicks'} (CTR)`,
                render: (row) => (
                  <span className="text-xs font-medium text-[var(--ink)]">
                    {formatNumber(row.clicks || 0)} ({row.ctr || 0}%)
                  </span>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  )
}
