import { useState, useMemo } from 'react'
import {
  Users,
  Search,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  RefreshCw,
  Phone,
  MapPin,
  FileText,
  ShoppingBag,
  Coins,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatNumber, formatDateShort } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Customers() {
  const { t, language } = useLanguage()
  const { can, isOwner } = useAuth()

  // Permissions
  const canEdit = isOwner || can('CUSTOMERS_UPDATE')
  const canArchive = isOwner || can('CUSTOMERS_ARCHIVE')
  const canDelete = isOwner || can('CUSTOMERS_DELETE')

  // Search & Filter State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'ARCHIVED'

  // Fetch all customers (includeArchived=true so we can filter client-side)
  const { data: customers, loading, error, reload } = useFetch('/customers?includeArchived=true')

  // Modals & Active Actions
  const [editModalCustomer, setEditModalCustomer] = useState(null)
  const [archiveTargetCustomer, setArchiveTargetCustomer] = useState(null)
  const [deleteTargetCustomer, setDeleteTargetCustomer] = useState(null)

  // Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    address: '',
    notes: '',
    status: 'ACTIVE',
  })
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return []

    return customers.filter((c) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))

      const matchesStatus =
        statusFilter === 'ALL' || (c.status || 'ACTIVE') === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [customers, search, statusFilter])

  // Summary Metrics
  const stats = useMemo(() => {
    if (!customers || !Array.isArray(customers)) {
      return { total: 0, active: 0, archived: 0, totalRevenue: 0 }
    }
    const total = customers.length
    const active = customers.filter((c) => (c.status || 'ACTIVE') === 'ACTIVE').length
    const archived = customers.filter((c) => c.status === 'ARCHIVED').length
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)

    return { total, active, archived, totalRevenue }
  }, [customers])

  // Open Edit Modal
  const handleOpenEdit = (customer) => {
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      city: customer.city || '',
      address: customer.address || '',
      notes: customer.notes || '',
      status: customer.status || 'ACTIVE',
    })
    setFormError('')
    setEditModalCustomer(customer)
  }

  // Submit Edit Form
  const handleSaveCustomer = async (e) => {
    e.preventDefault()
    if (!editModalCustomer) return

    if (!formData.name.trim()) {
      setFormError(t('customerNameLabel') + ' ' + t('required'))
      return
    }

    if (!formData.phone.trim()) {
      setFormError(t('customerPhoneLabel') + ' ' + t('required'))
      return
    }

    setBusy(true)
    setFormError('')

    try {
      const idOrPhone = editModalCustomer.id || editModalCustomer.phone
      const res = await api.patch(`/customers/${encodeURIComponent(idOrPhone)}`, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        status: formData.status,
      })

      if (res?.success) {
        showToast(t('customerUpdatedSuccess'))
        setEditModalCustomer(null)
        reload()
      } else {
        setFormError(res?.error || t('error'))
      }
    } catch (err) {
      setFormError(err?.message || t('error'))
    } finally {
      setBusy(false)
    }
  }

  // Handle Archive / Unarchive
  const handleArchiveToggle = async () => {
    if (!archiveTargetCustomer) return
    const isArchived = archiveTargetCustomer.status === 'ARCHIVED'
    const newStatus = isArchived ? 'ACTIVE' : 'ARCHIVED'

    setBusy(true)
    try {
      const idOrPhone = archiveTargetCustomer.id || archiveTargetCustomer.phone
      const res = await api.patch(`/customers/${encodeURIComponent(idOrPhone)}/archive`, {
        status: newStatus,
      })

      if (res?.success) {
        showToast(isArchived ? t('customerUnarchivedSuccess') : t('customerArchivedSuccess'))
        setArchiveTargetCustomer(null)
        reload()
      } else {
        showToast(res?.error || t('error'), 'error')
      }
    } catch (err) {
      showToast(err?.message || t('error'), 'error')
    } finally {
      setBusy(false)
    }
  }

  // Handle Delete
  const handleDeleteCustomer = async () => {
    if (!deleteTargetCustomer) return

    setBusy(true)
    try {
      const idOrPhone = deleteTargetCustomer.id || deleteTargetCustomer.phone
      const res = await api.del(`/customers/${encodeURIComponent(idOrPhone)}`)

      if (res?.success) {
        showToast(t('customerDeletedSuccess'))
        setDeleteTargetCustomer(null)
        reload()
      } else {
        showToast(res?.error || t('error'), 'error')
      }
    } catch (err) {
      showToast(err?.message || t('error'), 'error')
    } finally {
      setBusy(false)
    }
  }

  // Columns definition
  const columns = [
    {
      key: 'customer',
      label: t('customerNameLabel'),
      render: (r) => {
        const initial = (r.name || '?').trim().charAt(0).toUpperCase()
        const isArchived = r.status === 'ARCHIVED'
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-[10px] flex items-center justify-center font-bold text-xs shrink-0 ${
                isArchived
                  ? 'bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-soft)]'
                  : 'bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-white shadow-sm'
              }`}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-sm ${isArchived ? 'text-[var(--ink-soft)]' : 'text-[var(--ink)]'}`}>
                  {r.name}
                </span>
                {r.status === 'ARCHIVED' && (
                  <span className="px-1.5 py-0.5 rounded-[6px] bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-soft)] text-[10px] font-medium">
                    {t('customerStatusArchived')}
                  </span>
                )}
              </div>
              {r.notes ? (
                <p className="text-[11px] text-[var(--ink-soft)] truncate max-w-[200px]" title={r.notes}>
                  {r.notes}
                </p>
              ) : null}
            </div>
          </div>
        )
      },
    },
    {
      key: 'phone',
      label: t('customerPhoneLabel'),
      render: (r) => (
        <a
          href={`tel:${r.phone}`}
          dir="ltr"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-[var(--purple)] hover:underline"
        >
          <Phone className="h-3 w-3 text-[var(--ink-soft)]" />
          <span>{r.phone}</span>
        </a>
      ),
    },
    {
      key: 'location',
      label: t('customerCityCol'),
      render: (r) => (
        <div className="text-xs">
          <div className="flex items-center gap-1 text-[var(--ink)] font-medium">
            <MapPin className="h-3 w-3 text-[var(--ink-soft)] shrink-0" />
            <span>{r.city || '—'}</span>
          </div>
          {r.address ? (
            <p className="text-[11px] text-[var(--ink-soft)] truncate max-w-[180px] mt-0.5" title={r.address}>
              {r.address}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'orderCount',
      label: t('ordersPlaced'),
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <ShoppingBag className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
          <span className="tabular-nums font-bold text-xs text-[var(--ink)]">
            {formatNumber(r.orderCount || 0)}
          </span>
        </div>
      ),
    },
    {
      key: 'totalSpent',
      label: t('totalSpent'),
      render: (r) => (
        <span className="tabular-nums font-extrabold text-xs text-[var(--ink)]">
          {formatMoney(r.totalSpent || 0, language)}
        </span>
      ),
    },
    {
      key: 'lastOrder',
      label: t('lastOrderDate'),
      render: (r) => (
        <div className="flex items-center gap-1 text-xs text-[var(--ink-soft)]">
          <Calendar className="h-3 w-3" />
          <span>{r.lastOrderAt ? formatDateShort(r.lastOrderAt, language) : '—'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (r) => {
        const isArchived = r.status === 'ARCHIVED'
        return (
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                type="button"
                onClick={() => handleOpenEdit(r)}
                title={t('edit')}
                aria-label={t('edit')}
                className="w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--card)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--purple)] hover:border-[var(--purple)]/40 hover:bg-[var(--purple-bg)] transition-colors cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}

            {canArchive && (
              <button
                type="button"
                onClick={() => setArchiveTargetCustomer(r)}
                title={isArchived ? t('unarchiveCustomer') : t('archiveCustomer')}
                aria-label={isArchived ? t('unarchiveCustomer') : t('archiveCustomer')}
                className="w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--card)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
              >
                {isArchived ? (
                  <ArchiveRestore className="h-3.5 w-3.5 text-[var(--purple)]" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => setDeleteTargetCustomer(r)}
                title={t('delete')}
                aria-label={t('delete')}
                className="w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--card)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--red)] hover:border-[var(--red)]/40 hover:bg-[var(--red-bg)] transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-5 pb-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 end-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-[12px] shadow-2xl border ${
              toastMessage.type === 'error'
                ? 'bg-[var(--red-bg)] border-[var(--red)]/30 text-[var(--red)]'
                : 'bg-[var(--card)] border-[var(--purple)]/40 text-[var(--ink)]'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--red)]" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--purple)]" />
            )}
            <span className="text-xs font-semibold">{toastMessage.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title={t('customersTitle')}
          subtitle={t('customersSubtitle')}
        />

        <Button
          variant="outline"
          onClick={() => reload()}
          disabled={loading}
          icon={RefreshCw}
          className={loading ? 'animate-spin' : ''}
        >
          {t('refresh')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-[14px] border border-[var(--line)] bg-[var(--card)] flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--ink-soft)] font-medium block">
              {t('totalCustomersCount')}
            </span>
            <span className="text-xl font-extrabold text-[var(--ink)] tabular-nums mt-0.5 block">
              {formatNumber(stats.total)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-[10px] bg-[var(--purple-bg)] text-[var(--purple)] flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-[14px] border border-[var(--line)] bg-[var(--card)] flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--ink-soft)] font-medium block">
              {t('activeCustomersCount')}
            </span>
            <span className="text-xl font-extrabold text-[var(--green)] tabular-nums mt-0.5 block">
              {formatNumber(stats.active)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-[10px] bg-[var(--green-bg)] text-[var(--green)] flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-[14px] border border-[var(--line)] bg-[var(--card)] flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--ink-soft)] font-medium block">
              {t('archivedCustomersCount')}
            </span>
            <span className="text-xl font-extrabold text-[var(--ink-soft)] tabular-nums mt-0.5 block">
              {formatNumber(stats.archived)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-[10px] bg-[var(--bg)] text-[var(--ink-soft)] flex items-center justify-center">
            <Archive className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-[14px] border border-[var(--line)] bg-[var(--card)] flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--ink-soft)] font-medium block">
              {t('totalSpent')}
            </span>
            <span className="text-xl font-extrabold text-[var(--ink)] tabular-nums mt-0.5 block">
              {formatMoney(stats.totalRevenue, language)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-[10px] bg-[var(--purple-bg)] text-[var(--purple)] flex items-center justify-center">
            <Coins className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--card)] border border-[var(--line)] p-3 rounded-[14px]">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-[var(--bg)] p-1 rounded-[10px] border border-[var(--line)] w-fit">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[var(--card)] text-[var(--ink)] shadow-sm'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            {t('allCustomers')} ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-[var(--card)] text-[var(--green)] shadow-sm'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            {t('activeCustomers')} ({stats.active})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ARCHIVED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
              statusFilter === 'ARCHIVED'
                ? 'bg-[var(--card)] text-[var(--ink)] shadow-sm'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            {t('archivedCustomers')} ({stats.archived})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-soft)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchCustomersPlaceholder')}
            className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-[10px] ps-8 pe-8 py-1.5 text-xs text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--purple)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      {/* Main Customers Table */}
      <Card padded={false}>
        <Table
          columns={columns}
          rows={filteredCustomers}
          rowKey={(r) => r.id || r.phone}
          loading={loading}
          empty={t('noCustomersYet')}
        />
      </Card>

      {/* Edit Customer Modal */}
      {editModalCustomer && (
        <Modal
          open={Boolean(editModalCustomer)}
          onClose={() => !busy && setEditModalCustomer(null)}
          title={t('editCustomerTitle')}
          width="max-w-md"
        >
          <form onSubmit={handleSaveCustomer} className="space-y-4">
            <p className="text-xs text-[var(--ink-soft)] mb-3">
              {t('editCustomerDesc')}
            </p>

            {formError && <ErrorBanner message={formError} />}

            <Input
              label={t('customerNameLabel')}
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
              disabled={busy}
            />

            <Input
              label={t('customerPhoneLabel')}
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              dir="ltr"
              required
              disabled={busy}
            />

            <Input
              label={t('customerCityLabel')}
              value={formData.city}
              onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
              disabled={busy}
            />

            <Input
              label={t('customerAddressLabel')}
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              disabled={busy}
            />

            <Select
              label={t('status')}
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              disabled={busy}
            >
              <option value="ACTIVE">{t('customerStatusActive')}</option>
              <option value="ARCHIVED">{t('customerStatusArchived')}</option>
            </Select>

            <Textarea
              label={t('customerNotes')}
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder={t('customerNotesPlaceholder')}
              rows={3}
              disabled={busy}
            />

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalCustomer(null)}
                disabled={busy}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" loading={busy}>
                {t('saveChanges')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Archive / Unarchive Confirmation Modal */}
      {archiveTargetCustomer && (
        <Modal
          open={Boolean(archiveTargetCustomer)}
          onClose={() => !busy && setArchiveTargetCustomer(null)}
          title={archiveTargetCustomer.status === 'ARCHIVED' ? t('unarchiveCustomer') : t('archiveCustomer')}
          width="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-[12px] bg-[var(--bg)] border border-[var(--line)]">
              <Archive className="h-5 w-5 text-[var(--purple)] shrink-0 mt-0.5" />
              <div className="text-xs text-[var(--ink)] space-y-1">
                <p className="font-semibold">
                  {archiveTargetCustomer.name} ({archiveTargetCustomer.phone})
                </p>
                <p className="text-[var(--ink-soft)]">
                  {archiveTargetCustomer.status === 'ARCHIVED'
                    ? t('unarchiveCustomerConfirm')
                    : t('archiveCustomerDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setArchiveTargetCustomer(null)}
                disabled={busy}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                variant={archiveTargetCustomer.status === 'ARCHIVED' ? 'primary' : 'outline'}
                onClick={handleArchiveToggle}
                loading={busy}
              >
                {archiveTargetCustomer.status === 'ARCHIVED' ? t('unarchiveCustomer') : t('archiveCustomer')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetCustomer && (
        <Modal
          open={Boolean(deleteTargetCustomer)}
          onClose={() => !busy && setDeleteTargetCustomer(null)}
          title={t('deleteCustomer')}
          width="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-[12px] bg-[var(--red-bg)]/50 border border-[var(--red)]/20">
              <AlertTriangle className="h-5 w-5 text-[var(--red)] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-[var(--red)]">
                  {t('deleteCustomerConfirm')}
                </p>
                <p className="text-[var(--ink)]">
                  {deleteTargetCustomer.name} — <span dir="ltr" className="font-mono">{deleteTargetCustomer.phone}</span>
                </p>
                <p className="text-[var(--ink-soft)] text-[11px] mt-1">
                  {t('deleteCustomerWarning')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTargetCustomer(null)}
                disabled={busy}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteCustomer}
                loading={busy}
              >
                {t('delete')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
