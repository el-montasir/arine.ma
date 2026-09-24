import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, Truck } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, getAvailability } from '../lib/format.js'
import { getImageUrl } from '../lib/images.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

const AVAILABILITY_KEYS = ['in-stock', 'out-of-stock', 'pre-order']

export default function Products() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { data: products, loading, error, reload } = useFetch('/products')
  const { data: categories = [] } = useFetch('/categories')

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [availability, setAvailability] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const rows = useMemo(() => {
    if (!products) return []
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (category && String(p.categoryId) !== String(category)) return false
      if (availability && p.availability !== availability) return false
      if (q && !(`${p.title} ${p.author} ${p.category || ''}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [products, search, category, availability])

  async function confirmDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await api.del(`/products/${toDelete.id}`)
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
      label: t('colBook'),
      render: (r) => {
        const imgCount = Array.isArray(r.images) ? r.images.length : r.image ? 1 : 0
        return (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {r.image ? (
                <img src={getImageUrl(r.image)} alt="" className="h-11 w-8 rounded-[6px] object-cover border border-[var(--line)]" loading="lazy" />
              ) : (
                <span className="grid h-11 w-8 place-items-center rounded-[6px] bg-[var(--bg)] border border-[var(--line)] text-[10px] text-[var(--ink-soft)]">—</span>
              )}
              {imgCount > 1 && (
                <span className="absolute -bottom-1 -start-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--purple)] text-[9px] font-bold text-white shadow">
                  {imgCount}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-[var(--ink)]">{r.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs text-[var(--ink-soft)]">{r.author}</span>
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
    { key: 'category', label: t('colCategory'), render: (r) => <span className="text-xs font-medium text-[var(--ink-soft)]">{r.category}</span> },
    { key: 'price', label: t('colPrice'), render: (r) => <span className="tabular-nums font-bold text-[var(--ink)]">{formatMoney(r.price, language)}</span> },
    { key: 'costPrice', label: t('colCostPrice'), render: (r) => <span className="tabular-nums text-xs text-[var(--ink-soft)]">{r.costPrice != null ? formatMoney(r.costPrice, language) : '—'}</span> },
    {
      key: 'profitPerUnit',
      label: t('colProfit'),
      render: (r) =>
        r.profitPerUnit == null ? (
          <span className="text-xs text-[var(--ink-soft)]">—</span>
        ) : (
          <span className={`tabular-nums font-bold text-xs ${r.profitPerUnit < 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>{formatMoney(r.profitPerUnit, language)}</span>
        ),
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
              navigate(`/products/${r.id}/edit`)
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
        title={t('productsTitle')}
        subtitle={`${rows.length} ${t('productsCount')} ${products ? products.length : 0}`}
        actions={
          <Button variant="primary" onClick={() => navigate('/products/new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('addProductBtn')}
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
            placeholder={t('searchProductsPlaceholder')}
            aria-label={t('search')}
            className="w-60 rounded-[10px] border border-[var(--line)] bg-[var(--card)] py-2 pe-3 ps-9 text-xs text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--purple)] focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t('filterByCategory')}
          className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
        >
          <option value="">{t('filterByCategory')}</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
          onRowClick={(r) => navigate(`/products/${r.id}/edit`)}
        />
      </Card>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title={t('deleteBookTitle')}>
        <p className="text-xs text-[var(--ink-soft)]">
          {t('deleteBookConfirm')} <strong className="text-[var(--ink)] font-semibold">{toDelete?.title}</strong>? {t('deleteBookWarning')}
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
