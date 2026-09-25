import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Save, MapPin, Phone, User, StickyNote, Truck, Package as PackageIcon, Trash2 } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatDate, getPaymentLabel, getOrderStatus } from '../lib/format.js'
import { getImageUrl } from '../lib/images.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import { StatusBadge } from '../components/ui/Badge.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'
import Modal from '../components/ui/Modal.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const STATUS_KEYS = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED']

export default function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, language, isRTL } = useLanguage()
  const { can, isOwner } = useAuth()
  const BackIcon = isRTL ? ArrowRight : ArrowLeft

  const { data: order, loading, error, reload } = useFetch(`/orders/${id}`)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function saveStatus() {
    if (!status) return
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      await api.patch(`/orders/${id}/status`, { status })
      setSaved(true)
      window.dispatchEvent(new Event('order-status-updated'))
      reload()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteOrder() {
    setDeleting(true)
    setDeleteError('')
    try {
      await api.del(`/orders/${id}`)
      window.dispatchEvent(new Event('order-status-updated'))
      navigate('/orders')
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (error) {
    return (
      <div>
        <PageHeader title={t('orderDetailsTitle')} />
        <ErrorBanner message={error} />
      </div>
    )
  }
  if (loading || !order) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t('loadingOrder')} />
      </div>
    )
  }

  const st = getOrderStatus(order.status, t)
  const fin = order.finance || {}
  const bookItems = order.items || []
  const packageItems = order.packageItems || []
  const canDelete = can('ORDERS_DELETE') || isOwner

  const itemsCols = [
    {
      key: 'product',
      label: t('colBook'),
      render: (r) => (
        <div className="flex items-center gap-2.5">
          {r.productImage ? (
            <img src={getImageUrl(r.productImage)} alt="" className="h-10 w-8 rounded-[6px] object-cover border border-[var(--line)] shrink-0" />
          ) : null}
          <div>
            <span className="font-semibold text-[var(--ink)] block">{r.productTitle}</span>
            {r.productId == null && (
              <span className="text-[10px] text-[var(--ink-soft)] block">{t('deletedProductNote')}</span>
            )}
          </div>
        </div>
      ),
    },
    { key: 'qty', label: t('colQty'), render: (r) => r.quantity },
    { key: 'unitPrice', label: t('colPrice'), render: (r) => <span className="tabular-nums font-semibold">{formatMoney(r.unitPrice, language)}</span> },
    { key: 'unitCost', label: t('colCostPrice'), render: (r) => <span className="tabular-nums text-[var(--ink-soft)]">{formatMoney(r.unitCostPrice, language)}</span> },
    { key: 'revenue', label: t('colRevenue'), render: (r) => <span className="tabular-nums font-semibold">{formatMoney(r.lineRevenue, language)}</span> },
    {
      key: 'profit',
      label: t('colProfit'),
      render: (r) => (
        <span className={`tabular-nums font-bold ${r.lineProfit == null ? 'text-[var(--ink-soft)]' : r.lineProfit < 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>
          {r.lineProfit == null ? '—' : formatMoney(r.lineProfit, language)}
        </span>
      ),
    },
  ]

  const packageCols = [
    {
      key: 'package',
      label: t('colPackage'),
      render: (r) => (
        <div className="flex items-center gap-2.5">
          {r.packageImage ? (
            <img src={getImageUrl(r.packageImage)} alt="" className="h-10 w-10 rounded-[8px] object-cover border border-[var(--line)] shrink-0" />
          ) : (
            <PackageIcon className="h-5 w-5 text-[var(--purple)] shrink-0" />
          )}
          <div>
            <span className="font-semibold text-[var(--ink)] block">{r.packageTitle}</span>
            {r.packageId == null && (
              <span className="text-[10px] text-[var(--ink-soft)] block">{t('deletedPackageNote')}</span>
            )}
            {r.itemsSnapshot && Array.isArray(r.itemsSnapshot) && r.itemsSnapshot.length > 0 && (
              <span className="text-[11px] text-[var(--ink-soft)] block mt-0.5">
                {r.itemsSnapshot.map((item) => item.title).filter(Boolean).join(' + ')}
              </span>
            )}
          </div>
        </div>
      ),
    },
    { key: 'qty', label: t('colQty'), render: (r) => r.quantity },
    { key: 'unitPrice', label: t('colPrice'), render: (r) => <span className="tabular-nums font-semibold">{formatMoney(r.unitPrice, language)}</span> },
    { key: 'unitCost', label: t('colCostPrice'), render: (r) => <span className="tabular-nums text-[var(--ink-soft)]">{formatMoney(r.unitCostPrice, language)}</span> },
    { key: 'revenue', label: t('colRevenue'), render: (r) => <span className="tabular-nums font-semibold">{formatMoney(r.lineRevenue, language)}</span> },
    {
      key: 'profit',
      label: t('colProfit'),
      render: (r) => (
        <span className={`tabular-nums font-bold ${r.lineProfit == null ? 'text-[var(--ink-soft)]' : r.lineProfit < 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>
          {r.lineProfit == null ? '—' : formatMoney(r.lineProfit, language)}
        </span>
      ),
    },
  ]

  return (
    <div>
      <button
        onClick={() => navigate('/orders')}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors cursor-pointer"
      >
        <BackIcon className="h-4 w-4" aria-hidden="true" />
        {t('back')} — {t('ordersTitle')}
      </button>

      <PageHeader
        title={<span dir="ltr" className="inline-block font-mono font-bold text-[var(--purple)]">{order.orderNumber}</span>}
        subtitle={`${t('orderCreatedOn')} ${formatDate(order.createdAt, language)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge kind={st.color} label={st.label} />
            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setDeleteError('')
                  setShowDeleteModal(true)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t('deleteOrderBtn')}</span>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Customer & Status column */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3.5 flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
              <User className="h-4 w-4 text-[var(--purple)]" aria-hidden="true" /> {t('customerInfoTitle')}
            </h2>
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[var(--ink-soft)] block text-[11px] font-medium">{t('customerNameLabel')}</span>
                <span className="font-semibold text-[var(--ink)]">{order.fullName}</span>
              </div>
              <div>
                <span className="text-[var(--ink-soft)] block text-[11px] font-medium">{t('customerPhoneLabel')}</span>
                <a href={`tel:${order.phone}`} className="font-mono font-semibold text-[var(--purple)] hover:underline inline-flex items-center gap-1" dir="ltr">
                  <Phone className="h-3 w-3" /> {order.phone}
                </a>
              </div>
              <div>
                <span className="text-[var(--ink-soft)] block text-[11px] font-medium">{t('customerCityCol')}</span>
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[var(--ink-soft)]" /> {order.city}
                </span>
              </div>
              {order.address && (
                <div>
                  <span className="text-[var(--ink-soft)] block text-[11px] font-medium">{t('customerAddressLabel')}</span>
                  <span className="text-[var(--ink)]">{order.address}</span>
                </div>
              )}
              {order.notes && (
                <div className="rounded-[10px] bg-[var(--bg)] p-2.5 border border-[var(--line)]">
                  <span className="text-[var(--ink-soft)] block text-[11px] font-semibold flex items-center gap-1">
                    <StickyNote className="h-3 w-3" /> {t('customerNotesLabel')}
                  </span>
                  <p className="mt-1 text-[var(--ink)] text-xs">{order.notes}</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3.5 flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
              <Truck className="h-4 w-4 text-[var(--purple)]" aria-hidden="true" /> {t('updateStatusTitle')}
            </h2>
            {saveError ? <ErrorBanner message={saveError} /> : null}
            {saved ? (
              <div className="mb-3 rounded-[10px] border border-[var(--green)]/30 bg-[var(--green-bg)] px-3 py-2 text-xs font-semibold text-[var(--green)]">
                {t('statusUpdatedSuccess')}
              </div>
            ) : null}
            <div className="space-y-3">
              <select
                value={status || order.status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--ink)] focus:border-[var(--purple)] focus:outline-none"
              >
                {STATUS_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {getOrderStatus(k, t).label}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={saveStatus}
                disabled={saving || !status || status === order.status}
                className="w-full"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? t('saving') : t('saveChanges')}
              </Button>
            </div>
          </Card>
        </div>

        {/* Order details & financial summary */}
        <div className="space-y-4 lg:col-span-2">
          {bookItems.length > 0 && (
            <Card padded={false}>
              <div className="border-b border-[var(--line)] px-5 py-3.5 font-bold text-sm text-[var(--ink)]">
                {t('booksInOrder')} ({bookItems.length})
              </div>
              <Table columns={itemsCols} rows={bookItems} rowKey={(r) => r.id} />
            </Card>
          )}

          {packageItems.length > 0 && (
            <Card padded={false}>
              <div className="border-b border-[var(--line)] px-5 py-3.5 font-bold text-sm text-[var(--ink)]">
                {t('packagesInOrder')} ({packageItems.length})
              </div>
              <Table columns={packageCols} rows={packageItems} rowKey={(r) => r.id} />
            </Card>
          )}

          <Card>
            <h2 className="mb-3 text-sm font-bold text-[var(--ink)]">{t('financialSummaryTitle')}</h2>
            <div className="space-y-2 text-xs divide-y divide-[var(--line)]">
              <div className="flex justify-between py-1 text-[var(--ink-soft)] font-medium">
                <span>{t('subtotalLabel')}</span>
                <span className="tabular-nums font-semibold text-[var(--ink)]">{formatMoney(order.subtotal, language)}</span>
              </div>
              <div className="flex justify-between py-1 text-[var(--ink-soft)] font-medium">
                <span>{t('shippingFeeLabel')}</span>
                <span className="tabular-nums font-semibold text-[var(--ink)]">{formatMoney(order.shipping, language)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-extrabold text-[var(--ink)]">
                <span>{t('total')}</span>
                <span className="tabular-nums text-[var(--purple)]">{formatMoney(order.total, language)}</span>
              </div>
              {fin.revenue != null && (
                <div className="pt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-[var(--ink-soft)]">
                    <span>{t('totalCogs')}</span>
                    <span className="tabular-nums font-semibold">{formatMoney(fin.cost, language)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>{t('netProfitLabel')}</span>
                    <span className={`tabular-nums ${fin.profit < 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>
                      {formatMoney(fin.profit, language)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Order Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title={t('deleteOrderTitle')}
      >
        <div className="space-y-3">
          <p className="text-xs text-[var(--ink)]">
            {t('deleteOrderConfirm')}
          </p>
          <div className="rounded-[8px] border border-[var(--line)] bg-[var(--bg)] p-3 text-xs">
            <div className="text-[var(--ink-soft)] font-mono">
              {t('orderNumber')}: <strong className="text-[var(--purple)] font-bold">{order.orderNumber}</strong>
            </div>
            <div className="text-[var(--ink-soft)] mt-1.5">
              {t('customerName')}: <strong className="text-[var(--ink)] font-semibold">{order.fullName}</strong> ({order.phone})
            </div>
            <div className="text-[var(--ink-soft)] mt-1">
              {t('orderTotal')}: <strong className="text-[var(--ink)] tabular-nums font-bold">{formatMoney(order.total, language)}</strong>
            </div>
          </div>
          <p className="text-xs text-[var(--red)] font-medium">
            {t('deleteOrderWarning')}
          </p>
          {deleteError ? <ErrorBanner message={deleteError} onDismiss={() => setDeleteError('')} /> : null}
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--line)] pt-3">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
            {t('cancel')}
          </Button>
          <Button variant="danger" onClick={handleDeleteOrder} disabled={deleting}>
            {deleting ? t('deletingOrder') : t('delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
