import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  MapPin,
  Package,
  ShieldCheck,
  Share2,
  Truck,
  User,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice } from '../utils/format'
import { trackPurchase } from '../utils/tracking'
import { getThumbnailImageProps } from '../utils/image-variants'

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

  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    if (order?.orderNumber) {
      try {
        navigator.clipboard.writeText(order.orderNumber)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      } catch {}
    }
  }

  const handleShare = () => {
    if (!order?.orderNumber) return
    const url =
      window.location.origin +
      '/track-order?num=' +
      encodeURIComponent(order.orderNumber)
    try {
      if (navigator.share) {
        navigator.share({
          title: order.orderNumber,
          text: 'طلب ' + order.orderNumber,
          url,
        })
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url)
      }
    } catch {}
  }

  return (
    <div className="min-h-[calc(100dvh-120px)] bg-gradient-to-b from-[#FAF7FB] via-[#F6EDF9]/40 to-[#FAF7FB] py-6 sm:py-10 px-3 sm:px-4 flex items-center justify-center relative overflow-hidden">
      {/* Soft Ambient Background Atmospheric Glow */}
      <div className="absolute top-1/4 -start-24 w-80 h-80 bg-[#8F3AA1]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -end-24 w-80 h-80 bg-[#6B2178]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Glass Card Container */}
      <div className="w-[calc(100%-24px)] sm:w-[calc(100%-32px)] max-w-[520px] mx-auto bg-white/92 backdrop-blur-[20px] backdrop-saturate-[140%] border border-white/80 rounded-[28px] shadow-[0_14px_45px_-18px_rgba(76,22,96,0.18),0_4px_20px_-6px_rgba(143,58,161,0.08),0_1px_3px_rgba(0,0,0,0.04)] p-5 sm:p-7 relative z-10 my-2 sm:my-6">
        {/* 1. Success Icon & Header */}
        <section className="text-center mb-6">
          <div className="w-16 h-16 bg-[#E8F7F1] border border-[#0F6E51]/15 rounded-full flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
            <CheckCircle2 className="w-8 h-8 text-[#0F6E51]" strokeWidth={2.5} />
          </div>
          <h1 className="font-tajawal font-extrabold text-2xl sm:text-[1.7rem] text-[#1C1220] tracking-tight leading-snug mb-1.5">
            تم استلام طلبك بنجاح!
          </h1>
          <p className="text-[#7A6D80] text-xs sm:text-sm max-w-[380px] mx-auto leading-relaxed">
            تم تسجيل طلبك وسيقوم فريقنا بالتواصل معك قريباً لتجهيز وإرسال الطلب.
          </p>
        </section>

        {/* 2. Order Number Nested Glass Card */}
        {order?.orderNumber && (
          <section className="mb-4">
            <div className="bg-[#FAF7FC]/90 border border-[#EBDCF1]/80 rounded-[18px] p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-[12px] bg-[#F6EDF9] border border-[#EBDCF1] flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-[#6B2178]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[0.72rem] text-[#7A6D80] font-medium leading-none mb-1">
                    رقم الطلب
                  </div>
                  <div
                    dir="ltr"
                    className="text-sm sm:text-base font-bold text-[#1C1220] font-mono tracking-wide truncate"
                  >
                    {order.orderNumber}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCopy}
                type="button"
                aria-label="نسخ رقم الطلب"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[10px] bg-white/90 border border-[#EBDCF1] text-[#6B2178] hover:text-[#8F3AA1] hover:bg-white hover:border-[#8F3AA1]/40 transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#0F6E51]" />
                    <span className="text-[#0F6E51]">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* 3. Order Details Nested Card */}
        <section className="mb-4">
          <div className="bg-white/80 border border-[#EFE8F2] rounded-[20px] shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-[#EFE8F2]/80 bg-[#FAF7FC]/50 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#6B2178]" strokeWidth={2.2} />
              <h2 className="text-[0.9rem] font-extrabold text-[#1C1220]">تفاصيل الطلب</h2>
            </div>

            {/* Items list */}
            <div className="px-4 divide-y divide-[#EFE8F2]/70">
              {/* Product items */}
              {order?.items?.map((item) => {
                const thumbProps = item.productImage
                  ? getThumbnailImageProps(item.productImage, item.productImageVariantWidths || [])
                  : { src: '', srcSet: '', sizes: '', fallbackSrc: '' }
                const lineTotal =
                  item.totalPrice ??
                  Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity ?? 1)

                return (
                  <div
                    key={item.id || item.productTitle}
                    className="py-3 sm:py-3.5 flex items-center gap-3"
                  >
                    <div className="w-12 h-16 shrink-0">
                      {item.productImage ? (
                        <img
                          src={thumbProps.src}
                          srcSet={thumbProps.srcSet || ''}
                          sizes={thumbProps.sizes || '48px'}
                          alt=""
                          className="w-12 h-16 object-cover rounded-[10px] border border-[#EFE8F2] bg-[#FAF7FC]"
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
                      ) : (
                        <div className="w-12 h-16 rounded-[10px] border border-[#EFE8F2] bg-[#FAF7FC] flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-[#D1D5DB]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[0.85rem] font-bold text-[#1C1220] truncate">
                        {item.productTitle || item.title || 'منتج'}
                      </h3>
                      <p className="text-[0.76rem] text-[#7A6D80] mt-1">
                        {item.quantity} × {formatPrice(item.unitPrice || item.price)}
                      </p>
                    </div>

                    <div className="text-[0.88rem] font-extrabold text-[#1C1220] shrink-0">
                      {formatPrice(lineTotal)}
                    </div>
                  </div>
                )
              })}

              {/* Package items */}
              {order?.packageItems?.map((item) => {
                const thumbProps = item.packageImage
                  ? getThumbnailImageProps(item.packageImage, item.packageImageVariantWidths || [])
                  : { src: '', srcSet: '', sizes: '', fallbackSrc: '' }
                const lineTotal =
                  item.totalPrice ??
                  Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity ?? 1)

                return (
                  <div
                    key={item.id || item.packageTitle}
                    className="py-3 sm:py-3.5 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 shrink-0">
                      {item.packageImage ? (
                        <img
                          src={thumbProps.src}
                          srcSet={thumbProps.srcSet || ''}
                          sizes={thumbProps.sizes || '48px'}
                          alt=""
                          className="w-12 h-12 object-cover rounded-[10px] border border-[#EFE8F2] bg-[#FAF7FC]"
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
                      ) : (
                        <div className="w-12 h-12 rounded-[10px] border border-[#EFE8F2] bg-[#FAF7FC] flex items-center justify-center">
                          <Package className="w-5 h-5 text-[#D1D5DB]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.68rem] font-bold bg-[#6B2178]/10 text-[#6B2178] px-1.5 py-0.5 rounded-md">
                          باقة
                        </span>
                        <h3 className="text-[0.85rem] font-bold text-[#1C1220] truncate">
                          {item.packageTitle || item.title || 'باقة'}
                        </h3>
                      </div>
                      {item.itemsSnapshot?.length > 0 && (
                        <p className="text-[0.72rem] text-[#7A6D80] truncate mt-1">
                          {item.itemsSnapshot
                            .map((i) => i.title || i.productTitle || '')
                            .filter(Boolean)
                            .join(' + ')}
                        </p>
                      )}
                      <p className="text-[0.76rem] text-[#7A6D80] mt-1">
                        {item.quantity} × {formatPrice(item.unitPrice || item.price)}
                      </p>
                    </div>

                    <div className="text-[0.88rem] font-extrabold text-[#1C1220] shrink-0">
                      {formatPrice(lineTotal)}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Customer, delivery & total metadata */}
            <div className="border-t border-[#EFE8F2] bg-[#FAF7FC]/60 px-4 py-3.5 space-y-2.5">
              {(order.fullName || order.customerName || order.name) && (
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 text-[#7A6D80] font-medium">
                    <User className="w-3.5 h-3.5 text-[#6B2178]" />
                    <span>العميل</span>
                  </span>
                  <span className="text-[#1C1220] font-semibold">
                    {order.fullName || order.customerName || order.name}
                  </span>
                </div>
              )}

              {(order.city || order.cityName) && (
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 text-[#7A6D80] font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#6B2178]" />
                    <span>المدينة</span>
                  </span>
                  <span className="text-[#1C1220] font-semibold">
                    {order.city || order.cityName}
                  </span>
                </div>
              )}

              {order.paymentMethod && (
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 text-[#7A6D80] font-medium">
                    <CreditCard className="w-3.5 h-3.5 text-[#6B2178]" />
                    <span>طريقة الدفع</span>
                  </span>
                  <span className="text-[#1C1220] font-semibold">
                    {order.paymentMethod === 'CASH_ON_DELIVERY'
                      ? 'الدفع عند الاستلام'
                      : order.paymentMethod}
                  </span>
                </div>
              )}

              <div className="pt-2.5 border-t border-[#EFE8F2] flex justify-between items-center">
                <span className="text-[0.88rem] font-extrabold text-[#1C1220]">الإجمالي</span>
                <span className="font-tajawal font-extrabold text-lg sm:text-xl text-[#6B2178]">
                  {formatPrice(order.total || 0)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Compact "What Happens Next" Stepper */}
        <section className="mb-5">
          <div className="bg-white/80 border border-[#EFE8F2] rounded-[20px] p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-[#EFE8F2]/80">
              <Clock className="w-4 h-4 text-[#6B2178]" strokeWidth={2.2} />
              <h2 className="text-[0.9rem] font-extrabold text-[#1C1220]">ماذا يحدث الآن؟</h2>
            </div>

            <div className="relative">
              {/* Vertical Stepper Line */}
              <div
                className={`absolute top-4 bottom-4 w-0.5 bg-[#EFE8F2] ${
                  isRTL ? 'right-4 -mr-[1px]' : 'left-4 -ml-[1px]'
                }`}
              />

              <div className="space-y-4">
                {[
                  {
                    label: 'تم استلام الطلب',
                    desc: 'تم تسجيل طلبك بنجاح',
                    icon: CheckCircle2,
                    done: true,
                  },
                  {
                    label: 'تجهيز الطلب',
                    desc: 'سنقوم بتجهيز طلبك قريباً',
                    icon: Package,
                    done: false,
                  },
                  {
                    label: 'في طريقه إليك',
                    desc: 'سيتم شحن طلبك قريباً',
                    icon: Truck,
                    done: false,
                  },
                  {
                    label: 'تم التوصيل',
                    desc: 'سيصلك طلبك قريباً',
                    icon: ShieldCheck,
                    done: false,
                  },
                ].map((step, idx) => {
                  const StepIcon = step.icon
                  return (
                    <div key={idx} className="relative flex items-center gap-3">
                      <div
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                          step.done
                            ? 'bg-[#0F6E51] text-white'
                            : 'bg-white border border-[#EFE8F2] text-[#9CA3AF]'
                        }`}
                      >
                        <StepIcon className="w-4 h-4" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <h3
                          className={`text-xs font-bold leading-tight ${
                            step.done ? 'text-[#1C1220]' : 'text-[#7A6D80]'
                          }`}
                        >
                          {step.label}
                        </h3>
                        <p className="text-[0.72rem] text-[#7A6D80]/80 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 5. Action Buttons */}
        <section className="space-y-2.5">
          {/* Primary Action Button */}
          <Link
            to={`/track-order?num=${encodeURIComponent(order?.orderNumber || '')}`}
            className="w-full py-3 sm:py-3.5 px-4 bg-gradient-to-r from-[#8F3AA1] to-[#6B2178] hover:opacity-95 text-white text-xs sm:text-sm font-bold rounded-[14px] shadow-md shadow-[#6B2178]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <Truck className="w-4 h-4" />
            <span>متابعة الطلب</span>
          </Link>

          {/* Secondary Actions Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              to="/shop"
              className="py-2.5 sm:py-3 px-3 bg-white/90 border border-[#EFE8F2] hover:border-[#EBDCF1] hover:bg-white text-[#1C1220] text-xs font-bold rounded-[12px] flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-[0.99]"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#6B2178]" />
              <span>تصفح الكتب</span>
            </Link>

            <button
              type="button"
              onClick={handleShare}
              className="py-2.5 sm:py-3 px-3 bg-white/90 border border-[#EFE8F2] hover:border-[#EBDCF1] hover:bg-white text-[#1C1220] text-xs font-bold rounded-[12px] flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-[0.99] cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#6B2178]" />
              <span>مشاركة الطلب</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
