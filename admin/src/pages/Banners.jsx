import { useState } from 'react'
import { Plus, Edit2, Trash2, Megaphone, Eye, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import { Badge, StatusBadge } from '../components/ui/Badge.jsx'

const EMPTY_BANNER = {
  title: '',
  description: '',
  image: '',
  link: '',
  type: 'promotional',
  isActive: true,
  sortOrder: '0',
  startDate: '',
  endDate: '',
}

export default function Banners() {
  const { data: banners = [], loading, error, reload } = useFetch('/banners')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [form, setForm] = useState(EMPTY_BANNER)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [filterType, setFilterType] = useState('all')

  const openCreateModal = () => {
    setEditingBanner(null)
    setForm(EMPTY_BANNER)
    setFormError('')
    setModalOpen(true)
  }

  const openEditModal = (banner) => {
    setEditingBanner(banner)
    setForm({
      title: banner.title || '',
      description: banner.description || '',
      image: banner.image || '',
      link: banner.link || '',
      type: banner.type || 'promotional',
      isActive: Boolean(banner.isActive),
      sortOrder: String(banner.sortOrder ?? 0),
      startDate: banner.startDate ? banner.startDate.slice(0, 10) : '',
      endDate: banner.endDate ? banner.endDate.slice(0, 10) : '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const openDeleteModal = (id) => {
    setDeletingId(id)
    setDeleteModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setFormError('يرجى إدخال عنوان العرض أو البنر')
      return
    }

    setBusy(true)
    setFormError('')

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      image: form.image.trim() || null,
      link: form.link.trim() || null,
      type: form.type,
      isActive: Boolean(form.isActive),
      sortOrder: Number(form.sortOrder) || 0,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    }

    try {
      if (editingBanner) {
        await api.put(`/banners/${editingBanner.id}`, payload)
      } else {
        await api.post('/banners', payload)
      }
      setModalOpen(false)
      reload()
    } catch (err) {
      setFormError(err.message || 'فشل حفظ بيانات البنر')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setBusy(true)
    try {
      await api.del(`/banners/${deletingId}`)
      setDeleteModalOpen(false)
      setDeletingId(null)
      reload()
    } catch (err) {
      alert(err.message || 'تعذر حذف البنر')
    } finally {
      setBusy(false)
    }
  }

  const filteredBanners = (banners || []).filter((b) => {
    if (filterType === 'all') return true
    return b.type === filterType
  })

  const columns = [
    {
      key: 'image',
      label: 'المعاينة',
      render: (b) => (
        <div className="h-14 w-24 overflow-hidden rounded-lg bg-surface-900 border border-line/60 flex items-center justify-center">
          {b.image ? (
            <img
              src={b.image}
              alt={b.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://placehold.co/100x60/211839/a78bfa?text=No+Image'
              }}
            />
          ) : (
            <Megaphone className="h-5 w-5 text-[#8b80a8]" />
          )}
        </div>
      ),
    },
    {
      key: 'title',
      label: 'العنوان والتفاصيل',
      render: (b) => (
        <div className="space-y-1 max-w-xs">
          <p className="font-semibold text-white text-sm">{b.title}</p>
          {b.description && (
            <p className="text-xs text-[#8b80a8] line-clamp-1">{b.description}</p>
          )}
          {b.link && (
            <a
              href={b.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-brand-400 hover:underline"
              dir="ltr"
            >
              <ExternalLink className="h-3 w-3" />
              {b.link}
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'النوع',
      render: (b) => {
        if (b.type === 'hero') return <Badge kind="brand">بنر رئيسي (Hero)</Badge>
        if (b.type === 'featured') return <Badge kind="purple">عرض مميز</Badge>
        return <Badge kind="neutral">عرض ترويجي</Badge>
      },
    },
    {
      key: 'sortOrder',
      label: 'الترتيب',
      render: (b) => <span className="font-mono text-xs text-white">#{b.sortOrder}</span>,
    },
    {
      key: 'isActive',
      label: 'الحالة',
      render: (b) => (
        <StatusBadge
          kind={b.isActive ? 'ok' : 'neutral'}
          label={b.isActive ? 'مفعّل ونشط' : 'معطّل'}
        />
      ),
    },
    {
      key: 'dates',
      label: 'الفترة الزمنية',
      render: (b) => (
        <div className="text-[11px] text-[#8b80a8] space-y-0.5 font-mono">
          {b.startDate ? (
            <div>من: {new Date(b.startDate).toLocaleDateString('ar-MA')}</div>
          ) : null}
          {b.endDate ? (
            <div>إلى: {new Date(b.endDate).toLocaleDateString('ar-MA')}</div>
          ) : null}
          {!b.startDate && !b.endDate && <span>دائم (بلا انتهاء)</span>}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (b) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openEditModal(b)}
            className="rounded-lg border border-line bg-surface-800/80 p-1.5 text-[#a79cc4] transition-colors hover:bg-surface-700 hover:text-white"
            title="تعديل العرض"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openDeleteModal(b.id)}
            className="rounded-lg border border-danger-900/40 bg-danger-950/30 p-1.5 text-danger-400 transition-colors hover:bg-danger-900/50 hover:text-danger-300"
            title="حذف العرض"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="العروض والبنرات الترويجية"
        subtitle="إدارة البنرات الإعلانية، العروض الخاصة، والتخفيضات التي تظهر في الصفحة الرئيسية للمتجر"
        actions={
          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            إضافة عرض أو بنر
          </Button>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            filterType === 'all'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'border border-line bg-surface-800 text-[#a79cc4] hover:text-white'
          }`}
        >
          جميع العروض ({banners.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('promotional')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            filterType === 'promotional'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'border border-line bg-surface-800 text-[#a79cc4] hover:text-white'
          }`}
        >
          عروض ترويجية
        </button>
        <button
          type="button"
          onClick={() => setFilterType('hero')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            filterType === 'hero'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'border border-line bg-surface-800 text-[#a79cc4] hover:text-white'
          }`}
        >
          بنرات الواجهة (Hero)
        </button>
        <button
          type="button"
          onClick={() => setFilterType('featured')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            filterType === 'featured'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'border border-line bg-surface-800 text-[#a79cc4] hover:text-white'
          }`}
        >
          عروض مميزة
        </button>
      </div>

      {/* Table */}
      <Card padded={false}>
        <Table
          columns={columns}
          rows={filteredBanners}
          rowKey={(b) => b.id}
          loading={loading}
          empty="لا توجد عروض أو بنرات مسجلة في هذا القسم"
        />
      </Card>

      {/* Modal for Create/Edit */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBanner ? 'تعديل العرض الترويجي' : 'إضافة عرض / بنر جديد'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}

          <Input
            label="عنوان العرض *"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="مثال: خصم 20% على كتب التفسير والحديث"
            required
          />

          <Textarea
            label="الوصف أو الشرح التفصيلي"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="شرح موجز عن العرض أو كود الخصم…"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="نوع البنر *"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="promotional">عرض ترويجي (Promotional)</option>
              <option value="hero">بنر واجهة المتجر (Hero Banner)</option>
              <option value="featured">عرض كتاب مميز (Featured)</option>
            </Select>

            <Input
              label="ترتيب العرض (Sort Order)"
              type="number"
              min="0"
              step="1"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              placeholder="0"
            />
          </div>

          <Input
            label="رابط صورة البنر (Image URL)"
            dir="ltr"
            value={form.image}
            onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
            placeholder="https://example.com/banner.jpg"
          />

          <Input
            label="الرابط المستهدف عند النقر (Link URL)"
            dir="ltr"
            value={form.link}
            onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            placeholder="/category/tafsir أو https://..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="تاريخ البدء (اختياري)"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
            <Input
              label="تاريخ الانتهاء (اختياري)"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-line bg-surface-800 text-brand-600 accent-brand-600"
              />
              تفعيل هذا البنر وظهوره في المتجر حالياً
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'جارِ الحفظ…' : editingBanner ? 'حفظ التعديلات' : 'إضافة العرض'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="تأكيد حذف العرض"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#e3dcf0]">
            هل أنت متأكد من رغبتك في حذف هذا البنر؟ لن يظهر مجدداً في المتجر.
          </p>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              className="bg-danger-600 hover:bg-danger-500"
              onClick={handleDelete}
              disabled={busy}
            >
              {busy ? 'جارِ الحذف…' : 'نعم، احذف العرض'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
