import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, CreditCard, ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice } from '../utils/format'
import { trackInitiateCheckout, generateClientEventId, getAttributionData } from '../utils/tracking'
import api from '../utils/api'

const INITIAL_FORM = {
  fullName: '',
  phone: '',
  city: '',
  address: '',
  note: '',
  paymentMethod: 'CASH_ON_DELIVERY',
}

export default function Checkout() {
  const { items, subtotal, shipping, total, shippingConfig, clearCart } = useCart()
  const { t, isRTL } = useLanguage()
  const navigate = useNavigate()

  const [form, setForm] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (items.length > 0) {
      trackInitiateCheckout(items, total)
    }
  }, [])

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

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
    if (!form.fullName.trim()) errors.fullName = t('reqFullName')
    if (!form.phone.trim()) {
      errors.phone = t('reqPhone')
    } else if (form.phone.replace(/\D/g, '').length < 8) {
      errors.phone = t('invalidPhone')
    }
    if (!form.city.trim()) errors.city = t('reqCity')
    if (!form.address.trim()) errors.address = t('reqAddress')
    return errors
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (items.length === 0) {
      setFormError(t('emptyCartError'))
      return
    }

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setFormError(t('reqFullName'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const bookItems = items
        .filter((i) => !i.isPackage)
        .map((i) => ({ productId: typeof i.id === 'number' ? i.id : Number(String(i.id).replace('book-', '')), quantity: i.quantity }))

      const packageItems = items
        .filter((i) => i.isPackage)
        .map((i) => ({ packageId: i.packageId || Number(String(i.id).replace('pkg-', '')), quantity: i.quantity }))

      const eventId = generateClientEventId('pur')
      const attribution = getAttributionData()

      const res = await api.post('/orders', {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        note: form.note.trim() || undefined,
        paymentMethod: form.paymentMethod,
        items: bookItems,
        packages: packageItems,
        attribution,
        eventId,
      })

      // Success: the server confirmed the order.
      const order = res.order
      const receipt = {
        orderNumber: order.orderNumber,
        total: order.total,
        fullName: form.fullName.trim(),
        city: form.city.trim(),
        paymentMethod: form.paymentMethod,
        items: items,
        eventId: eventId,
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
      setFormError(err.message || t('orderFailed'))
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">{t('emptyCartTitle')}</h2>
        <Link to="/shop" className="mt-4 inline-block px-6 py-3 bg-brand-700 text-white rounded-xl font-medium">
          {t('backToStore')}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
      <nav className="flex items-center gap-2 text-[0.82rem] text-muted mb-6">
        <Link to="/cart" className="hover:text-brand-700 transition-colors">{t('cart')}</Link>
        <span>/</span>
        <span className="text-foreground/70">{t('checkout')}</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground mb-8">{t('checkout')}</h1>

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
              {t('contactInfo')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.82rem] text-muted mb-1.5">{t('fullName')}</label>
                <input
                  type="text"
                  placeholder={t('fullNamePlaceholder')}
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
                <label className="block text-[0.82rem] text-muted mb-1.5">{t('phone')}</label>
                <input
                  type="tel"
                  placeholder={t('phonePlaceholder')}
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
              {t('deliveryAddress')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[0.82rem] text-muted mb-1.5">{t('address')}</label>
                <input
                  type="text"
                  placeholder={t('addressPlaceholder')}
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
                <label className="block text-[0.82rem] text-muted mb-1.5">{t('city')}</label>
                <input
                  type="text"
                  placeholder={t('cityPlaceholder')}
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
                <label className="block text-[0.82rem] text-muted mb-1.5">{t('orderNotes')}</label>
                <input
                  type="text"
                  placeholder={t('orderNotesPlaceholder')}
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
              {t('paymentMethod')}
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
                    {t('cashOnDelivery')}
                  </div>
                  <div className="text-[0.75rem] text-muted">{t('cashOnDeliveryDesc')}</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 bg-white border border-border rounded-xl cursor-not-allowed opacity-60">
                <input type="radio" name="payment" disabled />
                <div>
                  <div className="font-semibold text-foreground text-[0.88rem]">{t('creditCardSoon')}</div>
                  <div className="text-[0.75rem] text-muted">{t('securePayment')}</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:w-[360px]">
          <div className="bg-white border border-border/60 rounded-2xl p-6 sticky top-28">
            <h3 className="font-bold text-foreground mb-4">{t('orderSummary')}</h3>

            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.key || item.id} className="flex justify-between text-[0.82rem]">
                  <span className="text-foreground/70">{item.title} × {item.quantity}</span>
                  <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2 text-[0.88rem]">
              <div className="flex justify-between">
                <span className="text-muted">{t('subtotal')}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">{t('shipping')}</span>
                <span className={shipping === 0 ? 'text-emerald-600 font-medium' : ''}>
                  {shipping === 0 ? t('free') : formatPrice(shipping)}
                </span>
              </div>
              {shipping === 0 && (
                <div className="text-[0.75rem] text-emerald-600">
                  {items.some((i) => i.shippingMode === 'free' || i.shippingMode === 'FREE')
                    ? t('freeShippingProductQualified')
                    : t('freeShippingQualified')}
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                <span>{t('total')}</span>
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
                  {t('processingOrder')}
                </>
              ) : (
                <>
                  <span>{t('confirmOrder')}</span>
                  <ArrowIcon className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-[0.72rem] text-muted text-center mt-3">
              {t('agreeTerms')}
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
