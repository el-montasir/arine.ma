import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { BookOpen, Check, Copy, Package, Share2, Truck, Wallet } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import api from '../utils/api'
import { formatPrice } from '../utils/format'
import { useStoreConfig } from '../hooks/useStoreConfig'
import { trackPurchase } from '../utils/tracking'
import { getThumbnailImageProps } from '../utils/image-variants'
import { registerImageVariantsFromPayload } from '../lib/image-metadata'

function resolveItemImageUrl(item) {
  if (!item) return ''
  if (item.productImage) return item.productImage
  if (item.packageImage) return item.packageImage
  if (item.coverImage) return item.coverImage
  if (typeof item.image === 'string') return item.image
  if (Array.isArray(item.images) && item.images.length > 0) {
    const primary = item.images.find((img) => img?.isPrimary) || item.images[0]
    return typeof primary === 'string' ? primary : primary?.url || ''
  }
  return ''
}

function resolveItemImageWidths(item) {
  if (!item) return []
  if (Array.isArray(item.productImageVariantWidths) && item.productImageVariantWidths.length > 0) {
    return item.productImageVariantWidths
  }
  if (Array.isArray(item.packageImageVariantWidths) && item.packageImageVariantWidths.length > 0) {
    return item.packageImageVariantWidths
  }
  if (Array.isArray(item.imageVariantWidths) && item.imageVariantWidths.length > 0) {
    return item.imageVariantWidths
  }
  if (Array.isArray(item.images) && item.images.length > 0) {
    const primary = item.images.find((img) => img?.isPrimary) || item.images[0]
    if (primary && typeof primary === 'object' && Array.isArray(primary.variantWidths)) {
      return primary.variantWidths
    }
  }
  return []
}

// Shown on the "arrives within" card. Not stored in the admin yet, so it lives here.
const DELIVERY_ESTIMATE = '24–48 ساعة'

// WhatsApp line for confirming an order from this page only (the rest of the
// site keeps using the numbers from Store Settings).
const ORDER_WHATSAPP_NUMBER = '0665128821'

// Moroccan local numbers (06…/07…) to the international form wa.me expects.
function toWhatsAppNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('212')) return digits
  if (digits.startsWith('0')) return `212${digits.slice(1)}`
  return digits
}

// Book and package lines from either the checkout receipt (cart items) or the
// API order (items + packageItems), in one shape for rendering.
function collectLines(order) {
  if (!order) return []
  const lines = []
  for (const item of order.items || []) {
    const isPkg = Boolean(
      item.isPackage || item.packageId || item.packageTitle || (item.itemsSnapshot && item.itemsSnapshot.length > 0)
    )
    lines.push({ item, isPkg })
  }
  for (const item of order.packageItems || []) lines.push({ item, isPkg: true })
  return lines.map(({ item, isPkg }, idx) => {
    const unitPrice = item.unitPrice ?? item.price ?? 0
    const quantity = Number(item.quantity ?? 1)
    const subItems = item.itemsSnapshot || item.items || item.packageItems || []
    return {
      key: `${isPkg ? 'p' : 'b'}-${item.id ?? item.packageId ?? idx}-${idx}`,
      isPkg,
      title: item.productTitle || item.packageTitle || item.title || (isPkg ? 'باقة' : 'كتاب'),
      subtitle: isPkg
        ? (Array.isArray(subItems) ? subItems.map((i) => i.title || i.productTitle || '').filter(Boolean).join(' + ') : '')
        : '',
      quantity,
      unitPrice,
      lineTotal: item.totalPrice ?? Number(unitPrice) * quantity,
      imageUrl: resolveItemImageUrl(item),
      imageWidths: resolveItemImageWidths(item),
    }
  })
}

function Cover({ line, className }) {
  const props = line.imageUrl
    ? getThumbnailImageProps(line.imageUrl, line.imageWidths)
    : null
  if (!props?.src) {
    return (
      <div className={`${className} flex items-center justify-center bg-white/10`}>
        {line.isPkg ? <Package className="w-5 h-5 text-white/50" /> : <BookOpen className="w-5 h-5 text-white/50" />}
      </div>
    )
  }
  return (
    <img
      src={props.src}
      srcSet={props.srcSet || undefined}
      sizes="120px"
      alt=""
      decoding="async"
      className={`${className} object-cover`}
      onError={(e) => {
        if (e.currentTarget.dataset.variantFallbackApplied !== '1') {
          e.currentTarget.removeAttribute('srcset')
          e.currentTarget.dataset.variantFallbackApplied = '1'
        }
      }}
    />
  )
}

