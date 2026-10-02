import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Search,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Coins,
  Receipt,
  CreditCard,
  Package,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  User,
  MapPin,
  FileText,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatNumber } from '../lib/format.js'
import { PageHeader, Card, StatCard } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Suppliers() {
  const { t, language } = useLanguage()
  const { can, isOwner } = useAuth()

  const canManage = isOwner || can('SUPPLIERS_MANAGE')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const { data: responseData, loading, error, reload } = useFetch('/suppliers')
  const suppliers = Array.isArray(responseData) ? responseData : responseData?.data || []

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxNumber: '',
    paymentTerms: '',
    notes: '',
    status: 'ACTIVE',
  })
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    if (!Array.isArray(suppliers)) return []

    return suppliers.filter((s) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.taxNumber && s.taxNumber.toLowerCase().includes(q))

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && s.status === 'ACTIVE') ||
        (statusFilter === 'INACTIVE' && s.status === 'INACTIVE')

      return matchesSearch && matchesStatus
    })
  }, [suppliers, search, statusFilter])

  // Summary calculations
  const stats = useMemo(() => {
    if (!Array.isArray(suppliers)) return { total: 0, totalBalance: 0, totalPurchases: 0, totalPaid: 0, active: 0 }
    return suppliers.reduce(
      (acc, s) => {
        acc.total += 1
        acc.totalBalance += Number(s.currentBalance || 0)
        acc.totalPurchases += Number(s.totalPurchases || 0)
        acc.totalPaid += Number(s.totalPaid || 0)
        if (s.status === 'ACTIVE') acc.active += 1
        return acc
      },
      { total: 0, totalBalance: 0, totalPurchases: 0, totalPaid: 0, active: 0 }
    )
  }, [suppliers])

  const handleOpenCreate = () => {
    setEditingSupplier(null)
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      taxNumber: '',
      paymentTerms: '',
      notes: '',
      status: 'ACTIVE',
    })
    setFormError('')
    setIsFormOpen(true)
  }

  const handleOpenEdit = (s, e) => {
    if (e) e.stopPropagation()
    setEditingSupplier(s)
    setFormData({
      name: s.name || '',
      contactPerson: s.contactPerson || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      taxNumber: s.taxNumber || '',
      paymentTerms: s.paymentTerms || '',
      notes: s.notes || '',
      status: s.status || 'ACTIVE',
    })
    setFormError('')
    setIsFormOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormError(t('nameRequired') || 'Supplier name is required')
      return
    }

    setBusy(true)
    setFormError('')
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, formData)
        showToast(t('supplierUpdatedSuccess') || 'Supplier updated successfully')
      } else {
        await api.post('/suppliers', formData)
        showToast(t('supplierCreatedSuccess') || 'Supplier created successfully')
      }
      setIsFormOpen(false)
      reload()
    } catch (err) {
      setFormError(err.message || t('stockUpdateError') || 'Operation failed')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await api.del(`/suppliers/${deleteTarget.id}`)
      showToast(t('supplierDeletedSuccess') || 'Supplier deleted successfully')
      setDeleteTarget(null)
      reload()
    } catch (err) {
      showToast(err.message || 'Failed to delete supplier', 'error')
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    {
      key: 'name',
      label: t('supplierName') || 'Supplier',
      render: (s) => (
        <div className="flex flex-col">
          <Link
            to={`/suppliers/${s.id}`}
            className="font-bold text-[var(--purple)] hover:underline flex items-center gap-1.5"
          >
            <Building2 className="h-4 w-4 text-[var(--purple)] shrink-0" />
            <span>{s.name}</span>
          </Link>
          {s.contactPerson ? (
            <span className="text-xs text-[var(--ink-soft)] flex items-center gap-1 mt-0.5">
              <User className="h-3 w-3" /> {s.contactPerson}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'contact',
      label: t('phoneLabel') || 'Contact',
      render: (s) => (
        <div className="text-xs space-y-0.5">
          {s.phone ? (
            <div className="flex items-center gap-1.5 text-[var(--ink)] font-mono" dir="ltr">
              <Phone className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
              <span>{s.phone}</span>
            </div>
          ) : null}
          {s.email ? (
            <div className="flex items-center gap-1.5 text-[var(--ink-soft)]">
              <Mail className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
              <span>{s.email}</span>
            </div>
          ) : null}
          {!s.phone && !s.email ? <span className="text-[var(--ink-soft)]">—</span> : null}
        </div>
      ),
    },
    {
      key: 'productsCount',
      label: t('supplierProductsCount') || 'Products',
      render: (s) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ink)]">
          <Package className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
          {formatNumber(s._count?.supplierProducts ?? s.productsCount ?? 0)}
        </span>
      ),
    },
    {
      key: 'totalPurchases',
      label: t('supplierTotalPurchases') || 'Total Purchases',
      render: (s) => (
        <span className="text-xs font-semibold text-[var(--ink)] tabular-nums">
          {formatMoney(s.totalPurchases || 0, language)}
        </span>
      ),
    },
    {
      key: 'totalPaid',
      label: t('supplierTotalPaid') || 'Total Paid',
      render: (s) => (
        <span className="text-xs font-semibold text-[var(--ink-soft)] tabular-nums">
          {formatMoney(s.totalPaid || 0, language)}
        </span>
      ),
    },
    {
      key: 'balance',
      label: t('supplierCurrentBalance') || 'Outstanding Balance',
      render: (s) => {
        const bal = Number(s.currentBalance || 0)
        return (
          <span
            className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
              bal > 0
                ? 'bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/20'
                : bal < 0
                ? 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20'
                : 'text-[var(--ink-soft)]'
            }`}
          >
            {formatMoney(bal, language)}
          </span>
        )
      },
    },
    {
      key: 'status',
      label: t('supplierStatus') || 'Status',
      render: (s) => (
        <Badge kind={s.status === 'ACTIVE' ? 'ok' : 'neutral'}>
          {s.status === 'ACTIVE' ? t('supplierActive') || 'Active' : t('supplierInactive') || 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-end',
      render: (s) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Link
            to={`/suppliers/${s.id}`}
            className="p-1.5 rounded-[8px] border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--purple)] hover:bg-[var(--bg)] transition-colors"
            title={t('supplierDetailsTitle') || 'View Details'}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          {canManage ? (
            <>
              <button
                onClick={(e) => handleOpenEdit(s, e)}
                className="p-1.5 rounded-[8px] border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
                title={t('editSupplierBtn') || 'Edit'}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteTarget(s)
                }}
                className="p-1.5 rounded-[8px] border border-[var(--red)]/20 bg-[var(--red-bg)] text-[var(--red)] hover:bg-[var(--red)]/20 transition-colors cursor-pointer"
                title={t('deleteSupplierBtn') || 'Delete'}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage ? (
        <div
          className={`fixed bottom-5 end-5 z-50 flex items-center gap-2 px-4 py-3 rounded-[12px] shadow-lg text-xs font-semibold text-white transition-all ${
            toastMessage.type === 'error' ? 'bg-[var(--red)]' : 'bg-[var(--green)]'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage.message}</span>
        </div>
      ) : null}

      <PageHeader
        title={t('suppliersTitle') || 'Suppliers Management'}
        subtitle={t('suppliersSubtitle') || 'Track vendors, credit balances, and negotiated purchase prices'}
        actions={
          canManage ? (
            <Button variant="primary" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              {t('addSupplierBtn') || 'Add Supplier'}
            </Button>
          ) : null
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('totalStaffLabel') || 'Total Suppliers'}
          value={formatNumber(stats.total)}
          tone="default"
          icon={Building2}
        />
        <StatCard
          label={t('supplierCurrentBalance') || 'Outstanding Balance'}
          value={formatMoney(stats.totalBalance, language)}
          tone={stats.totalBalance > 0 ? 'danger' : 'ok'}
          icon={Coins}
        />
        <StatCard
          label={t('supplierTotalPurchases') || 'Total Purchases'}
          value={formatMoney(stats.totalPurchases, language)}
          tone="brand"
          icon={Receipt}
        />
        <StatCard
          label={t('supplierTotalPaid') || 'Total Paid'}
          value={formatMoney(stats.totalPaid, language)}
          tone="ok"
          icon={CreditCard}
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="flex flex-wrap items-center justify-between gap-3" padded>
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-soft)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchSuppliersPlaceholder') || 'Search by name, phone, email...'}
            className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] ps-9 pe-3.5 py-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--purple)] focus:outline-none focus:ring-1 focus:ring-[var(--purple)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
          >
            <option value="ALL">{t('filterAllStatus') || 'All Statuses'}</option>
            <option value="ACTIVE">{t('supplierActive') || 'Active'}</option>
            <option value="INACTIVE">{t('supplierInactive') || 'Inactive'}</option>
          </select>
        </div>
      </Card>

      {/* Suppliers Table */}
      <Card padded={false}>
        <Table
          columns={columns}
          rows={filteredSuppliers}
          rowKey={(s) => s.id}
          loading={loading}
          empty={t('noSuppliersFound') || 'No suppliers found'}
        />
      </Card>

      {/* Add / Edit Supplier Modal */}
      <Modal
        open={isFormOpen}
        onClose={() => !busy && setIsFormOpen(false)}
        title={editingSupplier ? t('editSupplierBtn') || 'Edit Supplier' : t('addSupplierBtn') || 'Add Supplier'}
        width="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError ? <ErrorBanner message={formError} /> : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label={t('supplierName') || 'Supplier Name *'}
                placeholder={t('supplierNamePlaceholder') || 'e.g. Moroccan Publishing House'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <Input
              label={t('supplierContactPerson') || 'Contact Person'}
              placeholder={t('supplierContactPersonPlaceholder') || 'e.g. Mohamed Alaoui'}
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            />

            <Input
              label={t('supplierPhone') || 'Phone'}
              placeholder={t('supplierPhonePlaceholder') || '06XXXXXXXX'}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              dir="ltr"
            />

            <Input
              label={t('supplierEmail') || 'Email'}
              type="email"
              placeholder={t('supplierEmailPlaceholder') || 'supplier@example.com'}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label={t('supplierTaxNumber') || 'Tax ID / ICE'}
              placeholder={t('supplierTaxNumberPlaceholder') || 'IF / RC / ICE'}
              value={formData.taxNumber}
              onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
            />

            <div className="sm:col-span-2">
              <Input
                label={t('supplierAddress') || 'Address'}
                placeholder={t('supplierAddressPlaceholder') || 'Casablanca, Morocco'}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <Input
              label={t('supplierPaymentTerms') || 'Payment Terms'}
              placeholder={t('supplierPaymentTermsPlaceholder') || 'e.g. Net 30 days'}
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
            />

            <Select
              label={t('supplierStatus') || 'Status'}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="ACTIVE">{t('supplierActive') || 'Active'}</option>
              <option value="INACTIVE">{t('supplierInactive') || 'Inactive'}</option>
            </Select>

            <div className="sm:col-span-2">
              <Textarea
                label={t('supplierNotes') || 'Internal Notes'}
                placeholder={t('supplierNotesPlaceholder') || 'Trade agreements, banking info...'}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsFormOpen(false)}
              disabled={busy}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? (t('saving') || 'Saving…') : (t('save') || 'Save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !busy && setDeleteTarget(null)}
        title={t('deleteSupplierBtn') || 'Delete Supplier'}
        width="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-[var(--red)]">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <p className="text-xs leading-relaxed text-[var(--ink)]">
              {t('deleteSupplierConfirm') ||
                'Are you sure you want to delete this supplier? This action cannot be undone.'}
            </p>
          </div>

          <div className="p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)] text-xs space-y-1">
            <div className="font-bold text-[var(--ink)]">{deleteTarget?.name}</div>
            {deleteTarget?.phone ? <div className="text-[var(--ink-soft)]">{deleteTarget.phone}</div> : null}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={busy}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="danger" type="button" onClick={handleDelete} disabled={busy}>
              {busy ? (t('saving') || 'Deleting…') : (t('delete') || 'Delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
