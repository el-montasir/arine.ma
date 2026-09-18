import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, Truck, Package as PackageIcon, BookOpen } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatBookCount, AVAILABILITY } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

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
      label: t('colPackage') || 'الباقة',
      render: (r) => {
        const imgCount = Array.isArray(r.images) ? r.images.length : r.image ? 1 : 0
        const booksCount = r.booksCount || (r.books ? r.books.length : 0)
        return (
          <div className="flex items-center gap-3">
            <div className="relative">
              {r.image ? (
                <img src={r.image} alt="" className="h-11 w-10 rounded-lg object-cover border border-line" loading="lazy" />
              ) : (
                <span className="grid h-11 w-10 place-items-center rounded-lg bg-surface-800 text-brand-400 border border-line">
                  <PackageIcon className="h-5 w-5" />
                </span>
              )}
              {imgCount > 1 && (
                <span className="absolute -bottom-1 -start-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[9px] font-bold text-white shadow">
                  {imgCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-[#f2eefb]">{r.title}</p>
                {r.isNew && (
                  <span className="text-[10px] font-bold text-brand-400 bg-brand-950/80 px-1.5 py-0.5 rounded border border-brand-800/60">
                    جديد
                  </span>
                )}
                {r.isPopular && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60">
                    الأكثر طلباً
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs text-[#8b80a8]">
                  <BookOpen className="h-3 w-3 text-brand-400" />
                  {formatBookCount(booksCount, language)}
                </span>
                {r.shippingMode === 'free' && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-ok-400 bg-ok-950/60 px-1.5 py-0.2 rounded border border-ok-900/60">
                    <Truck className="h-2.5 w-2.5" />
                    {t('freeShippingBadge') || 'شحن مجاني'}
                  </span>
                )}
                {r.shippingMode === 'custom' && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-brand-400 bg-brand-950/60 px-1.5 py-0.2 rounded border border-brand-900/60">
                    <Truck className="h-2.5 w-2.5" />
                    {t('customShippingBadge') || 'شحن مخصص'} ({r.customShipping} {t('currency') || 'د.م'})
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
      label: t('colIncludedBooks') || 'الكتب المضمنة',
      render: (r) => {
        const booksList = r.books || []
        if (booksList.length === 0) {
          return <span className="text-xs text-[#6f6488]">—</span>
        }
        const remaining = booksList.length - 2
        return (
          <div className="max-w-xs space-y-0.5">
            {booksList.slice(0, 2).map((b, idx) => (
              <p key={idx} className="text-xs text-[#d9d1e9] truncate flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-brand-400 shrink-0" />
                <span className="truncate">{b.title}</span>
              </p>
            ))}
            {remaining > 0 && (
              <p className="text-[11px] text-brand-400 font-medium">
                +{formatBookCount(remaining, language)} {language === 'ar' ? 'أخرى…' : 'more…'}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: 'price',
      label: t('colPrice') || 'سعر البيع',
      render: (r) => (
        <div>
          <span className="tabular-nums font-semibold text-white">{formatMoney(r.price)}</span>
          {r.oldPrice && r.oldPrice > r.price && (
            <span className="block text-[11px] text-[#6f6488] line-through tabular-nums">
              {formatMoney(r.oldPrice)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'costPrice',
      label: t('colCostPrice') || 'سعر الشراء',
      render: (r) => (
        <span className="tabular-nums text-[#a79cc4]">
          {r.costPrice != null ? formatMoney(r.costPrice) : '—'}
        </span>
      ),
    },
    {
      key: 'profit',
      label: t('packageProfit') || 'ربح الباقة',
      render: (r) => {
        const profit = r.profit != null ? r.profit : (r.costPrice != null ? r.price - r.costPrice : null)
        return profit == null ? (
          <span className="text-xs text-[#6f6488]">—</span>
        ) : (
          <span className={`tabular-nums font-medium ${profit < 0 ? 'text-danger-400' : 'text-ok-400'}`}>
            {formatMoney(profit)}
          </span>
        )
      },
    },
    {
      key: 'availability',
      label: t('colStock') || 'التوفر',
      render: (r) => (
        <Badge kind={AVAILABILITY[r.availability]?.color || 'neutral'}>
          {AVAILABILITY[r.availability]?.label || r.availability}
        </Badge>
      ),
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
            aria-label={t('edit') || 'تعديل'}
            className="rounded-md p-1.5 text-[#a79cc4] hover:bg-surface-700 hover:text-white"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDeleteError('')
              setToDelete(r)
            }}
            aria-label={t('delete') || 'حذف'}
            className="rounded-md p-1.5 text-[#a79cc4] hover:bg-danger-400/15 hover:text-danger-400"
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
        title={t('packagesTitle') || 'الباقات'}
        subtitle={`${rows.length} ${t('packagesCount') || 'باقة من أصل'} ${packages ? packages.length : 0}`}
        actions={
          <Button variant="primary" onClick={() => navigate('/packages/new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('addPackageBtn') || 'إضافة باقة جديدة'}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-[#6f6488]" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPackagesPlaceholder') || 'بحث بعنوان الباقة أو الكتب المضمنة…'}
            aria-label={t('search') || 'بحث'}
            className="w-72 rounded-lg border border-line bg-ink-900 py-2 pe-3 ps-9 text-sm text-[#f2eefb] placeholder:text-[#6f6488] focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          aria-label={t('filterByAvailability') || 'تصفية حسب التوفر'}
          className="rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
        >
          <option value="">{t('filterByAvailability') || 'كل حالات التوفر'}</option>
          {Object.entries(AVAILABILITY).map(([value, meta]) => (
            <option key={value} value={value}>{meta.label}</option>
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
          empty={t('noData') || 'لا توجد باقات مطابقة'}
          onRowClick={(r) => navigate(`/packages/${r.id}/edit`)}
        />
      </Card>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title={t('deletePackageTitle') || 'حذف الباقة'}>
        <p className="text-sm text-[#d9d1e9]">
          {t('deletePackageConfirm') || 'هل أنت متأكد من حذف باقة'} <strong>{toDelete?.title}</strong>؟ {t('deletePackageWarning') || 'لا يمكن التراجع عن هذا الإجراء.'}
        </p>
        {deleteError ? <div className="mt-3"><ErrorBanner message={deleteError} /></div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)}>{t('cancel') || 'إلغاء'}</Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? (t('saving') || 'جارِ الحذف…') : (t('delete') || 'حذف')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
