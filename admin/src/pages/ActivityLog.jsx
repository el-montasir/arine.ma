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
    if (!action) return <span className="text-text-muted">—</span>
    const style = getActionStyle(action)
    const label = formatActionString(action, language, t)

    return (
      <span className={`status-pill ${style}`}>
        <span className="dot" />
        <span>{label}</span>
      </span>
    )
  }

  const columns = [
    {
      key: 'createdAt',
      label: t('colLogDate'),
      render: (r) => (
        <span className="text-xs text-text-muted tabular-nums">
          {formatDate(r.createdAt, language)}
        </span>
      ),
    },
    {
      key: 'actor',
      label: t('colLogActor'),
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-800 border border-line text-xs font-bold text-brand-600">
            {(r.actorName || r.actorEmail || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="text-xs">
            <div className="font-medium text-text-main">{r.actorName || r.actorEmail || 'System'}</div>
            {r.actorEmail && r.actorName && (
              <div className="text-[11px] text-text-muted">{r.actorEmail}</div>
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
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-text-main bg-surface-800 px-2 py-0.5 rounded-md border border-line">
            <span>{formatResourceString(r.resourceType, null, language, t)}</span>
            {r.resourceId && <span className="text-brand-600 font-semibold">#{r.resourceId}</span>}
          </span>
        </div>
      ),
    },
    {
      key: 'ip',
      label: t('colLogIp'),
      render: (r) => (
        <span className="text-xs font-mono text-text-muted flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-text-subtle shrink-0" />
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
            onClick={() => setSelectedLog(r)}
            title={t('logDetailsTitle')}
            aria-label={t('logDetailsTitle')}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-800 hover:text-text-main transition-colors"
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
          <Button variant="secondary" onClick={() => fetchLogs(pagination.page)}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchLogsPlaceholder')}
              className="w-full rounded-xl border border-line bg-white dark:bg-surface-900 py-2 ps-10 pe-4 text-sm text-gray-900 dark:text-text-main placeholder:text-gray-400 dark:placeholder:text-text-subtle focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
            />
          </div>

          {/* Action filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-xl border border-line bg-white dark:bg-surface-900 px-3 py-2 text-sm text-gray-900 dark:text-text-main focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
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
              className="w-full rounded-xl border border-line bg-white dark:bg-surface-900 px-3 py-2 text-sm text-gray-900 dark:text-text-main focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
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
              className="w-full rounded-xl border border-line bg-surface-900 px-2.5 py-1.5 text-xs text-text-main focus:border-brand-500 focus:outline-none"
            />
            <span className="text-text-subtle text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-900 px-2.5 py-1.5 text-xs text-text-main focus:border-brand-500 focus:outline-none"
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
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-text-muted">
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
                <span>{language === 'ar' ? 'السابق' : (language === 'fr' ? 'Précédent' : 'Prev')}</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchLogs(pagination.page + 1)}
              >
                <span>{language === 'ar' ? 'التالي' : (language === 'fr' ? 'Suivant' : 'Next')}</span>
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
        maxWidth="max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface-800/50 p-3.5">
              <div>
                <span className="text-text-muted block mb-1">{t('colLogAction')}</span>
                <div>{renderActionBadge(selectedLog.action)}</div>
              </div>
              <div>
                <span className="text-text-muted block mb-1">{t('colLogDate')}</span>
                <span className="font-medium text-text-main">{formatDate(selectedLog.createdAt, language)}</span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">{t('colLogActor')}</span>
                <span className="font-medium text-text-main">
                  {selectedLog.actorName || selectedLog.actorEmail || 'System'}
                  {selectedLog.actorId ? ` (ID: ${selectedLog.actorId})` : ''}
                </span>
              </div>
              <div>
                <span className="text-text-muted block mb-1">{t('colLogResource')}</span>
                <span className="font-mono text-text-main font-medium">
                  {formatResourceString(selectedLog.resourceType, selectedLog.resourceId, language, t)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-text-muted block mb-1">{t('colLogIp')}</span>
                <span className="font-mono text-text-main">{selectedLog.ipAddress || '—'}</span>
              </div>
              {selectedLog.userAgent && (
                <div className="col-span-2">
                  <span className="text-text-muted block mb-1">User Agent</span>
                  <span className="font-mono text-[11px] text-text-muted break-all">{selectedLog.userAgent}</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-text-muted font-semibold uppercase tracking-wider block mb-1.5">
                {t('colLogDetails')} (Sanitized Metadata)
              </span>
              <pre className="rounded-xl border border-line bg-surface-800 p-4 font-mono text-[11px] text-text-main overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
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

