import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, User, MapPin, CreditCard, ArrowLeft, ArrowRight, Package, Truck } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice } from '../utils/format'
import { trackPurchase } from '../utils/tracking'

export default function OrderSuccess() {
  const { state } = useLocation()
  const { t, isRTL } = useLanguage()

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

  useEffect(() => {
    if (order && order.orderNumber) {
      const trackedKey = `arine_tracked_order_${order.orderNumber}`
      try {
        if (!sessionStorage.getItem(trackedKey)) {
          trackPurchase({
            orderNumber: order.orderNumber,
            total: order.total,
            items: order.items || [],
            eventId: order.eventId || order.orderNumber,
          })
          sessionStorage.setItem(trackedKey, '1')
        }
      } catch {
        trackPurchase({
          orderNumber: order.orderNumber,
          total: order.total,
          items: order.items || [],
          eventId: order.eventId || order.orderNumber,
        })
      }
    }
  }, [order?.orderNumber])

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-12 lg:py-20">
      <div className="max-w-[540px] mx-auto text-center">
        {/* Success illustration */}
        <div className="w-24 h-24 bg-[#E8F7F1] border-2 border-[#0F6E51]/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-[#0F6E51]" />
        </div>

        <h1 className="font-tajawal font-extrabold text-3xl sm:text-4xl text-[#1C1220] tracking-tight mb-2">
          {t('thankYou')}
        </h1>
        <p className="text-[#7A6D80] text-sm sm:text-base max-w-[440px] mx-auto leading-relaxed">
          {t('orderReceivedSuccess')}
        </p>

        {order ? (
          <>
            {/* Order number */}
            <div className="mt-8 inline-flex items-center gap-3 bg-[#F6EDF9] border border-[#EBDCF1] rounded-[20px] px-6 py-3.5 shadow-xs">
              <Package className="w-5 h-5 text-[#6B2178]" />
              <div className="text-start">
                <div className="text-[0.72rem] text-[#7A6D80] font-medium mb-0.5">{t('orderNumberLabel')}</div>
                <div dir="ltr" className="text-[1.1rem] font-bold text-[#6B2178] font-mono tracking-wide">
                  {order.orderNumber}
                </div>
              </div>
            </div>

            {/* Receipt details */}
            <div className="mt-8 bg-white border border-[#EFE8F2] rounded-[24px] p-2 divide-y divide-[#EFE8F2] text-start shadow-[0_1px_2px_rgba(62,17,71,.04),0_12px_32px_-12px_rgba(62,17,71,.12)]">
              <div className="flex items-center justify-between p-4 sm:px-5">
                <span className="flex items-center gap-2.5 text-[0.85rem] text-[#7A6D80] font-medium">
                  <User className="w-4 h-4 text-[#6B2178]" /> {t('fullName')}
                </span>
                <span className="text-[0.9rem] font-bold text-[#1C1220]">{order.fullName}</span>
              </div>
              <div className="flex items-center justify-between p-4 sm:px-5">
                <span className="flex items-center gap-2.5 text-[0.85rem] text-[#7A6D80] font-medium">
                  <MapPin className="w-4 h-4 text-[#6B2178]" /> {t('city')}
                </span>
                <span className="text-[0.9rem] font-bold text-[#1C1220]">{order.city}</span>
              </div>
              <div className="flex items-center justify-between p-4 sm:px-5">
                <span className="flex items-center gap-2.5 text-[0.85rem] text-[#7A6D80] font-medium">
                  <CreditCard className="w-4 h-4 text-[#6B2178]" /> {t('paymentMethod')}
                </span>
                <span className="text-[0.9rem] font-bold text-[#1C1220]">
                  {order.paymentMethod === 'CASH_ON_DELIVERY' ? t('cashOnDelivery') : order.paymentMethod}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 sm:px-5">
                <span className="text-[0.88rem] font-bold text-[#1C1220]">{t('total')}</span>
                <span className="font-tajawal font-extrabold text-xl text-[#6B2178]">{formatPrice(order.total)}</span>
              </div>
            </div>

            {/* Track order direct link */}
            <div className="mt-4">
              <Link
                to={`/track-order?num=${encodeURIComponent(order.orderNumber)}`}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-[#F6EDF9] hover:bg-[#EBDCF1] text-[#6B2178] border border-[#EBDCF1] text-[0.92rem] font-bold rounded-[14px] transition-all shadow-xs"
              >
                <Truck className="w-4 h-4 text-[#6B2178]" />
                {t('trackYourOrder')}
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-8 text-[#7A6D80] text-[0.88rem]">
            {t('orderReceivedSuccess')}
          </p>
        )}

        {/* CTAs */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#8F3AA1] to-[#6B2178] hover:opacity-95 text-white text-base font-bold rounded-[16px] transition-all shadow-lg shadow-[#6B2178]/25 active:scale-[0.99] cursor-pointer"
          >
            <span>{t('backToStore')}</span>
            <ArrowIcon className="w-4 h-4" />
          </Link>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white border border-[#EFE8F2] hover:border-[#EBDCF1] hover:bg-[#F6EDF9]/40 text-[#1C1220] text-base font-bold rounded-[16px] transition-all shadow-xs cursor-pointer"
          >
            {t('exploreShop')}
          </Link>
        </div>
      </div>
    </div>
  )
}
