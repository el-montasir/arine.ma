import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, AVAILABILITY } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'

export default function Products() {
  const navigate = useNavigate()
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
      label: 'الكتاب',
      render: (r) => (
        <div className="flex items-center gap-3">
          {r.image ? (
            <img src={r.image} alt="" className="h-11 w-8 rounded object-cover" loading="lazy" />
          ) : (
            <span className="grid h-11 w-8 place-items-center rounded bg-surface-800 text-[10px] text-[#6f6488]">—</span>
          )}
          <div>
            <p className="font-medium text-[#f2eefb]">{r.title}</p>
            <p className="text-xs text-[#8b80a8]">{r.author}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', label: 'التصنيف', render: (r) => <span className="text-xs">{r.category}</span> },
    { key: 'price', label: 'سعر البيع', render: (r) => <span className="tabular-nums">{formatMoney(r.price)}</span> },
    { key: 'costPrice', label: 'سعر الشراء', render: (r) => <span className="tabular-nums text-[#a79cc4]">{formatMoney(r.costPrice)}</span> },
    {
      key: 'profitPerUnit',
      label: 'ربح الوحدة',
      render: (r) =>
        r.profitPerUnit == null ? (
          <span className="text-xs text-[#6f6488]">—</span>
        ) : (
          <span className={`tabular-nums ${r.profitPerUnit < 0 ? 'text-danger-400' : 'text-ok-400'}`}>{formatMoney(r.profitPerUnit)}</span>
        ),
    },
    {
      key: 'availability',
      label: 'التوفر',
      render: (r) => <Badge kind={AVAILABILITY[r.availability]?.color || 'neutral'}>{AVAILABILITY[r.availability]?.label || r.availability}</Badge>,
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
            aria-label="تعديل"
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
            aria-label="حذف"
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
        title="الكتب"
        subtitle={`${rows.length} كتاب من أصل ${products ? products.length : 0}`}
        actions={
          <Button variant="primary" onClick={() => navigate('/products/new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            إضافة كتاب
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
            placeholder="بحث بالعنوان أو المؤلف…"
            aria-label="بحث في الكتب"
            className="w-60 rounded-lg border border-line bg-ink-900 py-2 pe-3 ps-9 text-sm text-[#f2eefb] placeholder:text-[#6f6488] focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="تصفية حسب التصنيف"
          className="rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
        >
          <option value="">كل التصنيفات</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          aria-label="تصفية حسب التوفر"
          className="rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
        >
          <option value="">كل حالات التوفر</option>
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
          empty="لا توجد كتب مطابقة"
          onRowClick={(r) => navigate(`/products/${r.id}/edit`)}
        />
      </Card>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="حذف الكتاب">
        <p className="text-sm text-[#d9d1e9]">
          هل تريد حذف كتاب <strong>{toDelete?.title}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
        </p>
        {deleteError ? <div className="mt-3"><ErrorBanner message={deleteError} /></div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)}>إلغاء</Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'جارِ الحذف…' : 'حذف'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}