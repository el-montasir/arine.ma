import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CreditCard,
  Search,
  Plus,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  User,
  Coins,
  ArrowUpRight,
  Filter,
  CheckCircle2,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatDateTime, formatNumber } from '../lib/format.js'
import { PageHeader, Card, StatCard } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Payments() {
  const { t, language } = useLanguage()
  const { can, isOwner } = useAuth()

  const canManage = isOwner || can('PAYMENTS_MANAGE')

  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('ALL')
  const [methodFilter, setMethodFilter] = useState('ALL')

  const { data: responseData, loading, error, reload } = useFetch('/payments?limit=200')
  const payments = Array.isArray(responseData) ? responseData : responseData?.data || []

  const { data: suppliersData } = useFetch('/suppliers')
  const suppliers = Array.isArray(suppliersData) ? suppliersData : suppliersData?.data || []

  // Create payment modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    supplierId: '',
    purchaseId: '',
    amount: '',
    paymentMethod: 'CASH',
    reference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    note: '',
  })
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Selected supplier purchases for modal
  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => String(s.id) === String(formData.supplierId))
  }, [suppliers, formData.supplierId])

  // Filtered payments
  const filteredPayments = useMemo(() => {
    if (!Array.isArray(payments)) return []

    return payments.filter((p) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (p.reference && p.reference.toLowerCase().includes(q)) ||
        (p.supplier?.name && p.supplier.name.toLowerCase().includes(q)) ||
        (p.purchase?.purchaseNumber && p.purchase.purchaseNumber.toLowerCase().includes(q)) ||
        (p.note && p.note.toLowerCase().includes(q))

      const matchesSupplier = supplierFilter === 'ALL' || String(p.supplierId) === String(supplierFilter)
      const matchesMethod = methodFilter === 'ALL' || p.paymentMethod === methodFilter

      return matchesSearch && matchesSupplier && matchesMethod
    })
  }, [payments, search, supplierFilter, methodFilter])

  // Stats calculation
  const stats = useMemo(() => {
    if (!Array.isArray(payments)) {
      return { totalCount: 0, totalAmount: 0, cashAmount: 0, bankAmount: 0 }
    }
    return payments.reduce(
      (acc, p) => {
        const amt = Number(p.amount || 0)
        acc.totalCount += 1
        acc.totalAmount += amt
        if (p.paymentMethod === 'CASH') acc.cashAmount += amt
        if (p.paymentMethod === 'BANK_TRANSFER') acc.bankAmount += amt
        return acc
      },
      { totalCount: 0, totalAmount: 0, cashAmount: 0, bankAmount: 0 }
    )
  }, [payments])

  const handleOpenCreate = () => {
    setFormData({
      supplierId: '',
      purchaseId: '',
      amount: '',
      paymentMethod: 'CASH',
      reference: '',
      paymentDate: new Date().toISOString().split('T')[0],
      note: '',
    })
    setFormError('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.supplierId) {
      setFormError('Please select a supplier')
      return
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      setFormError('Please enter a valid amount')
      return
    }

    setBusy(true)
    setFormError('')
    try {
      await api.post('/payments', {
        supplierId: Number(formData.supplierId),
        purchaseId: formData.purchaseId ? Number(formData.purchaseId) : undefined,
        amount: Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        reference: formData.reference || undefined,
        paymentDate: formData.paymentDate ? new Date(formData.paymentDate).toISOString() : new Date().toISOString(),
        note: formData.note || undefined,
      })
      showToast(t('paymentSavedSuccess') || 'Payment recorded successfully')
      setIsModalOpen(false)
      reload()
    } catch (err) {
      setFormError(err.message || 'Failed to record payment')
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    {
      key: 'paymentDate',
      label: t('paymentDate') || 'Date',
      render: (p) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[var(--ink)]">
            {formatDateTime(p.paymentDate || p.createdAt, language)}
          </span>
          {p.reference ? (
            <span className="text-[11px] text-[var(--ink-soft)] font-mono mt-0.5">
              Ref: {p.reference}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'supplier',
      label: t('supplierLabel') || 'Supplier',
      render: (p) => (
        <div className="flex flex-col">
          {p.supplier ? (
            <Link
              to={`/suppliers/${p.supplier.id}`}
              className="font-bold text-[var(--purple)] hover:underline flex items-center gap-1 text-xs"
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span>{p.supplier.name}</span>
            </Link>
          ) : (
            <span className="text-xs text-[var(--ink-soft)]">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'purchase',
      label: t('purchaseNumber') || 'Linked PO',
      render: (p) => (
        <div>
          {p.purchase ? (
            <Link
              to={`/purchases/${p.purchase.id}`}
              className="font-semibold text-xs text-[var(--ink)] hover:text-[var(--purple)] flex items-center gap-1"
            >
              <FileText className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
              <span>{p.purchase.purchaseNumber}</span>
            </Link>
          ) : (
            <span className="text-xs text-[var(--ink-soft)] italic">
              {t('generalPayment') || 'General Credit'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'paymentMethod',
      label: t('paymentMethod') || 'Method',
      render: (p) => (
        <Badge kind="neutral">
          {p.paymentMethod === 'CASH'
            ? t('methodCash') || 'Cash'
            : p.paymentMethod === 'BANK_TRANSFER'
            ? t('methodBankTransfer') || 'Bank Transfer'
            : p.paymentMethod === 'CARD'
            ? t('methodCard') || 'Card'
            : p.paymentMethod}
        </Badge>
      ),
    },
    {
      key: 'amount',
      label: t('paymentAmount') || 'Amount',
      render: (p) => (
        <span className="text-xs font-bold text-[var(--green)] tabular-nums">
          {formatMoney(p.amount || 0, language)}
        </span>
      ),
    },
    {
      key: 'createdByUser',
      label: t('recordedBy') || 'Recorded By',
      render: (p) => (
        <span className="text-xs text-[var(--ink-soft)]">
          {p.createdByUser?.fullName || p.createdByUser?.email || '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Toast */}
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
        title={t('paymentsTitle') || 'Supplier Payments'}
        subtitle={t('paymentsSubtitle') || 'Audit log of all payments made to suppliers and vendors'}
        actions={
          canManage ? (
            <Button variant="primary" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              {t('recordPaymentBtn') || 'Record Payment'}
            </Button>
          ) : null
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('totalPaymentsCount') || 'Total Payments'}
          value={formatNumber(stats.totalCount)}
          tone="default"
          icon={CreditCard}
        />
        <StatCard
          label={t('supplierTotalPaid') || 'Total Disbursed'}
          value={formatMoney(stats.totalAmount, language)}
          tone="ok"
          icon={DollarSign}
        />
        <StatCard
          label={t('cashPaid') || 'Paid in Cash'}
          value={formatMoney(stats.cashAmount, language)}
          tone="brand"
          icon={Coins}
        />
        <StatCard
          label={t('bankTransferPaid') || 'Paid via Bank'}
          value={formatMoney(stats.bankAmount, language)}
          tone="brand"
          icon={Building2}
        />
      </div>

      {/* Filter Bar */}
      <Card className="flex flex-wrap items-center justify-between gap-3" padded>
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-soft)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPaymentsPlaceholder') || 'Search reference, supplier, PO #...'}
            className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] ps-9 pe-3.5 py-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--purple)] focus:outline-none focus:ring-1 focus:ring-[var(--purple)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Supplier filter */}
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
          >
            <option value="ALL">{t('filterAllSuppliers') || 'All Suppliers'}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Payment method filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
          >
            <option value="ALL">{t('filterAllMethods') || 'All Methods'}</option>
            <option value="CASH">{t('methodCash') || 'Cash'}</option>
            <option value="BANK_TRANSFER">{t('methodBankTransfer') || 'Bank Transfer'}</option>
            <option value="CARD">{t('methodCard') || 'Card'}</option>
            <option value="OTHER">{t('methodOther') || 'Other'}</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padded={false}>
        <Table
          columns={columns}
          rows={filteredPayments}
          rowKey={(p) => p.id}
          loading={loading}
          empty={t('noPaymentsFound') || 'No payments found'}
        />
      </Card>

      {/* Record Payment Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => !busy && setIsModalOpen(false)}
        title={t('recordPaymentBtn') || 'Record Supplier Payment'}
        width="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError ? <ErrorBanner message={formError} /> : null}

          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
              {t('supplierLabel') || 'Supplier *'}
            </label>
            <select
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
              className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
              required
            >
              <option value="">{t('selectSupplierPrompt') || '— Select a supplier —'}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Bal: {formatMoney(s.currentBalance || 0, language)})
                </option>
              ))}
            </select>
          </div>

          <Input
            label={t('paymentAmount') || 'Amount (MAD) *'}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('paymentMethod') || 'Payment Method'}
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            >
              <option value="CASH">{t('methodCash') || 'Cash'}</option>
              <option value="BANK_TRANSFER">{t('methodBankTransfer') || 'Bank Transfer'}</option>
              <option value="CARD">{t('methodCard') || 'Card'}</option>
              <option value="OTHER">{t('methodOther') || 'Other'}</option>
            </Select>

            <Input
              label={t('paymentDate') || 'Date'}
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              required
            />
          </div>

          <Input
            label={t('paymentReference') || 'Reference / Check #'}
            placeholder="e.g. Wire Ref #99401"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
          />

          <Textarea
            label={t('notesLabel') || 'Notes'}
            placeholder="Details or receipt confirmation..."
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            rows={2}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={busy}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? (t('saving') || 'Saving…') : (t('recordPaymentBtn') || 'Save Payment')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
