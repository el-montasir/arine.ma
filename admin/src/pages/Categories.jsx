import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatNumber } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'

const blank = { name: '', slug: '' }

export default function Categories() {
  const { data: categories, loading, error, reload } = useFetch('/categories')
  const [modal, setModal] = useState(null) // {mode:'create'} | {mode:'edit', row}
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [toDelete, setToDelete] = useState(null)

  function openCreate() {
    setForm(blank)
    setFormError('')
    setModal({ mode: 'create' })
  }
  function openEdit(row) {
    setForm({ name: row.name, slug: row.slug })
    setFormError('')
    setModal({ mode: 'edit', row })
  }

  async function save() {
    setBusy(true)
    setFormError('')
    try {
      if (modal.mode === 'create') {
        await api.post('/categories', { name: form.name.trim(), slug: form.slug.trim() || undefined })
      } else {
        await api.put(`/categories/${modal.row.id}`, { name: form.name.trim(), slug: form.slug.trim() || undefined })
      }
      setModal(null)
      reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    setBusy(true)
    setActionError('')
    try {
      await api.del(`/categories/${toDelete.id}`)
      setToDelete(null)
      reload()
    } catch (err) {
      setActionError(err.message)
      setToDelete(null)
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    { key: 'name', label: 'اسم التصنيف', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'slug', label: 'الرابط', render: (r) => <span dir="ltr" className="text-xs text-[#8b80a8]">{r.slug}</span> },
    { key: 'count', label: 'عدد الكتب', render: (r) => <span className="tabular-nums">{formatNumber(r.count)}</span> },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(r)} aria-label="تعديل" className="rounded-md p-1.5 text-[#a79cc4] hover:bg-surface-700 hover:text-white">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setToDelete(r)} aria-label="حذف" className="rounded-md p-1.5 text-[#a79cc4] hover:bg-danger-400/15 hover:text-danger-400">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="التصنيفات"
        subtitle="حذف تصنيف يحتوي على كتب غير ممكن — انقل الكتب أولاً"
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            تصنيف جديد
          </Button>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}
      {actionError ? <ErrorBanner message={actionError} onDismiss={() => setActionError('')} /> : null}
      <Card padded={false}>
        <Table columns={columns} rows={categories || []} rowKey={(r) => r.id} loading={loading} empty="لا توجد تصنيفات" />
      </Card>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'تعديل التصنيف' : 'تصنيف جديد'}>
        <div className="space-y-4">
          {formError ? <ErrorBanner message={formError} /> : null}
          <Input label="الاسم *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input
            label="الرابط (اختياري)"
            hint="يُولَّد تلقائياً من الاسم إن تُرك فارغاً"
            dir="ltr"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(null)}>إلغاء</Button>
          <Button variant="primary" onClick={save} disabled={busy || !form.name.trim()}>{busy ? 'جارِ الحفظ…' : 'حفظ'}</Button>
        </div>
      </Modal>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="حذف التصنيف">
        <p className="text-sm text-[#d9d1e9]">
          هل تريد حذف تصنيف <strong>{toDelete?.name}</strong>؟
          {toDelete && toDelete.count > 0 ? (
            <span className="mt-2 block text-xs text-warn-400">
              يحتوي على {toDelete.count} كتاب — يجب نقلها إلى تصنيف آخر أولاً.
            </span>
          ) : null}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)}>إلغاء</Button>
          <Button variant="danger" onClick={confirmDelete} disabled={busy || (toDelete && toDelete.count > 0)}>
            حذف
          </Button>
        </div>
      </Modal>
    </div>
  )
}