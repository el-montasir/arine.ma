import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, User, MapPin, CreditCard, ArrowLeft, Package } from 'lucide-react'
import { formatPrice } from '../utils/format'

const PAYMENT_LABELS = {
  CASH_ON_DELIVERY: 'الدفع عند الاستلام',
}

export default function OrderSuccess() {
  const { state } = useLocation()

  // Survives a hard refresh: the receipt is stashed in sessionStorage at
  // checkout time; router state is preferred when available.
  let order = null
  if (state?.orderNumber) order = state
  if (!order) {
    try {
      const raw = sessionStorage.getItem('arine-last-order')
      if (raw) order = JSON.parse(raw)
    } catch {
      order = null
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-12 lg:py-20">
      <div className="max-w-[520px] mx-auto text-center">
        {/* Success illustration */}
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />
        </div>

        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
          تم استلام طلبك بنجاح
        </h1>
        <p className="text-muted text-[0.92rem]">
          سنتواصل معك قريباً لتأكيد الطلب وتحديد موعد التوصيل
        </p>

        {order ? (
          <>
            {/* Order number */}
            <div className="mt-8 inline-flex items-center gap-2.5 bg-brand-50 border border-brand-200 rounded-2xl px-6 py-3.5">
              <Package className="w-5 h-5 text-brand-700" />
              <div>
                <div className="text-[0.72rem] text-muted mb-0.5">رقم الطلب</div>
                <div dir="ltr" className="text-[1.05rem] font-bold text-brand-700 tracking-wide">
                  {order.orderNumber}
                </div>
              </div>
            </div>

            {/* Receipt details */}
            <div className="mt-8 bg-white border border-border/60 rounded-2xl divide-y divide-border/60 text-right">
              <div className="flex items-center justify-between p-4">
                <span className="flex items-center gap-2 text-[0.82rem] text-muted">
                  <User className="w-4 h-4" /> الاسم
                </span>
                <span className="text-[0.88rem] font-semibold text-foreground">{order.fullName}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="flex items-center gap-2 text-[0.82rem] text-muted">
                  <MapPin className="w-4 h-4" /> المدينة
                </span>
                <span className="text-[0.88rem] font-semibold text-foreground">{order.city}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="flex items-center gap-2 text-[0.82rem] text-muted">
                  <CreditCard className="w-4 h-4" /> الدفع
                </span>
                <span className="text-[0.88rem] font-semibold text-foreground">
                  {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                </span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-[0.82rem] text-muted">الإجمالي</span>
                <span className="text-[0.95rem] font-bold text-brand-700">{formatPrice(order.total)}</span>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-8 text-muted text-[0.88rem]">
            تم تسجيل طلبك لدى فريقنا، سيتواصل معك موظفونا لتأكيد التفاصيل.
          </p>
        )}

        {/* CTAs */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-[0.9rem] font-semibold rounded-xl transition-colors"
          >
            العودة للمكتبة
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-border hover:border-brand-300 text-foreground text-[0.9rem] font-semibold rounded-xl transition-colors"
          >
            متابعة التسوق
          </Link>
        </div>
      </div>
    </div>
  )
}