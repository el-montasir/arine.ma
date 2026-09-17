import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Phone, CreditCard, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/format'
import api from '../utils/api'

const INITIAL_FORM = {
  fullName: '',
  phone: '',
  city: '',
  address: '',
  note: '',
  paymentMethod: 'CASH_ON_DELIVERY',
}

const PAYMENT_LABELS = {
  CASH_ON_DELIVERY: 'الدفع عند الاستلام',
}

export default function Checkout() {
  const { items, subtotal, shipping, total, clearCart } = useCart()
  const navigate = useNavigate()

  const [form, setForm] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
  }

  const inputClass = (hasError) =>
    `w-full px-4 py-3 bg-[#F3F4F6] border rounded-xl text-[0.88rem] text-foreground placeholder:text-muted/60 outline-none focus:bg-white transition-colors ${
      hasError
        ? 'border-red-300 focus:border-red-400'
        : 'border-border/60 focus:border-brand-400'
    }`

  function validate() {
    const errors = {}
    if (!form.fullName.trim()) errors.fullName = 'الاسم الكامل مطلوب'
    if (!form.phone.trim()) {
      errors.phone = 'رقم الهاتف مطلوب'
    } else if (form.phone.replace(/\D/g, '').length < 8) {
      errors.phone = 'رقم الهاتف غير صحيح'
    }
    if (!form.city.trim()) errors.city = 'المدينة مطلوبة'
    if (!form.address.trim()) errors.address = 'العنوان مطلوب'
    return errors
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (items.length === 0) {
      setFormError('سلتك فارغة، أضف كتاباً قبل إتمام الطلب')
      return
    }

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setFormError('يرجى تعبئة جميع الحقول المطلوبة')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const res = await api.post('/orders', {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        note: form.note.trim() || undefined,
        paymentMethod: form.paymentMethod,
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
      })

      // Success: the server confirmed the order.
      const order = res.order
      const receipt = {
        orderNumber: order.orderNumber,
        total: order.total,
        fullName: form.fullName.trim(),
        city: form.city.trim(),
        paymentMethod: form.paymentMethod,
      }
      try {
        sessionStorage.setItem('arine-last-order', JSON.stringify(receipt))
      } catch {
        /* storage unavailable — receipt still works via router state */
      }
      clearCart()
      navigate('/order-success', { state: receipt })
    } catch (err) {
      // Failure: keep the cart AND the form data intact so the user can retry.
      setFormError(err.message || 'تعذر إتمام الطلب، حاول مرة أخرى')
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">سلتك فارغة</h2>
        <Link to="/shop" className="mt-4 inline-block px-6 py-3 bg-brand-700 text-white rounded-xl font-medium">
          العودة للمكتبة
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
      <nav className="flex items-center gap-2 text-[0.82rem] text-muted mb-6">
        <Link to="/cart" className="hover:text-brand-700 transition-colors">سلة المشتريات</Link>
        <span>/</span>
        <span className="text-foreground/70">إتمام الطلب</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground mb-8">إتمام الطلب</h1>

      {formError && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-[0.85rem] rounded-xl"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
        {/* Form */}
        <div className="flex-1 space-y-8">
          {/* Customer info */}
          <div className="bg-white border border-border/60 rounded-2xl p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-[0.82rem] font-bold">1</div>
              معلومات الاتصال
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.82rem] text-muted mb-1.5">الاسم الكامل</label>
                <input
                  type="text"
                  placeholder="محمد أمين"
                  value={form.fullName}
                  onChange={update('fullName')}
                  aria-invalid={!!fieldErrors.fullName}
                  className={inputClass(fieldErrors.fullName)}
                />
                {fieldErrors.fullName && (
                  <p className="text-[0.75rem] text-red-600 mt-1">{fieldErrors.fullName}</p>
                )}
              </div>
              <div>
                <label className="block text-[0.82rem] text-muted mb-1.5">رقم الهاتف</label>
                <input
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={form.phone}
                  onChange={update('phone')}
                  aria-invalid={!!fieldErrors.phone}
                  className={inputClass(fieldErrors.phone)}
                />
                {fieldErrors.phone && (
                  <p className="text-[0.75rem] text-red-600 mt-1">{fieldErrors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white border border-border/60 rounded-2xl p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-[0.82rem] font-bold">2</div>
              <MapPin className="w-4 h-4" />
              عنوان التوصيل
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[0.82rem] text-muted mb-1.5">العنوان</label>
                <input
                  type="text"
                  placeholder="شارع الحسن الثاني، رقم 123"
                  value={form.address}
                  onChange={update('address')}
                  aria-invalid={!!fieldErrors.address}
                  className={inputClass(fieldErrors.address)}
                />
                {fieldErrors.address && (
                  <p className="text-[0.75rem] text-red-600 mt-1">{fieldErrors.address}</p>
                )}
              </div>
              <div>
                <label className="block text-[0.82rem] text-muted mb-1.5">المدينة</label>
                <input
                  type="text"
                  placeholder="الدار البيضاء"
                  value={form.city}
                  onChange={update('city')}
                  aria-invalid={!!fieldErrors.city}
                  className={inputClass(fieldErrors.city)}
                />
                {fieldErrors.city && (
                  <p className="text-[0.75rem] text-red-600 mt-1">{fieldErrors.city}</p>
                )}
              </div>
              <div>
                <label className="block text-[0.82rem] text-muted mb-1.5">ملاحظة للطلب (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: اتصل بي قبل التوصيل"
                  value={form.note}
                  onChange={update('note')}
                  className={inputClass(false)}
                />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white border border-border/60 rounded-2xl p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-[0.82rem] font-bold">3</div>
              <CreditCard className="w-4 h-4" />
              طريقة الدفع
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 bg-brand-50 border-2 border-brand-200 rounded-xl cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="CASH_ON_DELIVERY"
                  checked={form.paymentMethod === 'CASH_ON_DELIVERY'}
                  onChange={update('paymentMethod')}
                  className="accent-brand-700"
                />
                <div>
                  <div className="font-semibold text-foreground text-[0.88rem]">
                    {PAYMENT_LABELS.CASH_ON_DELIVERY}
                  </div>
                  <div className="text-[0.75rem] text-muted">ادفع نقداً عند توصيل الطلب</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 bg-white border border-border rounded-xl cursor-not-allowed opacity-60">
                <input type="radio" name="payment" disabled />
                <div>
                  <div className="font-semibold text-foreground text-[0.88rem]">بطاقة بنكية (قريباً)</div>
                  <div className="text-[0.75rem] text-muted">الدفع بالبطاقة الائتمانية</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:w-[360px]">
          <div className="bg-white border border-border/60 rounded-2xl p-6 sticky top-28">
            <h3 className="font-bold text-foreground mb-4">ملخص الطلب</h3>

            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-[0.82rem]">
                  <span className="text-foreground/70">{item.title} × {item.quantity}</span>
                  <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2 text-[0.88rem]">
              <div className="flex justify-between">
                <span className="text-muted">المجموع الفرعي</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">التوصيل</span>
                <span className={shipping === 0 ? 'text-emerald-600 font-medium' : ''}>
                  {shipping === 0 ? 'مجاني' : formatPrice(shipping)}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                <span>الإجمالي</span>
                <span className="text-brand-700">{formatPrice(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[0.92rem] font-semibold rounded-xl text-center transition-colors mt-6 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري معالجة الطلب...
                </>
              ) : (
                <>
                  تأكيد الطلب
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-[0.72rem] text-muted text-center mt-3">
              بالضغط على تأكيد الطلب، أنت توافق على الشروط والأحكام
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}