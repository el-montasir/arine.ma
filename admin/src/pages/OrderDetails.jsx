import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Save, MapPin, Phone, User, StickyNote, Truck } from 'lucide-react'
import useFetch from '../lib/useFetch.js'
import { api } from '../lib/api.js'
import { formatMoney, formatDate, PAYMENT_LABEL, orderStatus, ORDER_STATUS } from '../lib/format.js'
import { PageHeader, Card } from '../components/ui/Card.jsx'
import { StatusBadge, Badge } from '../components/ui/Badge.jsx'
import Table from '../components/ui/Table.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'

export default function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
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
        <PageHeader title="تفاصيل الطلب" />
        <ErrorBanner message={error} />
      </div>
    )
  }
  if (loading || !order) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="جارِ تحميل الطلب…" />
      </div>
    )
  }

  const st = orderStatus(order.status)
  const fin = order.finance
  const itemsCols = [
    { key: 'product', label: 'الكتاب', render: (r) => <span className="font-medium">{r.productTitle}</span> },
    { key: 'qty', label: 'الكمية', render: (r) => r.quantity },
    { key: 'unitPrice', label: 'سعر البيع', render: (r) => <span className="tabular-nums">{formatMoney(r.unitPrice)}</span> },
    { key: 'unitCost', label: 'سعر الشراء', render: (r) => <span className="tabular-nums text-[#a79cc4]">{formatMoney(r.unitCostPrice)}</span> },
    { key: 'revenue', label: 'الإيراد', render: (r) => <span className="tabular-nums">{formatMoney(r.lineRevenue)}</span> },
    { key: 'profit', label: 'الربح', render: (r) => (
      <span className={`tabular-nums ${r.lineProfit == null ? 'text-[#6f6488]' : r.lineProfit < 0 ? 'text-danger-400' : 'text-ok-400'}`}>
        {r.lineProfit == null ? '—' : formatMoney(r.lineProfit)}
      </span>
    ) },
  ]

  return (
    <div>
      <button
        onClick={() => navigate('/orders')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#8b80a8] hover:text-white"
      >
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        العودة إلى الطلبات
      </button>

      <PageHeader
        title={<span dir="ltr" className="inline-block font-mono text-lg">{order.orderNumber}</span>}
        subtitle={`أنشئ ${formatDate(order.createdAt)}`}
        actions={<StatusBadge kind={st.color} label={st.label} />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Right column (start in RTL) — customer + payment + status */}
        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <User className="h-4 w-4 text-brand-400" aria-hidden="true" /> معلومات العميل
            </h2>
            <dl className="space-y-3 text-sm">
              <Detail icon={<User className="h-4 w-4 text-[#8b80a8]" aria-hidden="true" />} label="الاسم" value={order.fullName} />
              <Detail icon={<Phone className="h-4 w-4 text-[#8b80a8]" aria-hidden="true" />} label="الهاتف" value={<span dir="ltr">{order.phone}</span>} />
              <Detail icon={<MapPin className="h-4 w-4 text-[#8b80a8]" aria-hidden="true" />} label="المدينة" value={order.city} />
              <Detail icon={<MapPin className="h-4 w-4 text-[#8b80a8]" aria-hidden="true" />} label="العنوان" value={order.address} />
              {order.note ? <Detail icon={<StickyNote className="h-4 w-4 text-[#8b80a8]" aria-hidden="true" />} label="ملاحظة" value={order.note} /> : null}
            </dl>
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-white">الدفع والحالة</h2>
            <dl className="space-y-3 text-sm">
              <Detail label="طريقة الدفع" value={PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod} />
              <Detail label="الحالة الحالية" value={<StatusBadge kind={st.color} label={st.label} />} />
            </dl>
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-[#c0b6d6]" htmlFor="order-status">
                تغيير الحالة
              </label>
              <div className="flex gap-2">
                <select
                  id="order-status"
                  value={status || order.status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                >
                  {Object.entries(ORDER_STATUS).map(([value, meta]) => (
                    <option key={value} value={value}>{meta.label}</option>
                  ))}
                </select>
                <Button variant="primary" size="md" onClick={saveStatus} disabled={saving || !status || status === order.status}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {saving ? '…' : 'حفظ'}
                </Button>
              </div>
              {saveError ? <p className="mt-2 text-xs text-danger-400">{saveError}</p> : null}
              {saved ? <p className="mt-2 text-xs text-ok-400">تم تحديث الحالة</p> : null}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Truck className="h-4 w-4 text-brand-400" aria-hidden="true" /> التوصيل
            </h2>
            <p className="text-xs leading-relaxed text-[#8b80a8]">
              لا يُرسل الطلب لأي شركة توصيل عند إنشائه. عند تأكيد الطلب في مرحلة لاحقة
              سيتم إرساله تلقائياً إلى DIGYLOG وحفظ رقم التتبع — هذه الميزة قيد التحضير.
            </p>
          </Card>
        </div>

        {/* Left column — items + finance */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-white">المنتجات</h2>
            <p className="mb-4 text-xs text-[#8b80a8]">
              تكلفة الشراء وربح كل سطر تظهر للمدير فقط ولا تُرسل للمتجر.
            </p>
            <Table columns={itemsCols} rows={order.items} rowKey={(r) => r.id} empty="لا توجد منتجات" />
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-white">خلاصة الطلب</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Summary label="المجموع الفرعي" value={formatMoney(order.subtotal)} />
              <Summary label="الشحن" value={formatMoney(order.shipping)} />
              <Summary label="الإجمالي" value={formatMoney(order.total)} strong />
              <Summary label="إيراد البضاعة" value={formatMoney(fin.revenue)} />
              <Summary
                label="تكلفة الشراء"
                value={formatMoney(fin.cost)}
                sub={fin.costUnknownItems > 0 ? `سعر شراء ${fin.costUnknownItems} منتج غير مسجّل` : ''}
              />
              <Summary
                label="الربح"
                value={fin.profit == null ? '—' : formatMoney(fin.profit)}
                tone={fin.profit == null ? 'muted' : fin.profit < 0 ? 'danger' : 'ok'}
                sub={fin.costUnknownItems > 0 ? 'تقديري' : ''}
              />
            </dl>
            {fin.costUnknownItems > 0 ? (
              <div className="mt-4">
                <Badge kind="warn">الربح تقديري — بعض المنتجات بدون سعر شراء</Badge>
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
      <span className="mt-0.5 shrink-0">{icon}</span>
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
      {sub ? <dd className="text-[10px] text-warn-400">{sub}</dd> : null}
    </div>
  )
}