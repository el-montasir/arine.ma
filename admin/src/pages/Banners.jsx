import { useState, useRef } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Megaphone,
  ExternalLink,
  UploadCloud,
  Loader2,
  AlertCircle,
  Eye,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatDateShort } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import { Badge, StatusBadge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

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

function safeIsoDate(val) {
  if (!val || typeof val !== 'string') return null
  const trimmed = val.trim()
  if (!trimmed) return null
  const d = new Date(trimmed)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export default function Banners() {
  const { t, language } = useLanguage()
  const { data: rawData, loading, error, reload } = useFetch('/banners')
  const fileInputRef = useRef(null)

  const banners = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.data) ? rawData.data : [])

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [form, setForm] = useState(EMPTY_BANNER)
  const [busy, setBusy] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formError, setFormError] = useState('')
  const [imageError, setImageError] = useState('')
  const [filterType, setFilterType] = useState('all')

  const openCreateModal = () => {
    setEditingBanner(null)
    setForm(EMPTY_BANNER)
    setFormError('')
    setImageError('')
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
    setImageError('')
    setModalOpen(true)
  }

  const openDeleteModal = (id) => {
    setDeletingId(id)
    setDeleteModalOpen(true)
  }

  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageError('')
    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      setImageError(t('errFileType'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError(t('errFileSize'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await api.upload('/uploads/branding', formData)
      const uploadedUrl = res?.data?.url || res?.files?.[0]?.url || res?.url

      if (!uploadedUrl) {
        throw new Error(t('errUploadGeneric'))
      }

      setForm((prev) => ({ ...prev, image: uploadedUrl }))
    } catch (err) {
      setImageError(err.message || t('errUploadGeneric'))
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, image: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setFormError(t('reqBannerTitle'))
      return
    }

    setBusy(true)
    setFormError('')

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      image: form.image.trim() || null,
      link: form.link.trim() || null,
      type: form.type || 'promotional',
      isActive: Boolean(form.isActive),
      sortOrder: Number(form.sortOrder) || 0,
      startDate: safeIsoDate(form.startDate),
      endDate: safeIsoDate(form.endDate),
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
      setFormError(err.message || t('saveBannerError'))
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
      alert(err.message || t('saveBannerError'))
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
      label: t('bannerPreviewCol'),
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
      label: t('bannerDetailsCol'),
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
      label: t('bannerTypeCol'),
      render: (b) => {
        if (b.type === 'hero') return <Badge kind="brand">{t('typeHero')}</Badge>
        if (b.type === 'announcement') return <Badge kind="info">{t('bannersFilterAnnouncement')}</Badge>
        if (b.type === 'featured') return <Badge kind="purple">{t('typeFeatured')}</Badge>
        return <Badge kind="neutral">{t('typePromo')}</Badge>
      },
    },
    {
      key: 'sortOrder',
      label: t('bannerOrderCol'),
      render: (b) => <span className="font-mono text-xs text-white">#{b.sortOrder}</span>,
    },
    {
      key: 'isActive',
      label: t('bannerStatusCol'),
      render: (b) => (
        <StatusBadge
          kind={b.isActive ? 'ok' : 'neutral'}
          label={b.isActive ? t('bannerActiveLabel') : t('bannerInactiveLabel')}
        />
      ),
    },
    {
      key: 'dates',
      label: t('bannerDatesCol'),
      render: (b) => (
        <div className="text-[11px] text-[#8b80a8] space-y-0.5 font-mono">
          {b.startDate ? (
            <div>{t('bannerFromDate')} {formatDateShort(b.startDate, language)}</div>
          ) : null}
          {b.endDate ? (
            <div>{t('bannerToDate')} {formatDateShort(b.endDate, language)}</div>
          ) : null}
          {!b.startDate && !b.endDate && <span>{t('bannerPermanent')}</span>}
        </div>
      ),
    },
    {
      key: 'actions',
      label: t('bannerActionsCol'),
      render: (b) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openEditModal(b)}
            className="rounded-lg border border-line bg-surface-800/80 p-1.5 text-[#a79cc4] transition-colors hover:bg-surface-700 hover:text-white"
            title={t('edit')}
            aria-label={t('edit')}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openDeleteModal(b.id)}
            className="rounded-lg border border-danger-900/40 bg-danger-950/30 p-1.5 text-danger-400 transition-colors hover:bg-danger-900/50 hover:text-danger-300"
            title={t('delete')}
            aria-label={t('delete')}
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
        title={t('bannersTitle')}
        subtitle={t('bannersSubtitle')}
        actions={
          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('addBannerBtn')}
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
          {t('bannersFilterAll')} ({(banners || []).length})
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
          {t('bannersFilterPromo')}
        </button>
        <button
          type="button"
          onClick={() => setFilterType('announcement')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            filterType === 'announcement'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'border border-line bg-surface-800 text-[#a79cc4] hover:text-white'
          }`}
        >
          {t('bannersFilterAnnouncement')}
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
          {t('bannersFilterHero')}
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
          {t('bannersFilterFeatured')}
        </button>
      </div>

      {/* Table */}
      <Card padded={false}>
        <Table
          columns={columns}
          rows={filteredBanners}
          rowKey={(b) => b.id}
          loading={loading}
          empty={t('noBannersSection')}
        />
      </Card>

      {/* Modal for Create/Edit */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBanner ? t('editBannerBtn') : t('createBannerBtn')}
        width="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}

          <Input
            label={`${t('bannerTitle')} *`}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder={t('bannerTitlePlaceholder')}
            required
          />

          <Textarea
            label={t('bannerDesc')}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            placeholder={t('bannerDescPlaceholder')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label={`${t('bannerType')} *`}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="promotional">{t('typePromo')}</option>
              <option value="announcement">{t('typeAnnouncement')}</option>
              <option value="hero">{t('typeHero')}</option>
              <option value="featured">{t('typeFeatured')}</option>
            </Select>

            <Input
              label={t('bannerSortOrder')}
              type="number"
              min="0"
              step="1"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              placeholder="0"
            />
          </div>

          {/* Image Upload & Preview Section */}
          <div className="space-y-2 rounded-xl border border-line bg-ink-950/40 p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-brand-400" />
                <span>{t('bannerImage')}</span>
              </label>
              <span className="text-[10px] text-[#8b80a8]">
                {t('bannerImageUploadHint')}
              </span>
            </div>

            {imageError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-danger-950/80 border border-danger-800/80 text-danger-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-danger-400" />
                <span>{imageError}</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageFileUpload}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              {/* Image Preview Box */}
              <div className="h-16 w-28 rounded-lg bg-surface-900 border border-line flex items-center justify-center overflow-hidden shrink-0">
                {form.image ? (
                  <img
                    src={form.image}
                    alt="Banner Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/100x60/211839/a78bfa?text=No+Image'
                    }}
                  />
                ) : (
                  <Megaphone className="h-5 w-5 text-[#8b80a8]" />
                )}
              </div>

              {/* Upload & Remove Buttons */}
              <div className="flex flex-wrap items-center gap-2 flex-1 w-full">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>{t('uploading')}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>{form.image ? t('bannerChangeImageBtn') : t('bannerUploadImageBtn')}</span>
                    </>
                  )}
                </Button>

                {form.image && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t('bannerRemoveImageBtn')}</span>
                  </Button>
                )}

                <div className="w-full mt-1">
                  <Input
                    dir="ltr"
                    value={form.image}
                    onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                    placeholder={t('bannerImagePlaceholder')}
                  />
                </div>
              </div>
            </div>
          </div>

          <Input
            label={t('bannerLink')}
            dir="ltr"
            value={form.link}
            onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            placeholder={t('bannerLinkPlaceholder')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('bannerStartDate')}
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
            <Input
              label={t('bannerEndDate')}
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
              {t('bannerActiveCheckbox')}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={busy || uploadingImage}>
              {busy ? t('saving') : editingBanner ? t('save') : t('addBannerBtn')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={t('deleteBannerTitle')}
      >
        <div className="space-y-4">
          <p className="text-sm text-[#e3dcf0]">
            {t('deleteBannerConfirmMsg')}
          </p>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="primary"
              className="bg-danger-600 hover:bg-danger-500"
              onClick={handleDelete}
              disabled={busy}
            >
              {busy ? t('saving') : t('confirmDeleteBannerBtn')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
