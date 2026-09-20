import { useState, useEffect, useCallback } from 'react'
import {
  History,
  Search,
  Filter,
  Calendar,
  User,
  Shield,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Globe,
  Monitor,
} from 'lucide-react'
import { api } from '../lib/api.js'
import {
  formatDate,
  formatActionString,
  getActionStyle,
  formatResourceString,
} from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { Badge, StatusBadge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

const ACTION_OPTIONS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGIN_BLOCKED',
  'LOGOUT',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_ENABLED',
  'USER_DISABLED',
  'USER_DELETED',
  'PERMISSIONS_UPDATED',
  'PASSWORD_RESET',
  'PASSWORD_CHANGED',
  'SESSIONS_REVOKED',
  'OTHER_SESSIONS_REVOKED',
  'PRODUCT_CREATED',
  'PRODUCT_UPDATED',
  'PRODUCT_DELETED',
  'CATEGORY_CREATED',
  'CATEGORY_UPDATED',
  'CATEGORY_DELETED',
  'PACKAGE_CREATED',
  'PACKAGE_UPDATED',
  'PACKAGE_DELETED',
  'BANNER_CREATED',
  'BANNER_UPDATED',
  'BANNER_DELETED',
  'SHIPPING_SETTINGS_UPDATED',
  'STORE_CONFIG_UPDATED',
  'STORE_SETTINGS_UPDATED',
  'ORDER_STATUS_UPDATED',
  'SECURITY_SETTINGS_UPDATED',
  'UPDATE_MARKETING_SETTINGS',
  'TEST_META_CONNECTION',
  'DISCONNECT_META',
  'SYNC_META_CAMPAIGNS',
  'UPDATE_CAMPAIGN_STATUS',
  'RETRY_MARKETING_EVENT',
  'RETRY_ALL_FAILED_MARKETING_EVENTS',
  'SEND_TEST_MARKETING_EVENT',
  'SYNC_CATALOG_ITEMS',
]

const RESOURCE_OPTIONS = [
  'AUTH',
  'ADMIN_USER',
  'STORE_CONFIG',
  'STORE_SETTINGS',
  'ORDER',
  'PRODUCT',
  'CATEGORY',
  'PACKAGE',
  'BANNER',
  'SHIPPING',
  'SECURITY',
  'MARKETING_SETTINGS',
  'MARKETING_CONNECTION',
  'MARKETING_CAMPAIGNS',
  'MARKETING_CAMPAIGN',
  'MARKETING_EVENTS',
  'MARKETING_EVENT',
  'MARKETING_CATALOG',
]