// Up to three of the ordered covers, fanned, with a glowing check on top.
function CoverFan({ lines }) {
  const shown = lines.slice(0, 3)
  const tilt = shown.length === 1 ? [0] : shown.length === 2 ? [-8, 8] : [-11, 0, 11]
  return (
    <div className="relative mx-auto h-[150px] w-[220px]" aria-hidden="true">
      <div className="absolute inset-x-6 bottom-2 h-16 rounded-full bg-[#C46BDB]/40 blur-2xl" />
      {shown.map((line, i) => {
        const center = shown.length === 3 ? i === 1 : shown.length === 1
        return (
          <div
            key={line.key}
            className="absolute bottom-3 left-1/2"
            style={{
              transform: `translateX(calc(-50% + ${(i - (shown.length - 1) / 2) * 52}px)) rotate(${tilt[i]}deg)`,
              zIndex: center ? 2 : 1,
            }}
          >
            <Cover
              line={line}
              className={`${center ? 'w-[82px] h-[112px]' : 'w-[70px] h-[96px]'} rounded-[10px] shadow-[0_18px_30px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/20`}
            />
          </div>
        )
      })}
      <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 z-10 w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-b from-[#C46BDB] to-[#6B2178] ring-4 ring-[#10061A]/70 shadow-[0_0_28px_6px_rgba(196,107,219,0.55)]">
        <Check className="w-5 h-5 text-white" strokeWidth={3} />
      </div>
    </div>
  )
}

export default function OrderSuccess() {
  const { state } = useLocation()
  const [searchParams] = useSearchParams()
  const { isRTL } = useLanguage()
  const { config } = useStoreConfig()

  const orderNumFromParams =
    searchParams.get('num') ||
    searchParams.get('orderNumber') ||
    searchParams.get('order')
  const cleanParamOrderNum = orderNumFromParams ? String(orderNumFromParams).trim() : ''

  const [fetchedOrder, setFetchedOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchAttempted, setFetchAttempted] = useState(false)

  // Fetch order from API when specified in URL params, with stale-response race prevention
  useEffect(() => {
    if (!cleanParamOrderNum) {
      setFetchedOrder(null)
      setLoading(false)
      setFetchAttempted(false)
      return
    }

    // If matching order is already supplied by router navigation state, skip network fetch
    if (state?.orderNumber === cleanParamOrderNum) {
      setFetchedOrder(null)
      setLoading(false)
      setFetchAttempted(true)
      return
    }

    // If matching order is already in sessionStorage, skip network fetch
    try {
      const raw = sessionStorage.getItem('arine-last-order')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.orderNumber === cleanParamOrderNum) {
          setFetchedOrder(null)
          setLoading(false)
          setFetchAttempted(true)
          return
        }
      }
    } catch {}

    let ignore = false
    setLoading(true)
    setFetchAttempted(false)
    setFetchedOrder(null)

    api
      .get(`/orders/${encodeURIComponent(cleanParamOrderNum)}`)
      .then((res) => {
        if (!ignore && res?.success && res?.order) {
          if (res.order.orderNumber === cleanParamOrderNum) {
            setFetchedOrder(res.order)
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) {
          setLoading(false)
          setFetchAttempted(true)
        }
      })

    return () => {
      ignore = true
    }
  }, [cleanParamOrderNum, state?.orderNumber])

  // Resolve order: router state -> fetched API order -> sessionStorage fallback.
  // Critical safety rule: When URL specifies an order number, never display a different order from sessionStorage or state.
  let order = null
  if (state?.orderNumber && (!cleanParamOrderNum || state.orderNumber === cleanParamOrderNum)) {
    order = state
  } else if (
    fetchedOrder?.orderNumber &&
    (!cleanParamOrderNum || fetchedOrder.orderNumber === cleanParamOrderNum)
  ) {
    order = fetchedOrder
  } else {
    try {
      const raw = sessionStorage.getItem('arine-last-order')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && parsed.orderNumber) {
          if (!cleanParamOrderNum || parsed.orderNumber === cleanParamOrderNum) {
            order = parsed
          }
        }
      }
    } catch {
      order = null
    }
  }

  // Register image variants if order data contains them
  useEffect(() => {
    if (order) {
      registerImageVariantsFromPayload(order)
    }
  }, [order])

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

  const lines = collectLines(order)
  const coverLines = lines.filter((l) => l.imageUrl)
  const isCashOnDelivery = !order?.paymentMethod || order.paymentMethod === 'CASH_ON_DELIVERY'

  const whatsappNumber = toWhatsAppNumber(
    ORDER_WHATSAPP_NUMBER || config?.store?.whatsapp || config?.store?.whatsappNumbers?.[0]
  )
  const whatsappText = order?.orderNumber
    ? `السلام عليكم، أريد تأكيد طلبي رقم ${order.orderNumber}${order.total != null ? ` (المجموع ${formatPrice(order.total)})` : ''}`
    : 'السلام عليكم، لدي سؤال حول طلبي'
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`
    : null

  const glass =
    'bg-gradient-to-br from-white/[0.11] to-white/[0.04] backdrop-blur-[22px] backdrop-saturate-150 border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_18px_40px_-20px_rgba(0,0,0,0.8)]'

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="relative isolate overflow-hidden bg-[#10061A] text-[#F4ECF8] -mt-[72px] pt-[96px] lg:mt-0 lg:pt-12 pb-14 px-4"
    >
      {/* Amethyst glow behind the glass */}
      <div className="pointer-events-none absolute -z-10 -top-24 -start-24 w-[420px] h-[420px] rounded-full bg-[#8E2DB0]/70 blur-[90px]" />
      <div className="pointer-events-none absolute -z-10 top-[38%] -end-32 w-[380px] h-[380px] rounded-full bg-[#E05BB8]/35 blur-[90px]" />
      <div className="pointer-events-none absolute -z-10 -bottom-24 start-0 w-[420px] h-[420px] rounded-full bg-[#4B2BC9]/45 blur-[100px]" />

      <div className="mx-auto w-full max-w-[460px] flex flex-col gap-3.5">
        {/* 1. The ordered books, with the success check */}
        <section className="text-center pt-2">
          {coverLines.length > 0 ? (
            <CoverFan lines={coverLines} />
          ) : (
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center" aria-hidden="true">
              <div className="absolute inset-0 rounded-full bg-[#C978E0]/35 blur-xl" />
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-b from-[#C46BDB] to-[#6B2178] shadow-[0_0_28px_6px_rgba(196,107,219,0.55)]">
                <Check className="w-7 h-7 text-white" strokeWidth={3} />
              </div>
            </div>
          )}
          <h1 className="font-tajawal font-extrabold text-[1.65rem] sm:text-3xl leading-snug mt-5 text-white">
            تم استلام طلبك بنجاح
          </h1>
          <p className="text-[0.88rem] text-[#B7A6C2] mt-1">
            جزاك الله خيراً على ثقتك بمكتبة أرين
          </p>
        </section>

        {loading && !order && (
          <div className="flex justify-center py-6" aria-label="جارِ التحميل">
            <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-[#E0A6EE] animate-spin" />
          </div>
        )}
        {fetchAttempted && !loading && !order && cleanParamOrderNum && (
          <p className={`${glass} rounded-[18px] px-4 py-3 text-center text-[0.85rem] text-[#D9C8E2]`}>
            لم نجد تفاصيل هذا الطلب هنا، يمكنك متابعته من صفحة تتبع الطلب.
          </p>
        )}

        {/* 2. Order number */}
        {order?.orderNumber && (
          <section className={`${glass} rounded-[22px] px-4 py-3.5`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.75rem] text-[#B7A6C2]">رقم الطلب — احتفظ به لتتبع طلبك</span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="نسخ رقم الطلب"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#F0D6F7]/35 px-3 py-1 text-[0.75rem] font-bold text-[#F0D6F7] hover:bg-white/10 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'تم النسخ' : 'نسخ'}
              </button>
            </div>
            <div dir="ltr" className="mt-1.5 font-mono font-semibold text-[1.3rem] sm:text-[1.45rem] tracking-wide text-white text-end break-all">
              {order.orderNumber}
            </div>
          </section>
        )}

        {/* 3. Items and total */}
        {lines.length > 0 && (
          <section className={`${glass} rounded-[22px] px-4 pt-1.5 pb-3.5`}>
            <ul className="divide-y divide-white/[0.08]">
              {lines.map((line) => (
                <li key={line.key} className="flex items-center gap-3 py-3">
                  <Cover
                    line={line}
                    className={`${line.isPkg ? 'w-12 h-12' : 'w-11 h-[60px]'} shrink-0 rounded-lg ring-1 ring-white/15 shadow-[0_8px_18px_-6px_rgba(0,0,0,0.8)]`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {line.isPkg && (
                        <span className="shrink-0 rounded-full bg-[#C46BDB]/25 px-2 py-0.5 text-[0.65rem] font-bold text-[#F0D6F7]">باقة</span>
                      )}
                      <h3 className="truncate text-[0.9rem] font-bold text-white">{line.title}</h3>
                    </div>
                    {line.subtitle && <p className="truncate text-[0.72rem] text-[#B7A6C2] mt-0.5">{line.subtitle}</p>}
                    <p className="text-[0.76rem] text-[#B7A6C2] mt-0.5">
                      {line.quantity} × {formatPrice(line.unitPrice)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.9rem] font-extrabold text-white">{formatPrice(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            {order?.total != null && (
              <div className="flex items-center justify-between border-t border-white/[0.08] pt-3">
                <span className="font-tajawal text-[1.05rem] font-extrabold text-white">المجموع مع التوصيل</span>
                <span className="font-tajawal text-[1.15rem] font-extrabold bg-gradient-to-l from-[#F3C6FF] to-[#C46BDB] bg-clip-text text-transparent">
                  {formatPrice(order.total)}
                </span>
              </div>
            )}
          </section>
        )}

        {/* 4. What to prepare and when it arrives */}
        <section className="grid grid-cols-2 gap-3">
          <div className={`${glass} rounded-[20px] px-3.5 py-3`}>
            <span className="flex items-center gap-1.5 text-[0.72rem] text-[#B7A6C2]">
              <Wallet className="w-3.5 h-3.5" />
              {isCashOnDelivery ? 'جهّز عند الاستلام' : 'المبلغ'}
            </span>
            <strong className="block font-tajawal text-[1.1rem] font-extrabold text-white mt-0.5">
              {order?.total != null ? formatPrice(order.total) : '—'}
            </strong>
          </div>
          <div className={`${glass} rounded-[20px] px-3.5 py-3`}>
            <span className="flex items-center gap-1.5 text-[0.72rem] text-[#B7A6C2]">
              <Truck className="w-3.5 h-3.5" />
              يصلك خلال
            </span>
            <strong className="block font-tajawal text-[1.1rem] font-extrabold text-white mt-0.5">{DELIVERY_ESTIMATE}</strong>
          </div>
        </section>

        {/* 5. Actions */}
        <section className="grid grid-cols-2 gap-3">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-[18px] border border-[#25D366]/45 bg-[#25D366]/15 py-3.5 text-[0.9rem] font-bold text-[#7CF0A9] backdrop-blur-xl hover:bg-[#25D366]/25 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.3.4c.1.2.6 1 1.3 1.6.9.8 1.6 1 1.9 1.2.2.1.4.1.5-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.6-.1 1.2z" />
              </svg>
              واتساب
            </a>
          ) : (
            <Link
              to="/shop"
              className={`${glass} flex items-center justify-center gap-2 rounded-[18px] py-3.5 text-[0.9rem] font-bold text-white`}
            >
              <BookOpen className="w-4 h-4" />
              تصفح الكتب
            </Link>
          )}
          <Link
            to={order?.orderNumber ? `/track-order?num=${encodeURIComponent(order.orderNumber)}` : '/track-order'}
            className="flex items-center justify-center gap-2 rounded-[18px] bg-gradient-to-b from-[#B455CB] to-[#6B2178] py-3.5 text-[0.9rem] font-bold text-white shadow-[0_8px_24px_-8px_rgba(180,85,203,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-110 transition"
          >
            <Truck className="w-4 h-4" />
            تتبع الطلب
          </Link>
        </section>

        <div className="mt-1 flex items-center justify-center gap-5 text-[0.82rem] font-semibold text-[#D9B8E6]">
          {whatsappHref && (
            <Link to="/shop" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
              <BookOpen className="w-3.5 h-3.5" />
              تصفح المزيد من الكتب
            </Link>
          )}
          {order?.orderNumber && (
            <button type="button" onClick={handleShare} className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
              <Share2 className="w-3.5 h-3.5" />
              مشاركة الطلب
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
