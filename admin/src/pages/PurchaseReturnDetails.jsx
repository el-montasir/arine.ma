import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  RotateCcw,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  Package,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Check,
  Ban,
  Clock,
} from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatDateTime, formatNumber } from '../lib/format.js'
import { PageHeader, Card, StatCard } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import Button from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function PurchaseReturnDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { can, isOwner } = useAuth()

  const canManage = isOwner || can('RETURNS_MANAGE')

  const { data: responseData, loading, error, reload } = useFetch(`/purchase-returns/${id}`)
  const returnData = responseData?.data || responseData

  const [busy, setBusy] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [actionError, setActionError] = useState('')

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const handleConfirmReturn = async () => {
    setBusy(true)
    setActionError('')
    try {
      await api.post(`/purchase-returns/${id}/confirm`, {})
      showToast(t('returnConfirmedSuccess') || 'Purchase return confirmed and stock deducted successfully')
      reload()
    } catch (err) {
      setActionError(err.message || 'Failed to confirm purchase return')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !returnData) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner label={t('loadingData') || 'Loading return details...'} />
      </div>
    )
  }

  if (error || !returnData) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error || 'Purchase return not found'} />
        <Button variant="secondary" onClick={() => navigate('/purchase-returns')}>
          <ArrowLeft className="h-4 w-4" /> {t('backToReturns') || 'Back to Returns'}
        </Button>
      </div>
    )
  }

  const items = returnData.items || []
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge kind="ok">{t('returnStatusConfirmed') || 'Confirmed'}</Badge>
      case 'DRAFT':
        return <Badge kind="neutral">{t('returnStatusDraft') || 'Draft'}</Badge>
      case 'CANCELLED':
        return <Badge kind="neutral">{t('returnStatusCancelled') || 'Cancelled'}</Badge>
      default:
        return <Badge kind="neutral">{status}</Badge>
    }
  }

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

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/purchase-returns"
            className="p-2 rounded-[10px] border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-[var(--ink)] tracking-tight flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-[var(--purple)]" />
                <span>{returnData.returnNumber}</span>
              </h1>
              {getStatusBadge(returnData.status)}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ink-soft)] mt-1">
              <span>{formatDateTime(returnData.returnDate || returnData.createdAt, language)}</span>
              {returnData.purchase ? (
                <span className="flex items-center gap-1">
                  • {t('purchaseOrderLabel') || 'Original PO'}:{' '}
                  <Link
                    to={`/purchases/${returnData.purchase.id}`}
                    className="font-bold text-[var(--purple)] hover:underline"
                  >
                    {returnData.purchase.purchaseNumber}
                  </Link>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canManage && returnData.status === 'DRAFT' ? (
            <Button variant="primary" onClick={handleConfirmReturn} disabled={busy}>
              <Check className="h-4 w-4" />
              {busy ? (t('saving') || 'Confirming…') : (t('confirmReturnBtn') || 'Confirm & Deduct Stock')}
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? <ErrorBanner message={actionError} /> : null}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t('totalReturnAmount') || 'Total Credit Amount'}
          value={formatMoney(returnData.totalAmount || 0, language)}
          tone="brand"
          icon={DollarSign}
        />
        <StatCard
          label={t('itemsReturnedCount') || 'Total Items Returned'}
          value={formatNumber(totalItemsCount)}
          tone="default"
          icon={Package}
        />
        <StatCard
          label={t('supplierBalance') || 'Supplier Current Balance'}
          value={formatMoney(returnData.supplier?.currentBalance || 0, language)}
          tone={Number(returnData.supplier?.currentBalance || 0) > 0 ? 'danger' : 'ok'}
          icon={Building2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Return Items (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          <Card padded className="space-y-4">
            <h2 className="text-sm font-bold text-[var(--ink)] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[var(--purple)]" />
                <span>{t('returnedItemsList') || 'Returned Line Items'}</span>
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
                    <th className="pb-2 text-center">{t('quantityLabel') || 'Quantity'}</th>
                    <th className="pb-2 text-end">{t('purchaseCostPerItem') || 'Unit Cost'}</th>
                    <th className="pb-2 text-start ps-4">{t('returnReason') || 'Reason'}</th>
                    <th className="pb-2 text-end">{t('totalLabel') || 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {items.map((it) => {
                    const lineTotal = it.quantity * Number(it.unitCost)

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
                        <td className="py-2.5 text-center font-bold text-[var(--red)] tabular-nums">
                          -{formatNumber(it.quantity)}
                        </td>
                        <td className="py-2.5 text-end font-semibold text-[var(--ink)] tabular-nums">
                          {formatMoney(it.unitCost, language)}
                        </td>
                        <td className="py-2.5 text-start ps-4 text-[var(--ink-soft)]">
                          {it.reason || returnData.reason || '—'}
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
        </div>

        {/* Right Column: Supplier & Reason/Notes (1 col on lg) */}
        <div className="space-y-6">
          {/* Supplier Info Card */}
          <Card padded className="space-y-3">
            <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--purple)]" />
              <span>{t('supplierInfo') || 'Supplier Information'}</span>
            </h2>

            {returnData.supplier ? (
              <div className="space-y-2 text-xs">
                <Link
                  to={`/suppliers/${returnData.supplier.id}`}
                  className="font-extrabold text-sm text-[var(--purple)] hover:underline flex items-center gap-1.5"
                >
                  <Building2 className="h-4 w-4" />
                  <span>{returnData.supplier.name}</span>
                </Link>
                {returnData.supplier.contactPerson ? (
                  <div className="text-[var(--ink)] flex items-center gap-1.5">
                    <span className="text-[var(--ink-soft)]">{t('supplierContactPerson') || 'Contact'}:</span>
                    <span>{returnData.supplier.contactPerson}</span>
                  </div>
                ) : null}
                {returnData.supplier.phone ? (
                  <div className="text-[var(--ink)] flex items-center gap-1.5 font-mono" dir="ltr">
                    <span className="text-[var(--ink-soft)]">Tel:</span>
                    <span>{returnData.supplier.phone}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-soft)]">—</p>
            )}
          </Card>

          {/* Return Info Card */}
          <Card padded className="space-y-3">
            <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-[var(--purple)]" />
              <span>{t('returnDetails') || 'Return Details'}</span>
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--ink-soft)]">{t('returnReason') || 'Primary Reason'}:</span>
                <span className="font-semibold text-[var(--ink)]">{returnData.reason || 'DAMAGED'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[var(--ink-soft)]">{t('totalAmount') || 'Credit Value'}:</span>
                <span className="font-extrabold text-[var(--purple)] tabular-nums">
                  {formatMoney(returnData.totalAmount || 0, language)}
                </span>
              </div>
            </div>

            {returnData.notes ? (
              <div className="pt-2 border-t border-[var(--line)]">
                <span className="block text-[11px] font-semibold text-[var(--ink-soft)] mb-1">
                  {t('notesLabel') || 'Notes'}:
                </span>
                <p className="text-xs text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
                  {returnData.notes}
                </p>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  )
}
