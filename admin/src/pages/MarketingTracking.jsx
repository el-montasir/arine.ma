import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Send,
  RefreshCw,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  ShieldCheck,
  Terminal,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { formatMoney, formatNumber, formatDate } from '../lib/format.js'
import { PageHeader, Card, StatCard } from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Table from '../components/ui/Table.jsx'
import Modal from '../components/ui/Modal.jsx'
import { Badge, StatusBadge } from '../components/ui/Badge.jsx'
import { Input, Select } from '../components/ui/Input.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function MarketingTracking() {
  const { t, language, isRTL } = useLanguage()
  const { can, isOwner } = useAuth()

  const [activeTab, setActiveTab] = useState('events') // 'events' | 'test'
  const [events, setEvents] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Filter states
  const [eventNameFilter, setEventNameFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  // Modal / Payload inspection
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [retryingId, setRetryingId] = useState(null)
  const [retryingAll, setRetryingAll] = useState(false)

  // Test Event Runner State
  const [testEventName, setTestEventName] = useState('Purchase')
  const [testEventCode, setTestEventCode] = useState('')
  const [testEmail, setTestEmail] = useState('test_buyer@arine.ma')
  const [testPhone, setTestPhone] = useState('0612345678')
  const [testValue, setTestValue] = useState('249.00')
  const [testSending, setTestSending] = useState(false)
  const [testResponse, setTestResponse] = useState(null)

  const fetchTrackingData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [eventsRes, healthRes] = await Promise.all([
        api.get(
          `/marketing/events?page=${pagination.page}&limit=${pagination.limit}&eventName=${eventNameFilter}&status=${statusFilter}&source=${sourceFilter}&search=${search}`
        ),
        api.get('/marketing/tracking/health'),
      ])
      setEvents(eventsRes.data || [])
      if (eventsRes.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: eventsRes.pagination.total,
          totalPages: eventsRes.pagination.totalPages,
        }))
      }
      setHealth(healthRes.data || null)
    } catch (err) {
      setError(err.message || t('failedToLoadData') || 'Failed to load tracking data')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, eventNameFilter, statusFilter, sourceFilter, search, t])

  useEffect(() => {
    fetchTrackingData()
  }, [fetchTrackingData])

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRetrySingle = async (eventId) => {
    setRetryingId(eventId)
    setError('')
    try {
      const res = await api.post(`/marketing/events/${eventId}/retry`, {})
      setSuccessMsg(res.message || t('retrySuccess') || 'Event retried successfully')
      fetchTrackingData()
    } catch (err) {
      setError(err.message || t('retryFailed') || 'Failed to retry event')
    } finally {
      setRetryingId(null)
    }
  }

  const handleRetryAllFailed = async () => {
    setRetryingAll(true)
    setError('')
    try {
      const res = await api.post('/marketing/events/retry-failed', {})
      setSuccessMsg(res.message || t('retryBatchSuccess') || 'Batch retry completed')
      fetchTrackingData()
    } catch (err) {
      setError(err.message || t('retryFailed') || 'Failed to retry events')
    } finally {
      setRetryingAll(false)
    }
  }

  const handleSendTestEvent = async (e) => {
    e.preventDefault()
    setTestSending(true)
    setError('')
    setTestResponse(null)
    try {
      const res = await api.post('/marketing/events/test', {
        eventName: testEventName,
        testEventCode: testEventCode.trim() || undefined,
        customData: {
          currency: 'MAD',
          value: parseFloat(testValue) || 0,
          content_type: 'product',
          contents: [{ id: 'test-item-1', quantity: 1, item_price: parseFloat(testValue) || 0 }],
        },
        userData: {
          email: testEmail.trim() || undefined,
          phone: testPhone.trim() || undefined,
        },
      })
      setTestResponse(res.data)
      setSuccessMsg(res.message || t('testEventSuccess') || 'Test event dispatched successfully!')
      fetchTrackingData()
    } catch (err) {
      setError(err.message || t('testEventFailed') || 'Failed to dispatch test event')
    } finally {
      setTestSending(false)
    }
  }

  const canRetry = isOwner || can('MARKETING_EVENTS_RETRY') || can('MARKETING_MANAGE')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('trackingTitle') || 'Event Tracking & Conversions API (CAPI)'}
        subtitle={t('trackingSubtitle') || 'Live event stream, data delivery diagnostics, and Meta event test runner'}
        actions={
          <div className="flex items-center gap-2">
            {canRetry && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRetryAllFailed}
                disabled={retryingAll || loading}
              >
                <RotateCcw className={`h-3.5 w-3.5 ${retryingAll ? 'animate-spin' : ''}`} />
                <span>{retryingAll ? (t('retrying') || 'Retrying…') : (t('retryAllFailedBtn') || 'Retry All Failed')}</span>
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchTrackingData}
              disabled={loading}
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

      {/* Health Metric Cards */}
      {health && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={t('eventsHealthCardTitle') || 'CAPI Delivery Rate'}
            value={`${health.eventDeliveryRate || 100}%`}
            sub={`${health.succeededEvents24h || 0} ${t('eventStatusSent') || 'Sent'} / 24h`}
            tone={health.eventDeliveryRate >= 95 ? 'ok' : health.eventDeliveryRate >= 80 ? 'warn' : 'danger'}
            icon={Activity}
          />
          <StatCard
            label={t('total') || 'Total Events Logged (7d)'}
            value={formatNumber(health.totalEvents7d || 0)}
            sub={`${formatNumber(health.totalEvents24h || 0)} in last 24h`}
            tone="brand"
            icon={Send}
          />
          <StatCard
            label={t('eventStatusFailed') || 'Failed Events'}
            value={formatNumber(health.failedEvents24h || 0)}
            sub={health.failedEvents24h > 0 ? (t('retryAllFailedBtn') || 'Action required') : 'All systems operational'}
            tone={health.failedEvents24h > 0 ? 'danger' : 'ok'}
            icon={health.failedEvents24h > 0 ? AlertTriangle : CheckCircle2}
          />
          <StatCard
            label={t('capiCardTitle') || 'CAPI Server State'}
            value={health.capiConfigured ? (t('statusActive') || 'Active') : (t('connectionStatusNotConfigured') || 'Disabled')}
            sub={health.pixelConfigured ? 'Browser Pixel: Enabled' : 'Browser Pixel: Off'}
            tone={health.capiConfigured ? 'ok' : 'warn'}
            icon={ShieldCheck}
          />
        </div>
      )}

      {/* Tabs: Live Events vs Test Events */}
      <div className="flex border-b border-[var(--line)] gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'events'
              ? 'border-[var(--purple)] text-[var(--purple)]'
              : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>{t('eventsTab') || 'Live Events Stream'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('test')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'test'
              ? 'border-[var(--purple)] text-[var(--purple)]'
              : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>{t('testEventsTab') || 'Test Events Runner'}</span>
        </button>
      </div>

      {/* TAB 1: LIVE EVENTS STREAM */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <Card padded>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <input
                  type="text"
                  placeholder={t('searchLogsPlaceholder') || 'Search by Order # or Event ID…'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchTrackingData()}
                  className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--purple)] focus:outline-none"
                />
              </div>

              <Select
                value={eventNameFilter}
                onChange={(e) => setEventNameFilter(e.target.value)}
              >
                <option value="ALL">{t('filterAllEvents') || 'All Events'}</option>
                <option value="PageView">PageView</option>
                <option value="ViewContent">ViewContent</option>
                <option value="Search">Search</option>
                <option value="AddToCart">AddToCart</option>
                <option value="InitiateCheckout">InitiateCheckout</option>
                <option value="Purchase">Purchase</option>
              </Select>

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">{t('filterAllStatuses') || 'All Statuses'}</option>
                <option value="SENT">{t('eventStatusSent') || 'Sent to Meta'}</option>
                <option value="FAILED">{t('eventStatusFailed') || 'Failed'}</option>
                <option value="PENDING">{t('eventStatusPending') || 'Pending'}</option>
                <option value="SKIPPED">{t('eventStatusSkipped') || 'Skipped'}</option>
              </Select>

              <Select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="ALL">{t('filterAllResources') || 'All Sources'}</option>
                <option value="SERVER_CAPI">SERVER_CAPI</option>
                <option value="BROWSER_PIXEL">BROWSER_PIXEL</option>
              </Select>
            </div>
          </Card>

          {/* Events Table */}
          <Card padded={false}>
            <Table
              loading={loading}
              empty={t('noEventsFound') || 'No tracking events found'}
              rowKey={(r) => r.id}
              rows={events}
              columns={[
                {
                  key: 'eventName',
                  label: t('colEvent') || 'Event',
                  render: (row) => (
                    <div className="py-1">
                      <span className="px-2.5 py-1 rounded-[6px] text-xs font-bold font-mono bg-[var(--purple-subtle)] text-[var(--purple)] inline-block">
                        {row.eventName}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'eventId',
                  label: t('colEventId') || 'Event ID',
                  render: (row) => (
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink-soft)]">
                      <span className="truncate max-w-[140px]" title={row.eventId}>
                        {row.eventId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(row.eventId, row.id)}
                        className="text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer"
                        title="Copy ID"
                      >
                        {copiedId === row.id ? (
                          <Check className="h-3 w-3 text-[var(--green)]" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  ),
                },
                {
                  key: 'order',
                  label: t('colOrderNumber') || 'Order #',
                  render: (row) =>
                    row.order ? (
                      <Link
                        to={`/orders/${row.order.id}`}
                        className="text-xs font-semibold text-[var(--purple)] hover:underline flex items-center gap-1"
                      >
                        <span>#{row.order.orderNumber}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--ink-soft)]">—</span>
                    ),
                },
                {
                  key: 'value',
                  label: t('colEventValue') || 'Value',
                  render: (row) =>
                    row.value > 0 ? (
                      <span className="text-xs font-bold text-[var(--ink)]">
                        {formatMoney(row.value, language)}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--ink-soft)]">—</span>
                    ),
                },
                {
                  key: 'status',
                  label: t('colEventStatus') || 'Status',
                  render: (row) => (
                    <StatusBadge
                      kind={row.status === 'SENT' ? 'ok' : row.status === 'FAILED' ? 'danger' : 'warn'}
                      label={
                        row.status === 'SENT'
                          ? (t('eventStatusSent') || 'Sent')
                          : row.status === 'FAILED'
                          ? (t('eventStatusFailed') || 'Failed')
                          : (t('eventStatusSkipped') || 'Skipped')
                      }
                    />
                  ),
                },
                {
                  key: 'eventTime',
                  label: t('colEventTime') || 'Time',
                  render: (row) => (
                    <span className="text-xs text-[var(--ink-soft)]">
                      {formatDate(row.eventTime || row.createdAt, language)}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  label: t('actions') || 'Actions',
                  render: (row) => (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedEvent(row)}
                        title={t('inspectEventBtn') || 'Inspect Payload'}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>

                      {row.status === 'FAILED' && canRetry && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRetrySingle(row.id)}
                          disabled={retryingId === row.id}
                          title={t('retryEventBtn') || 'Retry'}
                        >
                          <RotateCcw className={`h-3 w-3 ${retryingId === row.id ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* TAB 2: TEST EVENTS RUNNER */}
      {activeTab === 'test' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Dispatch Form */}
          <Card padded>
            <div className="border-b border-[var(--line)] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                <Send className="h-4 w-4 text-[var(--purple)]" />
                {t('testEventTitle') || 'Send Immediate Test Event to Meta CAPI'}
              </h3>
              <p className="text-xs text-[var(--ink-soft)] mt-1">
                {t('testEventDesc') || 'Send test events to inspect in real-time within Meta Events Manager.'}
              </p>
            </div>

            <form onSubmit={handleSendTestEvent} className="space-y-4">
              <Select
                label={t('selectEventLabel') || 'Test Event Type'}
                value={testEventName}
                onChange={(e) => setTestEventName(e.target.value)}
              >
                <option value="PageView">PageView</option>
                <option value="ViewContent">ViewContent</option>
                <option value="AddToCart">AddToCart</option>
                <option value="InitiateCheckout">InitiateCheckout</option>
                <option value="Purchase">Purchase</option>
              </Select>

              <Input
                label={t('testEventCodeLabel') || 'Test Event Code'}
                placeholder="e.g. TEST12345"
                value={testEventCode}
                onChange={(e) => setTestEventCode(e.target.value)}
                hint="From Meta Events Manager > Test Events tab (optional)"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={t('emailLabel') || 'Customer Email'}
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <Input
                  label={t('phoneLabel') || 'Customer Phone'}
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>

              <Input
                label={t('colEventValue') || 'Value (MAD)'}
                type="number"
                step="0.01"
                value={testValue}
                onChange={(e) => setTestValue(e.target.value)}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center"
                  disabled={testSending}
                >
                  <Send className={`h-4 w-4 ${testSending ? 'animate-bounce' : ''}`} />
                  <span>{testSending ? (t('sendingTestEvent') || 'Sending…') : (t('sendTestEventBtn') || 'Send Test Event Now')}</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* Test Event Response Output */}
          <Card padded className="bg-[var(--card)] flex flex-col justify-between">
            <div>
              <div className="border-b border-[var(--line)] pb-3 mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-[var(--green)]" />
                  {t('metaResponseSection') || 'Meta Server Response'}
                </h3>
                {testResponse && (
                  <Badge kind={testResponse.success ? 'ok' : 'danger'}>
                    {testResponse.success ? 'HTTP 200 OK' : 'FAILED'}
                  </Badge>
                )}
              </div>

              {testResponse ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)] text-xs font-mono space-y-1">
                    <div><b className="text-[var(--purple)]">Event ID:</b> {testResponse.testEventId}</div>
                    <div><b className="text-[var(--green)]">fbtrace_id:</b> {testResponse.fbtrace_id || '—'}</div>
                    <div><b className="text-[var(--ink)]">Events Received:</b> {testResponse.events_received || 1}</div>
                    <div><b className="text-[var(--ink)]">Status:</b> {testResponse.status}</div>
                  </div>

                  <div className="p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)] overflow-x-auto">
                    <pre className="text-[11px] font-mono text-[var(--ink)] whitespace-pre-wrap">
                      {JSON.stringify(testResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-xs text-[var(--ink-soft)]">
                  Fill in the test form and click send to trigger an end-to-end Meta Conversions API request.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Payload Inspector Modal */}
      {selectedEvent && (
        <Modal
          open={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          title={`${t('payloadDetailsTitle') || 'Event Details'} (${selectedEvent.eventName})`}
          width="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Metadata Summary */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)]">
              <div>
                <span className="text-[var(--ink-soft)] block">Event Name</span>
                <b className="text-[var(--ink)] font-mono">{selectedEvent.eventName}</b>
              </div>
              <div>
                <span className="text-[var(--ink-soft)] block">Event ID</span>
                <b className="text-[var(--ink)] font-mono truncate block">{selectedEvent.eventId}</b>
              </div>
              <div>
                <span className="text-[var(--ink-soft)] block">Delivery Status</span>
                <StatusBadge
                  kind={selectedEvent.status === 'SENT' ? 'ok' : selectedEvent.status === 'FAILED' ? 'danger' : 'warn'}
                  label={selectedEvent.status}
                />
              </div>
              <div>
                <span className="text-[var(--ink-soft)] block">Timestamp</span>
                <span className="text-[var(--ink)]">{formatDate(selectedEvent.eventTime || selectedEvent.createdAt, language)}</span>
              </div>
            </div>

            {/* User Data (SHA-256 Hashed) */}
            <div>
              <h4 className="font-bold text-[var(--ink)] mb-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--green)]" />
                {t('userDataSection') || 'User Data (SHA-256 Hashed)'}
              </h4>
              <pre className="p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)] font-mono text-[11px] text-[var(--ink)] overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(selectedEvent.userData || {}, null, 2)}
              </pre>
            </div>

            {/* Custom Data */}
            <div>
              <h4 className="font-bold text-[var(--ink)] mb-1">
                {t('customDataSection') || 'Custom Data & Products'}
              </h4>
              <pre className="p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)] font-mono text-[11px] text-[var(--ink)] overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(selectedEvent.customData || {}, null, 2)}
              </pre>
            </div>

            {/* Meta Response / Error Trace */}
            <div>
              <h4 className="font-bold text-[var(--ink)] mb-1">
                {t('metaResponseSection') || 'Meta Server Response / Error Trace'}
              </h4>
              <pre className="p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)] font-mono text-[11px] text-[var(--ink)] overflow-x-auto whitespace-pre-wrap">
                {selectedEvent.errorMessage
                  ? selectedEvent.errorMessage
                  : JSON.stringify(selectedEvent.response || { status: selectedEvent.status }, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
