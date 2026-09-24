import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, Truck, Package as PackageIcon, BookOpen } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatBookCount, getAvailability } from '../lib/format.js'
import { getImageUrl } from '../lib/images.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

const AVAILABILITY_KEYS = ['in-stock', 'out-of-stock', 'pre_order']

export default function Packages() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { data: packages, loading, error, reload } = useFetch('/packages')

  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const rows = useMemo(() => {
    if (!packages) return []
    const q = search.trim().toLowerCase()
    return packages.filter((pkg) => {
      if (availability && pkg.availability !== availability) return false
      if (q) {
        const bookTitles = (pkg.books || []).map((b) => b.title).join(' ').toLowerCase()
        const matchTitle = (pkg.title || '').toLowerCase().includes(q)
        const matchBooks = bookTitles.includes(q)
        if (!matchTitle && !matchBooks) return false
      }
      return true
    })
  }, [packages, search, availability])

  async function confirmDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await api.del(`/packages/${toDelete.id}`)
      setToDelete(null)
      reload()
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    {
      key: 'title',
      label: t('colPackage'),
      render: (r) => {
        const imgCount = Array.isArray(r.images) ? r.images.length : r.image ? 1 : 0
        const booksCount = r.booksCount || (r.books ? r.books.length : 0)
        return (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {r.image ? (
                <img src={getImageUrl(r.image)} alt="" className="h-11 w-10 rounded-[8px] object-cover border border-[var(--line)]" loading="lazy" />
              ) : (
                <span className="grid h-11 w-10 place-items-center rounded-[8px] bg-[var(--purple-bg)] text-[var(--purple)] border border-[var(--line)]">
                  <PackageIcon className="h-5 w-5" />
                </span>
              )}
              {imgCount > 1 && (
                <span className="absolute -bottom-1 -start-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--purple)] text-[9px] font-bold text-white shadow">
                  {imgCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-[var(--ink)]">{r.title}</p>
                {r.isNew && (
                  <span className="text-[10px] font-bold text-[var(--purple)] bg-[var(--purple-bg)] px-1.5 py-0.5 rounded-[6px] border border-[var(--purple)]/20">
                    {t('badgeNew')}
                  </span>
                )}
                {r.isPopular && (
                  <span className="text-[10px] font-bold text-[var(--orange)] bg-[var(--orange-bg)] px-1.5 py-0.5 rounded-[6px] border border-[var(--orange)]/20">
                    {t('badgePopular')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs text-[var(--ink-soft)]">
                  <BookOpen className="h-3 w-3 text-[var(--purple)]" />
                  {formatBookCount(booksCount, language)}
                </span>
                {r.shippingMode === 'free' && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--green)] bg-[var(--green-bg)] px-1.5 py-0.5 rounded-[6px] border border-[var(--green)]/20">
                    <Truck className="h-2.5 w-2.5" />
                    {t('freeShippingBadge')}
                  </span>
                )}
                {r.shippingMode === 'custom' && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--purple)] bg-[var(--purple-bg)] px-1.5 py-0.5 rounded-[6px] border border-[var(--purple)]/20">
                    <Truck className="h-2.5 w-2.5" />
                    {t('customShippingBadge')} ({formatMoney(r.customShipping, language)})
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'books',
      label: t('colIncludedBooks'),
      render: (r) => {
        const booksList = r.books || []
        if (booksList.length === 0) {
          return <span className="text-xs text-[var(--ink-soft)]">—</span>
        }
        const remaining = booksList.length - 2
        return (
          <div className="max-w-xs space-y-0.5">
            {booksList.slice(0, 2).map((b, idx) => (
              <p key={idx} className="text-xs text-[var(--ink)] truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple)] shrink-0" />
                <span className="truncate">{b.title}</span>
              </p>
            ))}
            {remaining > 0 && (
              <p className="text-[11px] text-[var(--purple)] font-semibold">
                +{formatBookCount(remaining, language)} {t('moreBooks')}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: 'price',
      label: t('colPrice'),
      render: (r) => (
        <div>
          <span className="tabular-nums font-bold text-[var(--ink)]">{formatMoney(r.price, language)}</span>
          {r.oldPrice && r.oldPrice > r.price && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-[var(--ink-soft)] line-through tabular-nums">
                {formatMoney(r.oldPrice, language)}
              </span>
              {Number.isFinite(r.discount) && r.discount > 0 && (
                <span className="text-[10px] font-bold text-[var(--purple)] bg-[var(--purple-bg)] px-1.5 py-0.2 rounded border border-[var(--purple)]/20">
                  -{Math.round(r.discount)}%
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'costPrice',
      label: t('colCostPrice'),
      render: (r) => (
        <span className="tabular-nums text-xs text-[var(--ink-soft)]">
          {r.costPrice != null ? formatMoney(r.costPrice, language) : '—'}
        </span>
      ),
    },
    {
      key: 'profit',
      label: t('packageProfit'),
      render: (r) => {
        const profit = r.profit != null ? r.profit : (r.costPrice != null ? r.price - r.costPrice : null)
        return profit == null ? (
          <span className="text-xs text-[var(--ink-soft)]">—</span>
        ) : (
          <span className={`tabular-nums font-bold text-xs ${profit < 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>
            {formatMoney(profit, language)}
          </span>
        )
      },
    },
    {
      key: 'availability',
      label: t('colStock'),
      render: (r) => {
        const meta = getAvailability(r.availability, t)
        return <Badge kind={meta.color}>{meta.label}</Badge>
      },
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/packages/${r.id}/edit`)
            }}
            aria-label={t('edit')}
            className="rounded-[8px] p-1.5 text-[var(--ink-soft)] hover:bg-[var(--bg)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDeleteError('')
              setToDelete(r)
            }}
            aria-label={t('delete')}
            className="rounded-[8px] p-1.5 text-[var(--ink-soft)] hover:bg-[var(--red-bg)] hover:text-[var(--red)] transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('packagesTitle')}
        subtitle={`${rows.length} ${t('packagesCount')} ${packages ? packages.length : 0}`}
        actions={
          <Button variant="primary" onClick={() => navigate('/packages/new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('addPackageBtn')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-[var(--ink-soft)]" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPackagesPlaceholder')}
            aria-label={t('search')}
            className="w-72 rounded-[10px] border border-[var(--line)] bg-[var(--card)] py-2 pe-3 ps-9 text-xs text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--purple)] focus:outline-none"
          />
        </div>
        <select
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          aria-label={t('filterByAvailability')}
          className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
        >
          <option value="">{t('filterByAvailability')}</option>
          {AVAILABILITY_KEYS.map((value) => (
            <option key={value} value={value}>{getAvailability(value, t).label}</option>
          ))}
        </select>
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      <Card padded={false}>
        <Table
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          empty={t('noData')}
          onRowClick={(r) => navigate(`/packages/${r.id}/edit`)}
        />
      </Card>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title={t('deletePackageTitle')}>
        <p className="text-xs text-[var(--ink-soft)]">
          {t('deletePackageConfirm')} <strong className="text-[var(--ink)] font-semibold">{toDelete?.title}</strong>? {t('deletePackageWarning')}
        </p>
        {deleteError ? <div className="mt-3"><ErrorBanner message={deleteError} /></div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)}>{t('cancel')}</Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? t('saving') : t('delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
