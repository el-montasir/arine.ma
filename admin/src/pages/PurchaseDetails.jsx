import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  Building2,
  Calendar,
  Truck,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowLeft,
  DollarSign,
  Package,
  Plus,
  Coins,
  AlertTriangle,
  Send,
  Ban,
  Pencil,
  Eye,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatDateTime, formatNumber } from '../lib/format.js'
import { PageHeader, Card, StatCard } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import Modal from '../components/ui/Modal.jsx'
import Button from '../components/ui/Button.jsx'
import { Input, Select, Textarea } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function PurchaseDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { can, isOwner } = useAuth()

  const canManage = isOwner || can('PURCHASES_MANAGE')
  const canReceive = isOwner || can('PURCHASES_RECEIVE')
  const canPay = isOwner || can('PAYMENTS_MANAGE')
  const canReturn = isOwner || can('RETURNS_MANAGE')

  const { data: responseData, loading, error, reload } = useFetch(`/purchases/${id}`)
  const purchase = responseData?.data || responseData

  // Modals state
  const [isReceiveOpen, setIsReceiveOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)

  // Receive modal form: map of itemId -> qty to receive now
  const [receiveInputs, setReceiveInputs] = useState({})
  const [receiveNote, setReceiveNote] = useState('')

  // Payment modal form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'CASH',
    reference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    note: '',
  })

  // Return modal form
  const [returnInputs, setReturnInputs] = useState({})
  const [returnReason, setReturnReason] = useState('')
  const [returnNotes, setReturnNotes] = useState('')

  // Status transition form
  const [targetStatus, setTargetStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')

  const [busy, setBusy] = useState(false)
  const [modalError, setModalError] = useState('')
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Open Receive Items Modal
  const handleOpenReceive = () => {
    if (!purchase?.items) return
    const initial = {}
    purchase.items.forEach((item) => {
      const remaining = Math.max(0, item.quantity - (item.quantityReceived || 0))
      initial[item.id] = remaining // Default to remaining quantity
    })
    setReceiveInputs(initial)
    setReceiveNote('')
    setModalError('')
    setIsReceiveOpen(true)
  }

  // Submit Receive Items
  const handleReceiveSubmit = async (e) => {
    e.preventDefault()
    setModalError('')

    const itemsToReceive = []
    for (const item of purchase.items || []) {
      const qty = Number(receiveInputs[item.id]) || 0
      if (qty > 0) {
        const remaining = Math.max(0, item.quantity - (item.quantityReceived || 0))
        if (qty > remaining) {
          setModalError(`Cannot receive more than remaining (${remaining}) for ${item.product?.title || 'product'}`)
          return
        }
        itemsToReceive.push({
          purchaseItemId: item.id,
          productId: item.productId,
          quantityReceived: qty,
        })
      }
    }

    if (itemsToReceive.length === 0) {
      setModalError('Please enter at least 1 quantity to receive')
      return
    }

    setBusy(true)
    try {
      await api.post(`/purchases/${id}/receive`, {
        items: itemsToReceive,
        note: receiveNote || undefined,
      })
      showToast(t('receiveItemsSuccess') || 'Goods received and stock replenished successfully')
      setIsReceiveOpen(false)
      reload()
    } catch (err) {
      setModalError(err.message || 'Failed to receive goods')
    } finally {
      setBusy(false)
    }
  }

  // Submit Payment
  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setModalError('Valid payment amount is required')
      return
    }

    setBusy(true)
    setModalError('')
    try {
      await api.post('/payments', {
        supplierId: purchase.supplierId,
        purchaseId: Number(id),
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        reference: paymentForm.reference || undefined,
        paymentDate: paymentForm.paymentDate ? new Date(paymentForm.paymentDate).toISOString() : new Date().toISOString(),
        note: paymentForm.note || undefined,
      })
      showToast(t('paymentSavedSuccess') || 'Payment recorded successfully')
      setIsPaymentOpen(false)
      setPaymentForm({
        amount: '',
        paymentMethod: 'CASH',
        reference: '',
        paymentDate: new Date().toISOString().split('T')[0],
        note: '',
      })
      reload()
    } catch (err) {
      setModalError(err.message || 'Failed to record payment')
    } finally {
      setBusy(false)
    }
  }

  // Open Return Modal
  const handleOpenReturn = () => {
    if (!purchase?.items) return
    const initial = {}
    purchase.items.forEach((item) => {
      initial[item.id] = 0
    })
    setReturnInputs(initial)
    setReturnReason('DAMAGED')
    setReturnNotes('')
    setModalError('')
    setIsReturnModalOpen(true)
  }

  // Submit Return
  const handleReturnSubmit = async (e) => {
    e.preventDefault()
    setModalError('')

    const itemsToReturn = []
    let totalReturnAmt = 0

    for (const item of purchase.items || []) {
      const qty = Number(returnInputs[item.id]) || 0
      if (qty > 0) {
        const received = item.quantityReceived || 0
        if (qty > received) {
          setModalError(`Cannot return more than received quantity (${received}) for ${item.product?.title}`)
          return
        }
        const unitCost = Number(item.unitCost) || 0
        totalReturnAmt += qty * unitCost
        itemsToReturn.push({
          productId: item.productId,
          quantity: qty,
          unitCost: unitCost,
          reason: returnReason,
        })
      }
    }

    if (itemsToReturn.length === 0) {
      setModalError('Please enter at least 1 quantity to return')
      return
    }

    setBusy(true)
    try {
      const res = await api.post('/purchase-returns', {
        supplierId: purchase.supplierId,
        purchaseId: Number(id),
        status: 'CONFIRMED', // Immediately confirm to adjust stock & balance
        totalAmount: totalReturnAmt,
        reason: returnReason,
        notes: returnNotes || undefined,
        items: itemsToReturn,
      })
      const newReturn = res?.data || res
      showToast(t('returnCreatedSuccess') || 'Purchase return confirmed and processed successfully')
      setIsReturnModalOpen(false)
      reload()
    } catch (err) {
      setModalError(err.message || 'Failed to process return')
    } finally {
      setBusy(false)
    }
  }

  // Status Change
  const handleStatusChange = async (newStatus) => {
    setBusy(true)
    try {
      await api.patch(`/purchases/${id}/status`, { status: newStatus })
      showToast(t('statusUpdatedSuccess') || `Purchase status updated to ${newStatus}`)
      setIsStatusModalOpen(false)
      reload()
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !purchase) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner label={t('loadingData') || 'Loading purchase order...'} />
      </div>
    )
  }

  if (error || !purchase) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error || 'Purchase order not found'} />
        <Button variant="secondary" onClick={() => navigate('/purchases')}>
          <ArrowLeft className="h-4 w-4" /> {t('backToPurchases') || 'Back to Purchases'}
        </Button>
      </div>
    )
  }

  const items = purchase.items || []
  const payments = purchase.payments || []
  const returns = purchase.returns || []

  const totalOrdered = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalReceived = items.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)
  const isFullyReceived = totalOrdered > 0 && totalReceived >= totalOrdered
  const hasUnreceived = totalReceived < totalOrdered && purchase.status !== 'CANCELLED'

  const remainingBalance = Math.max(0, Number(purchase.grandTotal || 0) - Number(purchase.amountPaid || 0))

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RECEIVED':
        return <Badge kind="ok">{t('purchaseStatusReceived') || 'Received'}</Badge>
      case 'PARTIALLY_RECEIVED':
        return <Badge kind="shipping">{t('purchaseStatusPartiallyReceived') || 'Partially Received'}</Badge>
      case 'ORDERED':
        return <Badge kind="pending">{t('purchaseStatusOrdered') || 'Ordered'}</Badge>
      case 'DRAFT':
        return <Badge kind="neutral">{t('purchaseStatusDraft') || 'Draft'}</Badge>
      case 'CANCELLED':
        return <Badge kind="neutral">{t('purchaseStatusCancelled') || 'Cancelled'}</Badge>
      default:
        return <Badge kind="neutral">{status}</Badge>
    }
  }

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

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/purchases"
            className="p-2 rounded-[10px] border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-[var(--ink)] tracking-tight flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--purple)]" />
                <span>{purchase.purchaseNumber}</span>
              </h1>
              {getStatusBadge(purchase.status)}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ink-soft)] mt-1">
              <span>{formatDateTime(purchase.purchaseDate || purchase.createdAt, language)}</span>
              {purchase.expectedDate ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Expected: {formatDateTime(purchase.expectedDate, language)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Transitions */}
          {canManage && purchase.status === 'DRAFT' ? (
            <Button variant="secondary" onClick={() => handleStatusChange('ORDERED')} disabled={busy}>
              <Send className="h-4 w-4 text-[var(--purple)]" />
              {t('markAsOrdered') || 'Confirm & Mark as Ordered'}
            </Button>
          ) : null}

          {canManage && purchase.status !== 'CANCELLED' && purchase.status !== 'RECEIVED' ? (
            <Button variant="secondary" onClick={() => handleStatusChange('CANCELLED')} disabled={busy}>
              <Ban className="h-4 w-4 text-[var(--red)]" />
              {t('cancelPurchase') || 'Cancel PO'}
            </Button>
          ) : null}

          {/* Receive Items Button */}
          {canReceive && hasUnreceived && purchase.status !== 'DRAFT' ? (
            <Button variant="primary" onClick={handleOpenReceive}>
              <Truck className="h-4 w-4" />
              {t('receiveItemsBtn') || 'Receive Stock'}
            </Button>
          ) : null}

          {/* Record Payment */}
          {canPay && remainingBalance > 0 && purchase.status !== 'CANCELLED' ? (
            <Button variant="secondary" onClick={() => {
              setPaymentForm({
                amount: remainingBalance.toFixed(2),
                paymentMethod: 'CASH',
                reference: '',
                paymentDate: new Date().toISOString().split('T')[0],
                note: '',
              })
              setModalError('')
              setIsPaymentOpen(true)
            }}>
              <Coins className="h-4 w-4 text-[var(--green)]" />
              {t('recordPaymentBtn') || 'Record Payment'}
            </Button>
          ) : null}

          {/* Create Return */}
          {canReturn && totalReceived > 0 ? (
            <Button variant="secondary" onClick={handleOpenReturn}>
              <RotateCcw className="h-4 w-4 text-[var(--red)]" />
              {t('returnGoodsBtn') || 'Return Goods'}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('grandTotal') || 'Total Amount'}
          value={formatMoney(purchase.grandTotal || 0, language)}
          tone="brand"
          icon={DollarSign}
        />
        <StatCard
          label={t('paidLabel') || 'Amount Paid'}
          value={formatMoney(purchase.amountPaid || 0, language)}
          tone="ok"
          icon={CreditCard}
        />
        <StatCard
          label={t('remainingBalance') || 'Remaining Due'}
          value={formatMoney(remainingBalance, language)}
          tone={remainingBalance > 0 ? 'danger' : 'ok'}
          icon={Coins}
        />
        <StatCard
          label={t('fulfillmentProgress') || 'Fulfillment'}
          value={`${totalReceived} / ${totalOrdered}`}
          sublabel={`${Math.round((totalReceived / (totalOrdered || 1)) * 100)}% Received`}
          tone={isFullyReceived ? 'ok' : 'warning'}
          icon={Package}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items & History (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchase Items Card */}
          <Card padded className="space-y-4">
            <h2 className="text-sm font-bold text-[var(--ink)] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[var(--purple)]" />
                <span>{t('purchaseItemsTitle') || 'Ordered Items'}</span>
              </span>
              <span className="text-xs text-[var(--ink-soft)] font-normal">
                {items.length} {t('productsLabel') || 'products'}
              </span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[var(--ink-soft)] font-semibold">
                    <th className="pb-2 text-start">{t('productLabel') || 'Product'}</th>
                    <th className="pb-2 text-center">{t('orderedLabel') || 'Ordered'}</th>
                    <th className="pb-2 text-center">{t('receivedLabel') || 'Received'}</th>
                    <th className="pb-2 text-end">{t('purchaseCostPerItem') || 'Unit Cost'}</th>
                    <th className="pb-2 text-end">{t('discount') || 'Disc'}</th>
                    <th className="pb-2 text-end">{t('totalLabel') || 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {items.map((it) => {
                    const received = it.quantityReceived || 0
                    const lineTotal = Math.max(0, it.quantity * Number(it.unitCost) - Number(it.discount || 0))
                    const isLineFulfilled = received >= it.quantity

                    return (
                      <tr key={it.id} className="py-2.5">
                        <td className="py-2.5 pe-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-[8px] bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center shrink-0 overflow-hidden">
                              {it.product?.thumbnailUrl ? (
                                <img src={it.product.thumbnailUrl} alt={it.product.title} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="h-4 w-4 text-[var(--ink-soft)]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/products/${it.productId}/edit`}
                                className="font-bold text-[var(--ink)] hover:text-[var(--purple)] line-clamp-1"
                              >
                                {it.product?.title || `Product #${it.productId}`}
                              </Link>
                              <div className="text-[11px] text-[var(--ink-soft)]">
                                SKU: {it.product?.sku || '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 text-center font-semibold text-[var(--ink)] tabular-nums">
                          {formatNumber(it.quantity)}
                        </td>
                        <td className="py-2.5 text-center tabular-nums">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              isLineFulfilled
                                ? 'bg-[var(--green-bg)] text-[var(--green)]'
                                : received > 0
                                ? 'bg-[var(--purple-bg)] text-[var(--purple)]'
                                : 'bg-[var(--bg)] text-[var(--ink-soft)]'
                            }`}
                          >
                            {formatNumber(received)}
                          </span>
                        </td>
                        <td className="py-2.5 text-end font-semibold text-[var(--ink)] tabular-nums">
                          {formatMoney(it.unitCost, language)}
                        </td>
                        <td className="py-2.5 text-end text-[var(--ink-soft)] tabular-nums">
                          {Number(it.discount || 0) > 0 ? formatMoney(it.discount, language) : '—'}
                        </td>
                        <td className="py-2.5 text-end font-bold text-[var(--ink)] tabular-nums">
                          {formatMoney(lineTotal, language)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Payments Section */}
          <Card padded className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                <Coins className="h-4 w-4 text-[var(--purple)]" />
                <span>{t('navPayments') || 'Recorded Payments'}</span>
              </h2>

              {canPay && remainingBalance > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPaymentForm({
                      amount: remainingBalance.toFixed(2),
                      paymentMethod: 'CASH',
                      reference: '',
                      paymentDate: new Date().toISOString().split('T')[0],
                      note: '',
                    })
                    setIsPaymentOpen(true)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('recordPaymentBtn') || 'Add Payment'}
                </Button>
              ) : null}
            </div>

            {payments.length === 0 ? (
              <p className="text-xs text-[var(--ink-soft)] italic py-2">
                {t('noPaymentsFound') || 'No payments recorded for this purchase yet.'}
              </p>
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {payments.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[var(--green)] tabular-nums">
                        {formatMoney(p.amount, language)}
                      </div>
                      <div className="text-[11px] text-[var(--ink-soft)] flex items-center gap-2 mt-0.5">
                        <span>{formatDateTime(p.paymentDate || p.createdAt, language)}</span>
                        <span>•</span>
                        <span>{p.paymentMethod}</span>
                        {p.reference ? (
                          <>
                            <span>•</span>
                            <span className="font-mono">Ref: {p.reference}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {p.createdByUser ? (
                      <span className="text-[11px] text-[var(--ink-soft)]">
                        {p.createdByUser.fullName || p.createdByUser.email}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Returns Section if any */}
          {returns.length > 0 ? (
            <Card padded className="space-y-4">
              <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-[var(--red)]" />
                <span>{t('navPurchaseReturns') || 'Associated Returns'}</span>
              </h2>

              <div className="divide-y divide-[var(--line)]">
                {returns.map((ret) => (
                  <div key={ret.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <Link
                        to={`/purchase-returns/${ret.id}`}
                        className="font-bold text-[var(--purple)] hover:underline"
                      >
                        {ret.returnNumber}
                      </Link>
                      <div className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                        {formatDateTime(ret.returnDate || ret.createdAt, language)} — {ret.reason || 'General Return'}
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="font-bold text-[var(--ink)] tabular-nums">
                        {formatMoney(ret.totalAmount, language)}
                      </span>
                      <div className="mt-0.5">
                        <Badge kind={ret.status === 'CONFIRMED' ? 'ok' : 'neutral'}>{ret.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        {/* Right Column: Supplier Info & Financial Breakdown (1 col on lg) */}
        <div className="space-y-6">
          {/* Supplier Info Card */}
          <Card padded className="space-y-3">
            <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--purple)]" />
              <span>{t('supplierInfo') || 'Supplier Details'}</span>
            </h2>

            {purchase.supplier ? (
              <div className="space-y-2 text-xs">
                <Link
                  to={`/suppliers/${purchase.supplier.id}`}
                  className="font-extrabold text-sm text-[var(--purple)] hover:underline flex items-center gap-1.5"
                >
                  <Building2 className="h-4 w-4" />
                  <span>{purchase.supplier.name}</span>
                </Link>
                {purchase.supplier.contactPerson ? (
                  <div className="text-[var(--ink)] flex items-center gap-1.5">
                    <span className="text-[var(--ink-soft)]">{t('supplierContactPerson') || 'Contact'}:</span>
                    <span>{purchase.supplier.contactPerson}</span>
                  </div>
                ) : null}
                {purchase.supplier.phone ? (
                  <div className="text-[var(--ink)] flex items-center gap-1.5 font-mono" dir="ltr">
                    <span className="text-[var(--ink-soft)]">Tel:</span>
                    <span>{purchase.supplier.phone}</span>
                  </div>
                ) : null}
                {purchase.supplier.email ? (
                  <div className="text-[var(--ink)] flex items-center gap-1.5">
                    <span className="text-[var(--ink-soft)]">Email:</span>
                    <span>{purchase.supplier.email}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-soft)]">—</p>
            )}
          </Card>

          {/* Financial Breakdown Card */}
          <Card padded className="space-y-3">
            <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[var(--purple)]" />
              <span>{t('financialSummary') || 'Financial Summary'}</span>
            </h2>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--ink-soft)]">{t('subtotal') || 'Subtotal'}:</span>
                <span className="font-semibold text-[var(--ink)] tabular-nums">
                  {formatMoney(purchase.subtotal || 0, language)}
                </span>
              </div>

              {Number(purchase.shippingCost || 0) > 0 ? (
                <div className="flex justify-between items-center">
                  <span className="text-[var(--ink-soft)]">{t('shippingCost') || 'Shipping'}:</span>
                  <span className="font-semibold text-[var(--ink)] tabular-nums">
                    {formatMoney(purchase.shippingCost, language)}
                  </span>
                </div>
              ) : null}

              {Number(purchase.taxAmount || 0) > 0 ? (
                <div className="flex justify-between items-center">
                  <span className="text-[var(--ink-soft)]">{t('taxAmount') || 'Tax / VAT'}:</span>
                  <span className="font-semibold text-[var(--ink)] tabular-nums">
                    {formatMoney(purchase.taxAmount, language)}
                  </span>
                </div>
              ) : null}

              {Number(purchase.discountAmount || 0) > 0 ? (
                <div className="flex justify-between items-center">
                  <span className="text-[var(--ink-soft)]">{t('overallDiscount') || 'Discount'}:</span>
                  <span className="font-semibold text-[var(--green)] tabular-nums">
                    -{formatMoney(purchase.discountAmount, language)}
                  </span>
                </div>
              ) : null}

              <div className="border-t border-[var(--line)] pt-2.5 flex justify-between items-center">
                <span className="text-sm font-bold text-[var(--ink)]">{t('grandTotal') || 'Grand Total'}:</span>
                <span className="text-base font-extrabold text-[var(--purple)] tabular-nums">
                  {formatMoney(purchase.grandTotal || 0, language)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-[var(--line)]/50">
                <span className="text-[var(--ink-soft)]">{t('paidLabel') || 'Amount Paid'}:</span>
                <span className="font-bold text-[var(--green)] tabular-nums">
                  {formatMoney(purchase.amountPaid || 0, language)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[var(--ink-soft)]">{t('remainingBalance') || 'Remaining Due'}:</span>
                <span
                  className={`font-extrabold tabular-nums ${
                    remainingBalance > 0 ? 'text-[var(--red)]' : 'text-[var(--ink-soft)]'
                  }`}
                >
                  {formatMoney(remainingBalance, language)}
                </span>
              </div>
            </div>
          </Card>

          {/* Notes Card */}
          {purchase.notes ? (
            <Card padded className="space-y-2">
              <h2 className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wider">
                {t('notesLabel') || 'Purchase Notes'}
              </h2>
              <p className="text-xs text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
                {purchase.notes}
              </p>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Receive Stock Modal */}
      <Modal
        open={isReceiveOpen}
        onClose={() => !busy && setIsReceiveOpen(false)}
        title={t('receiveItemsBtn') || 'Receive Stock from Supplier'}
        width="max-w-2xl"
      >
        <form onSubmit={handleReceiveSubmit} className="space-y-4">
          {modalError ? <ErrorBanner message={modalError} /> : null}

          <div className="p-3 rounded-[10px] bg-[var(--purple-bg)]/40 border border-[var(--purple)]/20 text-xs text-[var(--ink)] leading-relaxed">
            {t('receiveStockNotice') ||
              'Entering received items updates inventory stock and records immutable StockMovements.'}
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pe-1">
            {items.map((it) => {
              const remaining = Math.max(0, it.quantity - (it.quantityReceived || 0))
              return (
                <div
                  key={it.id}
                  className="p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[var(--ink)] line-clamp-1">{it.product?.title}</div>
                    <div className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                      Ordered: {it.quantity} | Already received: {it.quantityReceived || 0} |{' '}
                      <span className="font-semibold text-[var(--purple)]">Remaining: {remaining}</span>
                    </div>
                  </div>

                  <div className="w-28 shrink-0">
                    <label className="block text-[10.5px] font-semibold text-[var(--ink-soft)] mb-0.5">
                      {t('receiveNow') || 'Receive Now'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      value={receiveInputs[it.id] ?? ''}
                      onChange={(e) =>
                        setReceiveInputs({
                          ...receiveInputs,
                          [it.id]: e.target.value,
                        })
                      }
                      className="w-full rounded-[8px] border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--ink)] font-mono text-center focus:border-[var(--purple)] focus:outline-none"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <Input
            label={t('notesLabel') || 'Receipt Note / Delivery Slip #'}
            placeholder="e.g. Delivery Slip #BL-88192 via Carrier X"
            value={receiveNote}
            onChange={(e) => setReceiveNote(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsReceiveOpen(false)}
              disabled={busy}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? (t('saving') || 'Receiving…') : (t('confirmReceive') || 'Confirm Goods Receipt')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        open={isPaymentOpen}
        onClose={() => !busy && setIsPaymentOpen(false)}
        title={t('recordPaymentBtn') || 'Record Payment'}
        width="max-w-md"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          {modalError ? <ErrorBanner message={modalError} /> : null}

          <div className="p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)] text-xs flex justify-between items-center">
            <span className="text-[var(--ink-soft)]">{t('remainingBalance') || 'Due Amount'}:</span>
            <span className="font-bold tabular-nums text-[var(--red)]">
              {formatMoney(remainingBalance, language)}
            </span>
          </div>

          <Input
            label={t('paymentAmount') || 'Payment Amount (MAD) *'}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('paymentMethod') || 'Payment Method'}
              value={paymentForm.paymentMethod}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
            >
              <option value="CASH">{t('methodCash') || 'Cash'}</option>
              <option value="BANK_TRANSFER">{t('methodBankTransfer') || 'Bank Transfer'}</option>
              <option value="CARD">{t('methodCard') || 'Card'}</option>
              <option value="OTHER">{t('methodOther') || 'Other'}</option>
            </Select>

            <Input
              label={t('paymentDate') || 'Date'}
              type="date"
              value={paymentForm.paymentDate}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
              required
            />
          </div>

          <Input
            label={t('paymentReference') || 'Reference'}
            placeholder="Cheque # or Bank Transfer ID"
            value={paymentForm.reference}
            onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
          />

          <Textarea
            label={t('notesLabel') || 'Notes'}
            placeholder="Payment details..."
            value={paymentForm.note}
            onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
            rows={2}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsPaymentOpen(false)}
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

      {/* Return Goods Modal */}
      <Modal
        open={isReturnModalOpen}
        onClose={() => !busy && setIsReturnModalOpen(false)}
        title={t('returnGoodsBtn') || 'Return Goods to Supplier'}
        width="max-w-2xl"
      >
        <form onSubmit={handleReturnSubmit} className="space-y-4">
          {modalError ? <ErrorBanner message={modalError} /> : null}

          <div className="p-3 rounded-[10px] bg-[var(--red-bg)]/40 border border-[var(--red)]/20 text-xs text-[var(--ink)] leading-relaxed">
            {t('returnGoodsNotice') ||
              'Returning items safely deducts stock from inventory and credits the supplier balance.'}
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pe-1">
            {items
              .filter((it) => (it.quantityReceived || 0) > 0)
              .map((it) => {
                const received = it.quantityReceived || 0
                return (
                  <div
                    key={it.id}
                    className="p-3 rounded-[10px] bg-[var(--bg)] border border-[var(--line)] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[var(--ink)] line-clamp-1">{it.product?.title}</div>
                      <div className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                        Received: {received} | Unit Cost: {formatMoney(it.unitCost, language)}
                      </div>
                    </div>

                    <div className="w-28 shrink-0">
                      <label className="block text-[10.5px] font-semibold text-[var(--ink-soft)] mb-0.5">
                        {t('returnQuantity') || 'Return Qty'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={received}
                        value={returnInputs[it.id] ?? 0}
                        onChange={(e) =>
                          setReturnInputs({
                            ...returnInputs,
                            [it.id]: e.target.value,
                          })
                        }
                        className="w-full rounded-[8px] border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--ink)] font-mono text-center focus:border-[var(--purple)] focus:outline-none"
                      />
                    </div>
                  </div>
                )
              })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('returnReason') || 'Reason for Return'}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
            >
              <option value="DAMAGED">{t('returnReasonDamaged') || 'Damaged / Defective'}</option>
              <option value="WRONG_ITEM">{t('returnReasonWrongItem') || 'Wrong Item Received'}</option>
              <option value="EXCESS_STOCK">{t('returnReasonExcessStock') || 'Excess Stock'}</option>
              <option value="OTHER">{t('returnReasonOther') || 'Other'}</option>
            </Select>

            <Input
              label={t('notesLabel') || 'Notes'}
              placeholder="Damage description or supplier agreement..."
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsReturnModalOpen(false)}
              disabled={busy}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="danger" type="submit" disabled={busy}>
              {busy ? (t('saving') || 'Processing…') : (t('confirmReturn') || 'Confirm Return & Deduct Stock')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
