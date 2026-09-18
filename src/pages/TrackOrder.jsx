import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, Package, MapPin, CreditCard, Clock, CheckCircle2, Truck, AlertCircle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import api from '../utils/api'
import { formatPrice } from '../utils/format'

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

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      {/* Header */}
      <div className="max-w-2xl mx-auto text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-100 text-brand-800 text-[0.82rem] font-medium rounded-full mb-3">
          <Truck className="w-4 h-4" />
          {t('trackOrderTitle')}
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t('trackOrderTitle')}</h1>
        <p className="text-muted text-[0.92rem] mt-2">
          {t('trackOrderSubtitle')}
        </p>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="mt-8 flex gap-2 max-w-lg mx-auto">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-muted absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
            <input
              type="text"
              dir="ltr"
              placeholder="AR-YYYYMMDD-XXXX"
              value={orderNumberInput}
              onChange={(e) => setOrderNumberInput(e.target.value)}
              className="w-full px-11 py-3.5 bg-white border border-border/70 rounded-xl text-[0.95rem] font-mono text-foreground placeholder:text-muted/60 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all text-center"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !orderNumberInput.trim()}
            className="px-6 py-3.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[0.92rem] font-semibold rounded-xl transition-colors flex items-center gap-2 shrink-0 shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {t('searchOrderBtn')}
          </button>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="max-w-xl mx-auto mb-10 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-[0.88rem]">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{t('orderNotFound')}</p>
            <p className="text-red-600/90 text-[0.82rem] mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Order Details View */}
      {order && currentStatus && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Status banner */}
          <div className="bg-white border border-border/60 rounded-3xl p-6 lg:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
              <div>
                <div className="text-[0.78rem] text-muted mb-1">{t('orderNumberLabel')}</div>
                <div dir="ltr" className="text-xl font-bold font-mono text-brand-800">
                  {order.orderNumber}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-4 py-1.5 rounded-full text-[0.85rem] font-semibold border ${currentStatus.color}`}>
                  {currentStatus.label}
                </span>
              </div>
            </div>

            {/* Timeline progress (if not cancelled) */}
            {order.status !== 'CANCELLED' ? (
              <div className="py-8">
                <div className="grid grid-cols-4 gap-2 relative">
                  {/* Connecting bar */}
                  <div className="absolute top-5 inset-x-8 h-1 bg-border/60 -z-0" />
                  <div
                    className={`absolute top-5 ${isRTL ? 'right-8' : 'left-8'} h-1 bg-brand-600 transition-all duration-500 -z-0`}
                    style={{
                      width: `${((currentStatus.step - 1) / (STEPS.length - 1)) * 100}%`,
                    }}
                  />

                  {STEPS.map((s) => {
                    const isPassed = currentStatus.step >= s.step
                    const isCurrent = currentStatus.step === s.step
                    const Icon = s.icon
                    return (
                      <div key={s.step} className="flex flex-col items-center text-center z-10">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            isPassed
                              ? 'bg-brand-700 text-white shadow-md shadow-brand-700/20'
                              : 'bg-white border-2 border-border/80 text-muted'
                          } ${isCurrent ? 'ring-4 ring-brand-100' : ''}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-[0.78rem] mt-2 font-medium ${
                            isPassed ? 'text-foreground' : 'text-muted'
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-center text-[0.85rem] text-muted mt-6 bg-brand-50/50 p-3 rounded-xl border border-brand-100">
                  {currentStatus.desc}
                </p>
              </div>
            ) : (
              <div className="py-6 text-center text-red-600 bg-red-50/50 rounded-2xl border border-red-100 my-4">
                <p className="font-semibold text-[0.92rem]">{t('orderStatusCancelled')}</p>
              </div>
            )}

            {/* Delivery & Contact info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border/60 text-start">
              <div className="bg-[#F9FAFB] p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-[0.78rem] text-muted mb-1">
                  <MapPin className="w-4 h-4 text-brand-600" />
                  {t('deliveryAddress')}
                </div>
                <div className="text-[0.88rem] font-semibold text-foreground">{order.city}</div>
                <div className="text-[0.78rem] text-muted/90 mt-0.5">{order.address}</div>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-[0.78rem] text-muted mb-1">
                  <CreditCard className="w-4 h-4 text-brand-600" />
                  {t('paymentMethod')}
                </div>
                <div className="text-[0.88rem] font-semibold text-foreground">
                  {order.paymentMethod === 'CASH_ON_DELIVERY' ? t('cashOnDelivery') : order.paymentMethod}
                </div>
                <div className="text-[0.78rem] text-muted/90 mt-0.5">{t('cashOnDeliveryDesc')}</div>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-[0.78rem] text-muted mb-1">
                  <Clock className="w-4 h-4 text-brand-600" />
                  {language === 'ar' ? 'تاريخ الطلب' : 'Date'}
                </div>
                <div className="text-[0.88rem] font-semibold text-foreground">
                  {new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-[0.78rem] text-muted/90 mt-0.5">
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* Items card */}
          <div className="bg-white border border-border/60 rounded-3xl p-6 lg:p-8 shadow-sm">
            <h3 className="font-bold text-foreground text-[1.05rem] mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-brand-700" />
              {t('orderSummary')} ({order.items?.length || 0})
            </h3>

            <div className="divide-y divide-border/60">
              {order.items?.map((item) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[0.9rem] font-semibold text-foreground truncate">{item.productTitle}</h4>
                    <span className="text-[0.78rem] text-muted">
                      {item.quantity} × {formatPrice(item.unitPrice)}
                    </span>
                  </div>
                  <div className="text-[0.92rem] font-bold text-brand-800 shrink-0">
                    {formatPrice(item.totalPrice)}
                  </div>
                </div>
              ))}
            </div>

            {/* Price summary */}
            <div className="mt-6 pt-4 border-t border-border/60 space-y-2 text-[0.88rem]">
              <div className="flex justify-between text-muted">
                <span>{t('subtotal')}</span>
                <span className="text-foreground">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>{t('shipping')}</span>
                <span className={order.shipping === 0 ? 'text-emerald-600 font-semibold' : 'text-foreground'}>
                  {order.shipping === 0 ? t('free') : formatPrice(order.shipping)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-foreground pt-3 border-t border-border/60">
                <span>{t('total')}</span>
                <span className="text-brand-700 text-lg">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty / Help helper */}
      {!order && !loading && (
        <div className="max-w-md mx-auto mt-12 text-center bg-white border border-border/60 rounded-3xl p-8">
          <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-brand-600" />
          </div>
          <h3 className="font-bold text-foreground text-[0.95rem]">{t('trackOrderSubtitle')}</h3>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-[0.85rem] font-semibold transition-colors"
            >
              <span>{t('exploreShop')}</span>
              <ArrowIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
