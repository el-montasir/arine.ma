import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, Package, MapPin, CreditCard, Clock, CheckCircle2, Truck, AlertCircle, ArrowLeft, ArrowRight, Loader2, XCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import api from '../utils/api'
import { formatPrice } from '../utils/format'
import { getThumbnailImageProps } from '../utils/image-variants'

/**
 * Resolves the thumbnail props for an order row's snapshotted image.
 *
 * The widths were snapshotted onto the order row when it was placed, so this
 * works on a tracking lookup where no product payload was ever fetched — the
 * registry would be empty here. Falls back to the original (always present)
 * when the row predates the metadata columns.
 */
function orderThumb(url, widths) {
  return getThumbnailImageProps(url, widths)
}

export default function TrackOrder() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orderNumberInput, setOrderNumberInput] = useState(searchParams.get('num') || '')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { t, language, isRTL } = useLanguage()

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  const ORDER_STATUS_META = {
    PENDING: {
      label: t('orderStatusPending'),
      desc: t('orderStatusPending'),
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      step: 1,
    },
    CONFIRMED: {
      label: t('orderStatusConfirmed'),
      desc: t('orderStatusConfirmed'),
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      step: 2,
    },
    SHIPPING: {
      label: t('orderStatusShipping'),
      desc: t('orderStatusShipping'),
      color: 'text-purple-700 bg-purple-50 border-purple-200',
      step: 3,
    },
    DELIVERED: {
      label: t('orderStatusDelivered'),
      desc: t('orderStatusDelivered'),
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      step: 4,
    },
    CANCELLED: {
      label: t('orderStatusCancelled'),
      desc: t('orderStatusCancelled'),
      color: 'text-red-700 bg-red-50 border-red-200',
      step: 0,
    },
  }

  const STEPS = [
    { step: 1, label: language === 'ar' ? 'تم الاستلام' : language === 'fr' ? 'Reçue' : 'Received', icon: Clock },
    { step: 2, label: language === 'ar' ? 'تم التأكيد' : language === 'fr' ? 'Confirmée' : 'Confirmed', icon: CheckCircle2 },
    { step: 3, label: language === 'ar' ? 'قيد الشحن' : language === 'fr' ? 'En cours' : 'Shipping', icon: Truck },
    { step: 4, label: language === 'ar' ? 'تم التوصيل' : language === 'fr' ? 'Livrée' : 'Delivered', icon: Package },
  ]

  const fetchOrder = async (numberToSearch) => {
    const cleanNum = numberToSearch.trim()
    if (!cleanNum) return

    setLoading(true)
    setError('')
    setOrder(null)

    try {
      const res = await api.get(`/orders/${encodeURIComponent(cleanNum)}`)
      if (res.success && res.order) {
        setOrder(res.order)
      } else {
        setError(t('orderNotFound'))
      }
    } catch (err) {
      setError(err.message || t('orderNotFound'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const num = searchParams.get('num')
    if (num) {
      setOrderNumberInput(num)
      fetchOrder(num)
    }
  }, [searchParams])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!orderNumberInput.trim()) return
    setSearchParams({ num: orderNumberInput.trim() })
    fetchOrder(orderNumberInput)
  }

  const currentStatus = order ? ORDER_STATUS_META[order.status] || ORDER_STATUS_META.PENDING : null

  const glass =
    'bg-gradient-to-br from-white/[0.11] to-white/[0.04] backdrop-blur-[22px] backdrop-saturate-150 border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_18px_40px_-20px_rgba(0,0,0,0.8)]'

  // Glass chip colour per status (presentation only; the status itself comes from the API).
  const STATUS_CHIP = {
    PENDING: 'bg-amber-400/15 border-amber-300/40 text-amber-200',
    CONFIRMED: 'bg-sky-400/15 border-sky-300/40 text-sky-200',
    SHIPPING: 'bg-[#C46BDB]/20 border-[#E0A6EE]/45 text-[#F3D3FA]',
    DELIVERED: 'bg-emerald-400/15 border-emerald-300/45 text-emerald-200',
    CANCELLED: 'bg-red-400/15 border-red-300/45 text-red-200',
  }

  const itemCount = (order?.items?.length || 0) + (order?.packageItems?.length || 0)

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="relative isolate overflow-hidden bg-[#10061A] text-[#F4ECF8] -mt-[72px] pt-[104px] lg:mt-0 lg:pt-14 pb-16 px-4 min-h-[70vh]"
    >
      {/* Amethyst glow behind the glass */}
      <div className="pointer-events-none absolute -z-10 -top-24 -start-24 w-[420px] h-[420px] rounded-full bg-[#8E2DB0]/70 blur-[90px]" />
      <div className="pointer-events-none absolute -z-10 top-[40%] -end-32 w-[380px] h-[380px] rounded-full bg-[#E05BB8]/30 blur-[90px]" />
      <div className="pointer-events-none absolute -z-10 -bottom-24 start-0 w-[420px] h-[420px] rounded-full bg-[#4B2BC9]/45 blur-[100px]" />

      <div className="mx-auto w-full max-w-[560px] flex flex-col gap-4">
        {/* Header */}
        <header className="text-center">
          <span className={`${glass} inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.8rem] font-semibold text-[#F0D6F7]`}>
            <Truck className="w-4 h-4" />
            {t('trackOrder')}
          </span>
          <h1 className="font-tajawal font-extrabold text-[1.7rem] sm:text-3xl leading-snug mt-4 text-white">
            {t('trackOrderTitle')}
          </h1>
          <p className="text-[0.88rem] text-[#B7A6C2] mt-1">{t('trackOrderSubtitle')}</p>
        </header>

        {/* Search */}
        <form onSubmit={handleSubmit} className={`${glass} flex flex-col sm:flex-row sm:items-center gap-2 rounded-[22px] p-2`}>
          <div className="relative flex-1 min-w-0">
            <Search className="w-5 h-5 text-[#B7A6C2] absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
            <input
              type="text"
              dir="ltr"
              inputMode="text"
              autoCapitalize="characters"
              aria-label={t('orderNumberLabel')}
              placeholder="AR-YYYYMMDD-XXXX"
              value={orderNumberInput}
              onChange={(e) => setOrderNumberInput(e.target.value)}
              className="w-full bg-transparent pl-10 pr-3 py-3 font-mono text-[0.95rem] tracking-wide text-white placeholder:text-white/35 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !orderNumberInput.trim()}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-[16px] bg-gradient-to-b from-[#B455CB] to-[#6B2178] px-5 py-3 text-[0.9rem] font-bold text-white shadow-[0_8px_24px_-8px_rgba(180,85,203,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {t('searchOrderBtn')}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-[20px] border border-red-300/30 bg-red-500/10 backdrop-blur-xl px-4 py-3.5 text-red-100">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-300" />
            <div>
              <p className="font-semibold text-[0.9rem]">{t('orderNotFound')}</p>
              <p className="text-red-100/75 text-[0.8rem] mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {order && currentStatus && (
          <>
            {/* Status card */}
            <section className={`${glass} rounded-[24px] p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[0.75rem] text-[#B7A6C2]">{t('orderNumberLabel')}</div>
                  <div dir="ltr" className="font-mono font-semibold text-[1.25rem] sm:text-[1.4rem] tracking-wide text-white break-all">
                    {order.orderNumber}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[0.82rem] font-bold ${
                    STATUS_CHIP[order.status] || STATUS_CHIP.PENDING
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {currentStatus.label}
                </span>
              </div>

              {order.status !== 'CANCELLED' ? (
                <ol className="mt-5 grid gap-0">
                  {STEPS.map((s, i) => {
                    const isPassed = currentStatus.step >= s.step
                    const isCurrent = currentStatus.step === s.step
                    const isLast = i === STEPS.length - 1
                    const Icon = s.icon
                    return (
                      <li key={s.step} className="relative flex items-start gap-3 pb-5 last:pb-0">
                        {!isLast && (
                          <span
                            className={`absolute top-10 start-[19px] w-[2px] h-[calc(100%-2.5rem)] rounded-full ${
                              currentStatus.step > s.step ? 'bg-gradient-to-b from-[#C46BDB] to-[#8E2DB0]' : 'bg-white/10'
                            }`}
                          />
                        )}
                        <span
                          className={`relative z-10 w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                            isPassed
                              ? 'bg-gradient-to-b from-[#C46BDB] to-[#6B2178] text-white'
                              : 'bg-white/[0.06] border border-white/[0.12] text-white/40'
                          } ${isCurrent ? 'shadow-[0_0_24px_4px_rgba(196,107,219,0.55)] ring-4 ring-[#C46BDB]/20' : ''}`}
                        >
                          <Icon className="w-[18px] h-[18px]" />
                        </span>
                        <div className="pt-2 min-w-0">
                          <div className={`text-[0.92rem] font-bold ${isPassed ? 'text-white' : 'text-white/45'}`}>{s.label}</div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-red-300/30 bg-red-500/10 px-4 py-3.5 text-red-100">
                  <XCircle className="w-5 h-5 shrink-0 text-red-300" />
                  <p className="font-semibold text-[0.9rem]">{t('orderStatusCancelled')}</p>
                </div>
              )}
            </section>

            {/* Delivery, payment, date */}
            <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className={`${glass} rounded-[20px] px-4 py-3.5`}>
                <div className="flex items-center gap-1.5 text-[0.74rem] text-[#B7A6C2]">
                  <MapPin className="w-3.5 h-3.5" />
                  {t('deliveryAddress')}
                </div>
                <div className="text-[0.95rem] font-bold text-white mt-0.5">{order.city}</div>
                {order.address && <div className="text-[0.78rem] text-[#B7A6C2] mt-0.5">{order.address}</div>}
              </div>
              <div className={`${glass} rounded-[20px] px-4 py-3.5 col-span-2 order-last sm:col-span-1 sm:order-none`}>
                <div className="flex items-center gap-1.5 text-[0.74rem] text-[#B7A6C2]">
                  <CreditCard className="w-3.5 h-3.5" />
                  {t('paymentMethod')}
                </div>
                <div className="text-[0.95rem] font-bold text-white mt-0.5">
                  {order.paymentMethod === 'CASH_ON_DELIVERY' ? t('cashOnDelivery') : order.paymentMethod}
                </div>
                <div className="text-[0.76rem] text-[#B7A6C2] mt-0.5">{t('cashOnDeliveryDesc')}</div>
              </div>
              <div className={`${glass} rounded-[20px] px-4 py-3.5`}>
                <div className="flex items-center gap-1.5 text-[0.74rem] text-[#B7A6C2]">
                  <Clock className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'تاريخ الطلب' : 'Date'}
                </div>
                <div className="text-[0.95rem] font-bold text-white mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-[0.76rem] text-[#B7A6C2] mt-0.5">
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </section>

            {/* Items and totals */}
            <section className={`${glass} rounded-[24px] px-5 pt-4 pb-5`}>
              <h2 className="flex items-center gap-2 font-tajawal text-[1.05rem] font-extrabold text-white">
                <Package className="w-5 h-5 text-[#E0A6EE]" />
                {t('orderSummary')} ({itemCount})
              </h2>

              <ul className="mt-1 divide-y divide-white/[0.08]">
                {order.items?.map((item) => {
                  const thumb = orderThumb(item.productImage, item.productImageVariantWidths)
                  return (
                    <li key={item.id} className="py-3 flex items-center gap-3">
                      {item.productImage ? (
                        <img
                          src={thumb.src}
                          srcSet={thumb.srcSet}
                          sizes={thumb.sizes}
                          alt=""
                          className="w-11 h-[60px] object-cover rounded-lg ring-1 ring-white/15 shadow-[0_8px_18px_-6px_rgba(0,0,0,0.8)] shrink-0"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            if (e.currentTarget.dataset.variantFallbackApplied !== '1') {
                              e.currentTarget.removeAttribute('srcset')
                              e.currentTarget.removeAttribute('sizes')
                              e.currentTarget.dataset.variantFallbackApplied = '1'
                            }
                          }}
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[0.9rem] font-bold text-white truncate">{item.productTitle}</h3>
                        <span className="text-[0.76rem] text-[#B7A6C2]">
                          {item.quantity} × {formatPrice(item.unitPrice)}
                        </span>
                      </div>
                      <span className="text-[0.9rem] font-extrabold text-white shrink-0">{formatPrice(item.totalPrice)}</span>
                    </li>
                  )
                })}
                {order.packageItems?.map((item) => {
                  const thumb = orderThumb(item.packageImage, item.packageImageVariantWidths)
                  return (
                    <li key={item.id} className="py-3 flex items-center gap-3">
                      {item.packageImage ? (
                        <img
                          src={thumb.src}
                          srcSet={thumb.srcSet}
                          sizes={thumb.sizes}
                          alt=""
                          className="w-12 h-12 object-cover rounded-xl ring-1 ring-white/15 shrink-0"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            if (e.currentTarget.dataset.variantFallbackApplied !== '1') {
                              e.currentTarget.removeAttribute('srcset')
                              e.currentTarget.removeAttribute('sizes')
                              e.currentTarget.dataset.variantFallbackApplied = '1'
                            }
                          }}
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 rounded-full bg-[#C46BDB]/25 px-2 py-0.5 text-[0.65rem] font-bold text-[#F0D6F7]">
                            {t('package') || 'باقة'}
                          </span>
                          <h3 className="text-[0.9rem] font-bold text-white truncate">{item.packageTitle}</h3>
                        </div>
                        {item.itemsSnapshot && Array.isArray(item.itemsSnapshot) && item.itemsSnapshot.length > 0 && (
                          <p className="text-[0.72rem] text-[#B7A6C2] truncate mt-0.5">
                            {item.itemsSnapshot.map((i) => i.title).filter(Boolean).join(' + ')}
                          </p>
                        )}
                        <span className="text-[0.76rem] text-[#B7A6C2] block mt-0.5">
                          {item.quantity} × {formatPrice(item.unitPrice)}
                        </span>
                      </div>
                      <span className="text-[0.9rem] font-extrabold text-white shrink-0">{formatPrice(item.totalPrice)}</span>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-2 pt-3 border-t border-white/[0.08] grid gap-1.5 text-[0.86rem]">
                <div className="flex justify-between text-[#B7A6C2]">
                  <span>{t('subtotal')}</span>
                  <span className="text-white">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#B7A6C2]">
                  <span>{t('shipping')}</span>
                  <span className={order.shipping === 0 ? 'text-emerald-300 font-semibold' : 'text-white'}>
                    {order.shipping === 0 ? t('free') : formatPrice(order.shipping)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5">
                  <span className="font-tajawal text-[1.05rem] font-extrabold text-white">{t('total')}</span>
                  <span className="font-tajawal text-[1.2rem] font-extrabold bg-gradient-to-l from-[#F3C6FF] to-[#C46BDB] bg-clip-text text-transparent">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Empty state */}
        {!order && !loading && !error && (
          <section className={`${glass} rounded-[24px] px-5 py-8 text-center`}>
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center" aria-hidden="true">
              <div className="absolute inset-0 rounded-full bg-[#C978E0]/30 blur-xl" />
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center bg-white/[0.08] border border-white/[0.15]">
                <Package className="w-6 h-6 text-[#E0A6EE]" />
              </div>
            </div>
            <p className="mt-4 text-[0.9rem] text-[#D9C8E2]">
              {language === 'ar'
                ? 'تجد رقم طلبك في صفحة تأكيد الطلب، ويبدأ بـ AR-'
                : language === 'fr'
                  ? 'Votre numéro figure sur la page de confirmation et commence par AR-'
                  : 'Your order number is on the confirmation page and starts with AR-'}
            </p>
            <Link
              to="/shop"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-[0.85rem] font-semibold text-white hover:bg-white/[0.12] transition-colors"
            >
              {t('exploreShop')}
              <ArrowIcon className="w-4 h-4" />
            </Link>
          </section>
        )}
      </div>
    </div>
  )
}
