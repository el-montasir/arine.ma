import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Save, MapPin, Phone, User, StickyNote, Truck, Package as PackageIcon } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatDate, getPaymentLabel, getOrderStatus } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import { StatusBadge, Badge } from '../components/ui/Badge.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

const STATUS_KEYS = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED']

export default function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, language, isRTL } = useLanguage()
  const BackIcon = isRTL ? ArrowRight : ArrowLeft

  const { data: order, loading, error, reload } = useFetch(`/orders/${id}`)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  async function saveStatus() {
    if (!status) return
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      await api.patch(`/orders/${id}/status`, { status })
      setSaved(true)
      reload()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
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

  const itemsCols = [
    {
      key: 'product',
      label: t('colBook'),
      render: (r) => (
        <div className="flex items-center gap-2.5">
          {r.productImage ? (
            <img src={r.productImage} alt="" className="h-10 w-8 rounded object-cover border border-line shrink-0" />
          ) : null}
          <div>
            <span className="font-medium text-white block">{r.productTitle}</span>
            {r.productId == null && (
              <span className="text-[10px] text-[#8b80a8] block">{t('deletedProductNote')}</span>
            )}
          </div>
        </div>
      ),
    },
    { key: 'qty', label: t('colQty'), render: (r) => r.quantity },
    { key: 'unitPrice', label: t('colPrice'), render: (r) => <span className="tabular-nums">{formatMoney(r.unitPrice, language)}</span> },
    { key: 'unitCost', label: t('colCostPrice'), render: (r) => <span className="tabular-nums text-[#a79cc4]">{formatMoney(r.unitCostPrice, language)}</span> },
    { key: 'revenue', label: t('colRevenue'), render: (r) => <span className="tabular-nums">{formatMoney(r.lineRevenue, language)}</span> },
    {
      key: 'profit',
      label: t('colProfit'),
      render: (r) => (
        <span className={`tabular-nums ${r.lineProfit == null ? 'text-[#6f6488]' : r.lineProfit < 0 ? 'text-danger-400' : 'text-ok-400'}`}>
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
            <img src={r.packageImage} alt="" className="h-10 w-10 rounded-lg object-cover border border-line shrink-0" />
          ) : (
            <PackageIcon className="h-5 w-5 text-brand-400 shrink-0" />
          )}
          <div>
            <span className="font-medium text-white block">{r.packageTitle}</span>
            {r.packageId == null && (
              <span className="text-[10px] text-[#8b80a8] block">{t('deletedPackageNote')}</span>
            )}
            {r.itemsSnapshot && Array.isArray(r.itemsSnapshot) && r.itemsSnapshot.length > 0 && (
              <span className="text-[11px] text-[#a79cc4] block mt-0.5">
                {r.itemsSnapshot.map((item) => item.title).filter(Boolean).join(' + ')}
              </span>
            )}
          </div>
        </div>
      ),
    },
    { key: 'qty', label: t('colQty'), render: (r) => r.quantity },
    { key: 'unitPrice', label: t('colPrice'), render: (r) => <span className="tabular-nums">{formatMoney(r.unitPrice, language)}</span> },
    { key: 'unitCost', label: t('colCostPrice'), render: (r) => <span className="tabular-nums text-[#a79cc4]">{formatMoney(r.unitCostPrice, language)}</span> },
    { key: 'revenue', label: t('colRevenue'), render: (r) => <span className="tabular-nums">{formatMoney(r.lineRevenue, language)}</span> },
    {
      key: 'profit',
      label: t('colProfit'),
      render: (r) => (
        <span className={`tabular-nums ${r.lineProfit == null ? 'text-[#6f6488]' : r.lineProfit < 0 ? 'text-danger-400' : 'text-ok-400'}`}>
          {r.lineProfit == null ? '—' : formatMoney(r.lineProfit, language)}
        </span>
      ),
    },
  ]

  return (
    <div>
      <button
        onClick={() => navigate('/orders')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#8b80a8] hover:text-white transition-colors"
      >
        <BackIcon className="h-4 w-4" aria-hidden="true" />
        {t('back')} — {t('ordersTitle')}
      </button>

      <PageHeader
        title={<span dir="ltr" className="inline-block font-mono text-lg">{order.orderNumber}</span>}
        subtitle={`${t('orderCreatedOn')} ${formatDate(order.createdAt, language)}`}
        actions={<StatusBadge kind={st.color} label={st.label} />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Customer & Status column */}
        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <User className="h-4 w-4 text-brand-400" aria-hidden="true" /> {t('customerInfoTitle')}
            </h2>
            <dl className="space-y-3 text-sm">
              <Detail icon={<User className="h-4 w-4 text-[#8b80a8]" aria-hidden="true" />} label={t('customerNameLabel')} value={order.fullName} />
              <Detail icon={<Phone className="h-4 w-4 text-[#8b80a8]" aria-hidden="true" />} label={t('customerPhoneLabel')} value={<span dir="ltr">{order.phone}</span>} />
              <Detail icon={<MapPin className="h-4 w-4 text-[#8b80a8]" aria-hidden="true" />} label={t('customerCityLabel')} value={order.city} />
              <Detail icon={<MapPin className="h-4 w-4 text-[#8b80a8]" aria-hidden="true" />} label={t('customerAddressLabel')} value={order.address} />
              {order.note ? <Detail icon={<StickyNote className="h-4 w-4 text-[#8b80a8]" aria-hidden="true" />} label={t('customerNoteLabel')} value={order.note} /> : null}
            </dl>
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-white">{t('paymentAndStatusTitle')}</h2>
            <dl className="space-y-3 text-sm">
              <Detail label={t('paymentMethodLabel')} value={getPaymentLabel(order.paymentMethod, t)} />
              <Detail label={t('currentStatusLabel')} value={<StatusBadge kind={st.color} label={st.label} />} />
            </dl>
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-[#c0b6d6]" htmlFor="order-status">
                {t('changeStatusLabel')}
              </label>
              <div className="flex gap-2">
                <select
                  id="order-status"
                  value={status || order.status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                >
                  {STATUS_KEYS.map((val) => (
                    <option key={val} value={val}>{getOrderStatus(val, t).label}</option>
                  ))}
                </select>
                <Button variant="primary" size="md" onClick={saveStatus} disabled={saving || !status || status === order.status}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {saving ? '…' : t('save')}
                </Button>
              </div>
              {saveError ? <p className="mt-2 text-xs text-danger-400">{saveError}</p> : null}
              {saved ? <p className="mt-2 text-xs text-ok-400">{t('statusUpdatedSuccess')}</p> : null}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Truck className="h-4 w-4 text-brand-400" aria-hidden="true" /> {t('shippingAndDeliveryTitle')}
            </h2>
            <p className="text-xs leading-relaxed text-[#8b80a8]">
              {t('shippingExplanation')}
            </p>
          </Card>
        </div>

        {/* Items + Finance summary column */}
        <div className="space-y-5 lg:col-span-2">
          {bookItems.length > 0 && (
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-white">{t('orderedBooksTitle')}</h2>
              <p className="mb-4 text-xs text-[#8b80a8]">
                {t('orderedBooksCostNote')}
              </p>
              <Table columns={itemsCols} rows={bookItems} rowKey={(r) => r.id} empty={t('noBooks')} />
            </Card>
          )}

          {packageItems.length > 0 && (
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-white flex items-center gap-2">
                <PackageIcon className="h-4 w-4 text-brand-400" />
                {t('orderedPackagesTitle')}
              </h2>
              <p className="mb-4 text-xs text-[#8b80a8]">
                {t('orderedPackagesDesc')}
              </p>
              <Table columns={packageCols} rows={packageItems} rowKey={(r) => r.id} empty={t('noPackages')} />
            </Card>
          )}

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-white">{t('orderSummaryTitle')}</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Summary label={t('subtotal')} value={formatMoney(order.subtotal, language)} />
              <Summary label={t('shipping')} value={formatMoney(order.shipping, language)} />
              <Summary label={t('orderTotal')} value={formatMoney(order.total, language)} strong />
              <Summary label={t('goodsRevenue')} value={formatMoney(fin.revenue, language)} />
              <Summary
                label={t('costPrice')}
                value={formatMoney(fin.cost, language)}
                sub={fin.costUnknownItems > 0 ? t('costUnknownItems', { count: fin.costUnknownItems }) : ''}
              />
              <Summary
                label={t('profit')}
                value={fin.profit == null ? '—' : formatMoney(fin.profit, language)}
                tone={fin.profit == null ? 'muted' : fin.profit < 0 ? 'danger' : 'ok'}
                sub={fin.costUnknownItems > 0 ? t('estimated') : ''}
              />
            </dl>
            {fin.costUnknownItems > 0 ? (
              <div className="mt-4">
                <Badge kind="warn">{t('profitEstimatedWarning')}</Badge>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Detail({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="min-w-0">
        <dt className="text-xs text-[#8b80a8]">{label}</dt>
        <dd className="mt-0.5 text-sm text-[#e3dcf0]">{value}</dd>
      </div>
    </div>
  )
}

function Summary({ label, value, sub, strong, tone }) {
  const tones = { danger: 'text-danger-400', ok: 'text-ok-400', muted: 'text-[#8b80a8]', normal: 'text-white' }
  return (
    <div className="rounded-lg border border-line-soft bg-ink-900 p-3">
      <dt className="text-[11px] text-[#8b80a8]">{label}</dt>
      <dd className={`mt-1 tabular-nums ${strong ? 'text-lg font-bold text-white' : `text-sm ${tones[tone] || tones.normal}`}`}>
        {value}
      </dd>
      {sub ? <dd className="text-[10px] text-warn-400 mt-0.5">{sub}</dd> : null}
    </div>
  )
}
