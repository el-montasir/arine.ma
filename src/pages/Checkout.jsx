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
    `w-full px-3.5 sm:px-4 py-3 sm:py-3.5 bg-[#F5F1F7] border rounded-[12px] sm:rounded-[14px] text-[0.85rem] sm:text-[0.88rem] text-[#1C1220] placeholder:text-[#7A6D80]/50 outline-none focus:bg-white focus:ring-2 focus:ring-[#EBDCF1] transition-all ${
      hasError
        ? 'border-red-300 focus:border-red-500'
        : 'border-[#EFE8F2] focus:border-[#8F3AA1]'
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
      <div className="min-h-[50vh] flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-[420px] rounded-[24px] bg-white border border-[#EFE8F2] shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-[#F6EDF9] border border-[#EBDCF1] rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <CreditCard className="w-8 h-8 text-[#8F3AA1]" />
          </div>
          <h2 className="text-xl font-tajawal font-extrabold text-[#1C1220] mb-2">{t('emptyCartTitle')}</h2>
          <p className="text-xs text-[#7A6D80] mb-6">{t('emptyCartSubtitle')}</p>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-[#8F3AA1] to-[#6B2178] hover:opacity-95 text-white font-bold rounded-[14px] shadow-md shadow-[#6B2178]/20 transition-all text-sm"
          >
            {t('backToStore')}
          </Link>
        </div>
      </div>
    )
  }

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className="min-h-[calc(100dvh-120px)] bg-[#FAF7FB] py-4 sm:py-6 lg:py-10 lg:bg-transparent">
      {/* Centered Floating Container on Mobile / Standard Responsive Container on Desktop */}
      <div className="w-[calc(100%-20px)] sm:w-[calc(100%-32px)] max-w-[500px] mx-auto bg-white border border-[#EFE8F2] rounded-[24px] sm:rounded-[28px] shadow-[0_4px_24px_-4px_rgba(62,17,71,.07),0_1px_3px_rgba(62,17,71,.03)] p-3.5 sm:p-6 lg:p-0 lg:max-w-[1440px] lg:bg-transparent lg:border-0 lg:shadow-none lg:rounded-none lg:w-full lg:px-8">
        {/* Navigation Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[0.78rem] sm:text-[0.82rem] text-[#7A6D80] mb-3 sm:mb-4 lg:mb-6">
          <Link to="/cart" className="hover:text-[#6B2178] transition-colors">{t('cart')}</Link>
          <span>/</span>
          <span className="text-[#1C1220] font-semibold">{t('checkout')}</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8 pb-3.5 lg:pb-0 border-b border-[#EFE8F2] lg:border-b-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-tajawal font-extrabold text-[#1C1220]">{t('checkout')}</h1>
          {totalCount > 0 && (
            <span className="lg:hidden px-2.5 py-0.5 bg-[#F6EDF9] text-[#6B2178] text-[0.72rem] font-bold rounded-full border border-[#EBDCF1]">
              {t('itemsCount', { count: totalCount })}
            </span>
          )}
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-4 sm:mb-6 flex items-center gap-2.5 px-3.5 sm:px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-[0.82rem] sm:text-[0.88rem] rounded-[14px]"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Main Form Fields */}
          <div className="flex-1 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* 1. Contact Information Card */}
            <div className="bg-white rounded-[18px] sm:rounded-[22px] border border-[#EFE8F2] p-4 sm:p-6 lg:p-7 shadow-[0_1px_2px_rgba(62,17,71,.03),0_4px_12px_-6px_rgba(62,17,71,.06)]">
              <h3 className="font-tajawal font-extrabold text-[0.95rem] sm:text-lg text-[#1C1220] mb-4 sm:mb-5 flex items-center gap-2.5 pb-3 border-b border-[#EFE8F2]">
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[#F6EDF9] text-[#6B2178] border border-[#EBDCF1] rounded-full flex items-center justify-center text-[0.75rem] sm:text-[0.82rem] font-bold shadow-2xs shrink-0">1</div>
                <span>{t('contactInfo')}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-[0.8rem] sm:text-[0.82rem] text-[#4A3D50] font-semibold mb-1.5">{t('fullName')} *</label>
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
                  <label className="block text-[0.8rem] sm:text-[0.82rem] text-[#4A3D50] font-semibold mb-1.5">{t('phone')} *</label>
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

            {/* 2. Delivery Address Card */}
            <div className="bg-white rounded-[18px] sm:rounded-[22px] border border-[#EFE8F2] p-4 sm:p-6 lg:p-7 shadow-[0_1px_2px_rgba(62,17,71,.03),0_4px_12px_-6px_rgba(62,17,71,.06)]">
              <h3 className="font-tajawal font-extrabold text-[0.95rem] sm:text-lg text-[#1C1220] mb-4 sm:mb-5 flex items-center gap-2.5 pb-3 border-b border-[#EFE8F2]">
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[#F6EDF9] text-[#6B2178] border border-[#EBDCF1] rounded-full flex items-center justify-center text-[0.75rem] sm:text-[0.82rem] font-bold shadow-2xs shrink-0">2</div>
                <MapPin className="w-4 h-4 text-[#6B2178] shrink-0" />
                <span>{t('deliveryAddress')}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[0.8rem] sm:text-[0.82rem] text-[#4A3D50] font-semibold mb-1.5">{t('address')} *</label>
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
                  <label className="block text-[0.8rem] sm:text-[0.82rem] text-[#4A3D50] font-semibold mb-1.5">{t('city')} *</label>
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
                  <label className="block text-[0.8rem] sm:text-[0.82rem] text-[#4A3D50] font-semibold mb-1.5">{t('orderNotes')}</label>
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

            {/* 3. Payment Method Card */}
            <div className="bg-white rounded-[18px] sm:rounded-[22px] border border-[#EFE8F2] p-4 sm:p-6 lg:p-7 shadow-[0_1px_2px_rgba(62,17,71,.03),0_4px_12px_-6px_rgba(62,17,71,.06)]">
              <h3 className="font-tajawal font-extrabold text-[0.95rem] sm:text-lg text-[#1C1220] mb-4 sm:mb-5 flex items-center gap-2.5 pb-3 border-b border-[#EFE8F2]">
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[#F6EDF9] text-[#6B2178] border border-[#EBDCF1] rounded-full flex items-center justify-center text-[0.75rem] sm:text-[0.82rem] font-bold shadow-2xs shrink-0">3</div>
                <CreditCard className="w-4 h-4 text-[#6B2178] shrink-0" />
                <span>{t('paymentMethod')}</span>
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 sm:gap-3.5 p-3.5 sm:p-4 bg-[#F6EDF9] border-2 border-[#8F3AA1] rounded-[14px] sm:rounded-[16px] cursor-pointer transition-all shadow-xs">
                  <input
                    type="radio"
                    name="payment"
                    value="CASH_ON_DELIVERY"
                    checked={form.paymentMethod === 'CASH_ON_DELIVERY'}
                    onChange={update('paymentMethod')}
                    className="accent-[#6B2178] w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-[#1C1220] text-[0.88rem] sm:text-[0.92rem]">
                      {t('cashOnDelivery')}
                    </div>
                    <div className="text-[0.74rem] sm:text-[0.78rem] text-[#7A6D80]">{t('cashOnDeliveryDesc')}</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 sm:gap-3.5 p-3.5 sm:p-4 bg-[#F5F1F7] border border-[#EFE8F2] rounded-[14px] sm:rounded-[16px] cursor-not-allowed opacity-60">
                  <input type="radio" name="payment" disabled className="w-4 h-4" />
                  <div>
                    <div className="font-bold text-[#1C1220] text-[0.88rem] sm:text-[0.92rem]">{t('creditCardSoon')}</div>
                    <div className="text-[0.74rem] sm:text-[0.78rem] text-[#7A6D80]">{t('securePayment')}</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="lg:w-[360px]">
            <div className="bg-[#FCFAFD] lg:bg-white border border-[#EFE8F2] rounded-[18px] sm:rounded-[24px] p-4 sm:p-6 lg:p-7 shadow-[0_1px_2px_rgba(62,17,71,.04),0_8px_24px_-10px_rgba(62,17,71,.08)] lg:shadow-[0_1px_2px_rgba(62,17,71,.04),0_12px_32px_-12px_rgba(62,17,71,.12)] lg:sticky lg:top-28">
              <h3 className="font-tajawal font-extrabold text-base sm:text-lg text-[#1C1220] mb-3.5 sm:mb-5 pb-3 border-b border-[#EFE8F2]">{t('orderSummary')}</h3>

              <div className="space-y-2.5 sm:space-y-3 mb-4 sm:mb-5 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.key || item.id} className="flex justify-between items-start text-[0.84rem] sm:text-[0.88rem] gap-2">
                    <span className="text-[#4A3D50] line-clamp-1">{item.title} × {item.quantity}</span>
                    <span className="font-bold text-[#1C1220] shrink-0 font-tajawal">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#EFE8F2] pt-3.5 sm:pt-4 space-y-2.5 sm:space-y-3 text-[0.85rem] sm:text-[0.88rem]">
                <div className="flex justify-between items-center">
                  <span className="text-[#7A6D80] font-medium">{t('subtotal')}</span>
                  <span className="font-bold text-[#1C1220] font-tajawal">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#7A6D80] font-medium">{t('shipping')}</span>
                  <span className={`font-bold ${shipping === 0 ? 'text-[#0F6E51]' : 'text-[#1C1220] font-tajawal'}`}>
                    {shipping === 0 ? t('free') : formatPrice(shipping)}
                  </span>
                </div>
                {shipping === 0 && subtotal > 0 && (
                  <div className="text-[0.75rem] sm:text-[0.78rem] text-[#0F6E51] bg-[#E8F7F1] border border-[#0F6E51]/15 px-3 py-2 rounded-[12px] font-semibold">
                    {items.some((i) => i.shippingMode === 'free' || i.shippingMode === 'FREE')
                      ? t('freeShippingProductQualified')
                      : t('freeShippingQualified')}
                  </div>
                )}
                {shipping > 0 && shippingConfig?.freeEnabled && (
                  <p className="text-[0.75rem] sm:text-[0.78rem] text-[#7A6D80] bg-white lg:bg-[#F5F1F7] border border-[#EFE8F2] px-3 py-2 rounded-[12px]">
                    توصيل مجاني للطلبات فوق {shippingConfig?.freeThreshold} د.م
                  </p>
                )}
                <div className="border-t border-[#EFE8F2] pt-3.5 sm:pt-4 flex justify-between items-baseline">
                  <span className="font-bold text-base text-[#1C1220]">{t('total')}</span>
                  <span className="font-tajawal font-extrabold text-xl sm:text-2xl text-[#6B2178]">{formatPrice(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-[#8F3AA1] to-[#6B2178] hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[0.95rem] sm:text-base font-bold rounded-[14px] sm:rounded-[16px] text-center transition-all shadow-md sm:shadow-lg shadow-[#6B2178]/25 active:scale-[0.99] mt-5 sm:mt-6 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('processingOrder')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('confirmOrder')}</span>
                    <ArrowIcon className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[0.72rem] sm:text-[0.75rem] text-[#7A6D80] text-center mt-3 sm:mt-3.5">
                {t('agreeTerms')}
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
