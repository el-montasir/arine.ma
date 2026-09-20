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
import { useLanguage } from '../context/LanguageContext.jsx'

const DEFAULT_COLOR = '#6366f1'
const blank = { name: '', slug: '', color: DEFAULT_COLOR }

const COLOR_PRESETS = [
  '#6366f1', // Indigo (Brand default)
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#64748b', // Slate
]

export default function Categories() {
  const { t } = useLanguage()
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
    setForm({ name: row.name, slug: row.slug, color: row.color || DEFAULT_COLOR })
    setFormError('')
    setModal({ mode: 'edit', row })
  }

  async function save() {
    setBusy(true)
    setFormError('')
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        color: form.color?.trim() || DEFAULT_COLOR,
      }
      if (modal.mode === 'create') {
        await api.post('/categories', payload)
      } else {
        await api.put(`/categories/${modal.row.id}`, payload)
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
    {
      key: 'name',
      label: t('categoryName'),
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span
            className="h-4 w-4 shrink-0 rounded-full border border-black/10 shadow-sm"
            style={{ backgroundColor: r.color || DEFAULT_COLOR }}
            title={r.color || DEFAULT_COLOR}
          />
          <span className="font-semibold text-[var(--ink)]">{r.name}</span>
        </div>
      ),
    },
    {
      key: 'color',
      label: t('categoryColor'),
      render: (r) => (
        <div className="flex items-center gap-2 font-mono text-xs text-[var(--ink-soft)]">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: r.color || DEFAULT_COLOR }}
          />
          <span>{r.color || DEFAULT_COLOR}</span>
        </div>
      ),
    },
    { key: 'slug', label: t('categorySlug'), render: (r) => <span dir="ltr" className="text-xs text-[var(--ink-soft)]">{r.slug}</span> },
    { key: 'count', label: t('categoryProductsCount'), render: (r) => <span className="tabular-nums font-semibold text-[var(--ink)]">{formatNumber(r.count)}</span> },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(r)} aria-label={t('edit')} className="rounded-[8px] p-1.5 text-[var(--ink-soft)] hover:bg-[var(--bg)] hover:text-[var(--ink)] transition-colors cursor-pointer">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setToDelete(r)} aria-label={t('delete')} className="rounded-[8px] p-1.5 text-[var(--ink-soft)] hover:bg-[var(--red-bg)] hover:text-[var(--red)] transition-colors cursor-pointer">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('categoriesTitle')}
        subtitle={t('categorySubtitleWarning')}
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('addCategoryBtn')}
          </Button>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}
      {actionError ? <ErrorBanner message={actionError} onDismiss={() => setActionError('')} /> : null}
      <Card padded={false}>
        <Table columns={columns} rows={categories || []} rowKey={(r) => r.id} loading={loading} empty={t('noCategories')} />
      </Card>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? t('editCategoryTitle') : t('addCategoryBtn')}>
        <div className="space-y-4">
          {formError ? <ErrorBanner message={formError} /> : null}
          <Input label={`${t('categoryName')} *`} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('categoryNamePlaceholder')} required />
          <Input
            label={t('categorySlug')}
            hint={t('categorySlugHint')}
            dir="ltr"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder={t('categorySlugPlaceholder')}
          />

          {/* Category Color Picker */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[var(--ink)]">
              {t('categoryColor')}
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--card)] transition-colors hover:border-[var(--purple)]">
                <input
                  type="color"
                  value={form.color || DEFAULT_COLOR}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <div
                  className="h-6 w-6 rounded-[6px] border border-black/10 shadow-inner"
                  style={{ backgroundColor: form.color || DEFAULT_COLOR }}
                />
              </div>

              <input
                type="text"
                dir="ltr"
                value={form.color || DEFAULT_COLOR}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                placeholder="#6366f1"
                className="w-32 rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-center font-mono text-xs uppercase text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
              />

              <div
                className="flex items-center gap-1.5 rounded-[10px] border px-3 py-2 text-xs font-semibold"
                style={{
                  backgroundColor: `${form.color || DEFAULT_COLOR}1a`,
                  color: form.color || DEFAULT_COLOR,
                  borderColor: `${form.color || DEFAULT_COLOR}40`,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: form.color || DEFAULT_COLOR }}
                />
                <span>{form.name || t('preview')}</span>
              </div>
            </div>

            {/* Color Presets */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {COLOR_PRESETS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: hex }))}
                  className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 cursor-pointer ${
                    form.color?.toLowerCase() === hex.toLowerCase()
                      ? 'ring-2 ring-[var(--purple)] ring-offset-2 ring-offset-[var(--card)] border-white'
                      : 'border-black/10'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-[var(--ink-soft)]">{t('categoryColorHint')}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(null)}>{t('cancel')}</Button>
          <Button variant="primary" onClick={save} disabled={busy || !form.name.trim()}>{busy ? t('saving') : t('save')}</Button>
        </div>
      </Modal>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title={t('deleteCategoryTitle')}>
        <p className="text-xs text-[var(--ink-soft)]">
          {t('deleteCategoryConfirm')} <strong className="text-[var(--ink)] font-semibold">{toDelete?.name}</strong>?
          {toDelete && toDelete.count > 0 ? (
            <span className="mt-2 block text-xs text-[var(--orange)] font-medium">
              {t('deleteCategoryWarningHasBooks', { count: toDelete.count })}
            </span>
          ) : null}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)}>{t('cancel')}</Button>
          <Button variant="danger" onClick={confirmDelete} disabled={busy || (toDelete && toDelete.count > 0)}>
            {t('delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
