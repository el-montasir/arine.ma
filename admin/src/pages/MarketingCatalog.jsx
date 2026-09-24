import { useState, useEffect, useCallback } from 'react'
import {
  Database,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Package,
  Info,
  ExternalLink,
  Layers,
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
import { useAuth } from '../context/AuthContext.jsx'
import { getImageUrl } from '../lib/images.js'

export default function MarketingCatalog() {
  const { t, language } = useLanguage()
  const { can, isOwner } = useAuth()

  const [items, setItems] = useState([])
  const [stats, setStats] = useState({ total: 0, synced: 0, pending: 0, failed: 0 })
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Filters
  const [itemType, setItemType] = useState('ALL')
  const [syncStatus, setSyncStatus] = useState('ALL')
  const [search, setSearch] = useState('')

  const fetchCatalog = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        itemType,
        syncStatus,
        search,
      })
      const res = await api.get(`/marketing/catalog?${query}`)
      setItems(res.data || [])
      if (res.stats) setStats(res.stats)
      if (res.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total,
          totalPages: res.pagination.totalPages,
        }))
      }
    } catch (err) {
      setError(err.message || t('failedToLoadData') || 'Failed to load catalog items')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, itemType, syncStatus, search, t])

  useEffect(() => {
    fetchCatalog()
  }, [fetchCatalog])

  const handleSync = async (scope = 'ALL') => {
    setSyncing(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await api.post('/marketing/catalog/sync', { scope })
      setSuccessMsg(res.message || t('syncSuccess') || 'Catalog items synced with Meta successfully')
      fetchCatalog()
    } catch (err) {
      setError(err.message || t('syncFailed') || 'Failed to sync catalog with Meta')
    } finally {
      setSyncing(false)
    }
  }

  const canSync = isOwner || can('MARKETING_CATALOG_SYNC') || can('MARKETING_MANAGE')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('catalogTitle') || 'Product Catalog & Meta Commerce'}
        subtitle={t('catalogSubtitle') || 'Automatically sync books, packages, and offers with Meta Facebook & Instagram Commerce for Advantage+ Catalog Ads'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canSync && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSync('ALL')}
                  disabled={syncing || loading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? (t('syncingCatalog') || 'Syncing…') : (t('syncAllBtn') || 'Sync Entire Catalog')}</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSync('BOOKS')}
                  disabled={syncing || loading}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{t('syncBooksBtn') || 'Sync Books'}</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSync('PACKAGES')}
                  disabled={syncing || loading}
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>{t('syncPackagesBtn') || 'Sync Packages'}</span>
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchCatalog}
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

      {/* Localhost Notice Banner */}
      <div className="p-4 rounded-[12px] border border-[var(--blue)]/30 bg-[var(--blue)]/10 flex items-start gap-3">
        <Info className="h-4 w-4 text-[var(--blue)] shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-[var(--ink)] block">{t('localImageWarningTitle') || 'Image Synchronization Notice'}</span>
          <p className="text-[var(--ink-soft)] mt-0.5 leading-relaxed">
            {t('localImageWarningDesc') || 'Note: Meta servers require publicly accessible image URLs. In development/localhost mode, catalog metadata is synced and image URLs are resolved relative to the store domain. In production with a public domain, images sync seamlessly.'}
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('statCatalogTotal') || 'Total Catalog Items'}
          value={formatNumber(stats.total || 0)}
          sub="Books & Bundled Packages"
          tone="brand"
          icon={Database}
        />
        <StatCard
          label={t('statCatalogSynced') || 'Synced with Meta'}
          value={formatNumber(stats.synced || 0)}
          sub={`${stats.total > 0 ? Math.round((stats.synced / stats.total) * 100) : 100}% synced`}
          tone="ok"
          icon={CheckCircle2}
        />
        <StatCard
          label={t('statCatalogPending') || 'Pending Sync'}
          value={formatNumber(stats.pending || 0)}
          sub="Ready for next batch"
          tone="warn"
          icon={Layers}
        />
        <StatCard
          label={t('statCatalogFailed') || 'Failed / Issues'}
          value={formatNumber(stats.failed || 0)}
          sub="Items requiring attention"
          tone={stats.failed > 0 ? 'danger' : 'neutral'}
          icon={AlertTriangle}
        />
      </div>

      {/* Filter Bar */}
      <Card padded>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1 relative">
            <Search className="absolute top-2.5 right-3 h-4 w-4 text-[var(--ink-soft)]" />
            <input
              type="text"
              placeholder={t('search') || 'Search items by title or SKU…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCatalog()}
              className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3.5 py-2 text-xs text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--purple)] focus:outline-none"
            />
          </div>

          <Select
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
          >
            <option value="ALL">{t('filterAllResources') || 'All Item Types'}</option>
            <option value="BOOK">{t('typeBook') || 'Books'}</option>
            <option value="PACKAGE">{t('typePackage') || 'Packages'}</option>
          </Select>

          <Select
            value={syncStatus}
            onChange={(e) => setSyncStatus(e.target.value)}
          >
            <option value="ALL">{t('filterAllStatuses') || 'All Sync Statuses'}</option>
            <option value="SYNCED">{t('syncStatusSynced') || 'Synced'}</option>
            <option value="PENDING">{t('syncStatusPending') || 'Pending'}</option>
            <option value="FAILED">{t('syncStatusFailed') || 'Failed'}</option>
          </Select>
        </div>
      </Card>

      {/* Catalog Items Table */}
      <Card padded={false}>
        <Table
          loading={loading}
          empty={t('noData') || 'No catalog items found'}
          rowKey={(r) => r.id}
          rows={items}
          columns={[
            {
              key: 'item',
              label: t('colCatalogItem') || 'Item',
              render: (row) => {
                const item = row.product || row.package || {}
                const title = row.title || item.titleAr || item.titleFr || item.titleEn || item.name || item.title || 'Untitled'
                const image = row.imageUrl || item.coverImage || item.image
                const sku = row.itemId || row.metaItemId || item.sku || row.id
                return (
                  <div className="flex items-center gap-3 py-1">
                    {image ? (
                      <img
                        src={getImageUrl(image)}
                        alt={title}
                        className="h-10 w-8 rounded-[6px] object-cover border border-[var(--line)] bg-[var(--bg)]"
                      />
                    ) : (
                      <div className="h-10 w-8 rounded-[6px] bg-[var(--purple-subtle)] text-[var(--purple)] flex items-center justify-center font-bold text-xs">
                        {row.itemType === 'PACKAGE' ? 'P' : 'B'}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-xs text-[var(--ink)]">{title}</div>
                      <div className="text-[10.5px] font-mono text-[var(--ink-soft)]">
                        SKU: {sku}
                      </div>
                    </div>
                  </div>
                )
              },
            },
            {
              key: 'type',
              label: t('colItemType') || 'Type',
              render: (row) => (
                <Badge kind={row.itemType === 'PACKAGE' ? 'brand' : 'neutral'}>
                  {row.itemType === 'PACKAGE' ? (t('typePackage') || 'Package') : (t('typeBook') || 'Book')}
                </Badge>
              ),
            },
            {
              key: 'price',
              label: t('price') || 'Price',
              render: (row) => {
                const item = row.product || row.package || {}
                const price = typeof row.price === 'number' ? row.price : (item.price ?? 0)
                const comparePrice = row.compareAtPrice || item.compareAtPrice
                return (
                  <div className="text-xs">
                    <span className="font-bold text-[var(--ink)]">{formatMoney(price, language)}</span>
                    {comparePrice && comparePrice > price && (
                      <span className="text-[10px] text-[var(--ink-soft)] line-through block">
                        {formatMoney(comparePrice, language)}
                      </span>
                    )}
                  </div>
                )
              },
            },
            {
              key: 'syncStatus',
              label: t('colSyncStatus') || 'Sync Status',
              render: (row) => (
                <StatusBadge
                  kind={row.syncStatus === 'SYNCED' ? 'ok' : row.syncStatus === 'FAILED' ? 'danger' : 'warn'}
                  label={
                    row.syncStatus === 'SYNCED'
                      ? (t('syncStatusSynced') || 'Synced')
                      : row.syncStatus === 'FAILED'
                      ? (t('syncStatusFailed') || 'Failed')
                      : (t('syncStatusPending') || 'Pending')
                  }
                />
              ),
            },
            {
              key: 'lastSynced',
              label: t('colLastSync') || 'Last Synced',
              render: (row) => (
                <span className="text-xs text-[var(--ink-soft)]">
                  {formatDate(row.lastSyncedAt || row.updatedAt, language)}
                </span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