export default function ActivityLog() {
  const { t, language, isRTL } = useLanguage()

  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filter states
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Details modal
  const [selectedLog, setSelectedLog] = useState(null)

  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      try {
        const query = new URLSearchParams()
        query.set('page', page)
        query.set('limit', '25')
        if (search.trim()) query.set('search', search.trim())
        if (actionFilter) query.set('action', actionFilter)
        if (resourceFilter) query.set('resourceType', resourceFilter)
        if (startDate) query.set('startDate', startDate)
        if (endDate) query.set('endDate', endDate)

        const res = await api.get(`/activity-logs?${query.toString()}`)
        setLogs(res.logs || [])
        if (res.pagination) {
          setPagination(res.pagination)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [search, actionFilter, resourceFilter, startDate, endDate]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchLogs])

  function renderActionBadge(action) {
    if (!action) return <span className="text-[var(--ink-soft)]">—</span>
    const style = getActionStyle(action)
    const label = formatActionString(action, language, t)

    let kind = 'neutral'
    if (action.includes('SUCCESS') || action.includes('CREATED') || action.includes('ENABLED')) kind = 'ok'
    else if (action.includes('FAILED') || action.includes('BLOCKED') || action.includes('DELETED') || action.includes('DISABLED')) kind = 'danger'
    else if (action.includes('UPDATED') || action.includes('RESET') || action.includes('REVOKED')) kind = 'warn'
    else if (action.includes('LOGOUT')) kind = 'purple'

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        kind === 'ok'
          ? 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20'
          : kind === 'danger'
          ? 'bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/20'
          : kind === 'warn'
          ? 'bg-[var(--orange-bg)] text-[var(--orange)] border border-[var(--orange)]/20'
          : kind === 'purple'
          ? 'bg-[var(--purple-bg)] text-[var(--purple)] border border-[var(--purple)]/20'
          : 'bg-[var(--bg)] text-[var(--ink-soft)] border border-[var(--line)]'
      }`}>
        <span>{label}</span>
      </span>
    )
  }

  const columns = [
    {
      key: 'createdAt',
      label: t('colLogDate'),
      render: (r) => (
        <span className="text-xs text-[var(--ink-soft)] tabular-nums font-mono">
          {formatDate(r.createdAt, language)}
        </span>
      ),
    },
    {
      key: 'actor',
      label: t('colLogActor'),
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--purple-bg)] text-[var(--purple)] text-xs font-bold shrink-0">
            {(r.actorName || r.actorEmail || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="text-xs">
            <div className="font-semibold text-[var(--ink)]">{r.actorName || r.actorEmail || 'System'}</div>
            {r.actorEmail && r.actorName && (
              <div className="text-[11px] text-[var(--ink-soft)] font-mono" dir="ltr">{r.actorEmail}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      label: t('colLogAction'),
      render: (r) => renderActionBadge(r.action),
    },
    {
      key: 'resource',
      label: t('colLogResource'),
      render: (r) => (
        <div className="text-xs">
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--ink)] bg-[var(--bg)] px-2 py-0.5 rounded-[6px] border border-[var(--line)]">
            <span>{formatResourceString(r.resourceType, null, language, t)}</span>
            {r.resourceId && <span className="text-[var(--purple)] font-bold">#{r.resourceId}</span>}
          </span>
        </div>
      ),
    },
    {
      key: 'ip',
      label: t('colLogIp'),
      render: (r) => (
        <span className="text-xs font-mono text-[var(--ink-soft)] flex items-center gap-1.5" dir="ltr">
          <Globe className="h-3.5 w-3.5 text-[var(--ink-soft)] shrink-0" />
          <span>{r.ipAddress || '—'}</span>
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setSelectedLog(r)}
            title={t('logDetailsTitle')}
            aria-label={t('logDetailsTitle')}
            className="rounded-[8px] p-1.5 text-[var(--ink-soft)] hover:bg-[var(--bg)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('activityLogTitle')}
        subtitle={t('activityLogSubtitle')}
        actions={
          <Button variant="secondary" size="sm" onClick={() => fetchLogs(pagination.page)}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('refresh')}</span>
          </Button>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      {/* Filter and Search Controls */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-soft)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchLogsPlaceholder')}
              className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] py-2 ps-10 pe-4 text-xs text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--purple)] focus:outline-none"
            />
          </div>

          {/* Action filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
            >
              <option value="">{t('filterAllActions')}</option>
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {formatActionString(opt, language, t)}
                </option>
              ))}
            </select>
          </div>

          {/* Resource filter */}
          <div>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
            >
              <option value="">{t('filterAllResources')}</option>
              {RESOURCE_OPTIONS.map((res) => (
                <option key={res} value={res}>
                  {formatResourceString(res, null, language, t)}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
            />
            <span className="text-[var(--ink-soft)] text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card padded={false}>
        <Table
          columns={columns}
          rows={logs}
          rowKey={(r) => r.id}
          loading={loading}
          empty={t('noLogsFound')}
        />

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--ink-soft)]">
            <div>
              {pagination.total} records (Page {pagination.page} of {pagination.totalPages})
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchLogs(pagination.page - 1)}
              >
                {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                <span>{t('prev')}</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchLogs(pagination.page + 1)}
              >
                <span>{t('next')}</span>
                {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={t('logDetailsTitle')}
        width="max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--bg)] p-3.5">
              <div>
                <span className="text-[var(--ink-soft)] block mb-1 font-medium">{t('colLogAction')}</span>
                <div>{renderActionBadge(selectedLog.action)}</div>
              </div>
              <div>
                <span className="text-[var(--ink-soft)] block mb-1 font-medium">{t('colLogDate')}</span>
                <span className="font-semibold text-[var(--ink)]">{formatDate(selectedLog.createdAt, language)}</span>
              </div>
              <div>
                <span className="text-[var(--ink-soft)] block mb-1 font-medium">{t('colLogActor')}</span>
                <span className="font-semibold text-[var(--ink)]">
                  {selectedLog.actorName || selectedLog.actorEmail || 'System'}
                  {selectedLog.actorId ? ` (ID: ${selectedLog.actorId})` : ''}
                </span>
              </div>
              <div>
                <span className="text-[var(--ink-soft)] block mb-1 font-medium">{t('colLogResource')}</span>
                <span className="font-mono text-[var(--ink)] font-semibold">
                  {formatResourceString(selectedLog.resourceType, selectedLog.resourceId, language, t)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[var(--ink-soft)] block mb-1 font-medium">{t('colLogIp')}</span>
                <span className="font-mono text-[var(--ink)]" dir="ltr">{selectedLog.ipAddress || '—'}</span>
              </div>
              {selectedLog.userAgent && (
                <div className="col-span-2">
                  <span className="text-[var(--ink-soft)] block mb-1 font-medium">User Agent</span>
                  <span className="font-mono text-[11px] text-[var(--ink-soft)] break-all" dir="ltr">{selectedLog.userAgent}</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-[var(--ink-soft)] font-bold uppercase tracking-wider block mb-1.5">
                {t('colLogDetails')} (Sanitized Metadata)
              </span>
              <pre className="rounded-[12px] border border-[var(--line)] bg-[var(--bg)] p-4 font-mono text-[11px] text-[var(--ink)] overflow-x-auto max-h-60" dir="ltr">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--line)]">
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                {t('close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
