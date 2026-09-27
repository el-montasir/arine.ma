import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Check, CheckCircle2, Clock, Copy, CreditCard, MapPin, Package, ShieldCheck, Share2, Truck, User, ArrowLeft, ArrowRight } from 'lucide-react'
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
      try { navigator.clipboard.writeText(order.orderNumber); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
    }
  }
  const handleShare = () => {
    if (!order?.orderNumber) return
    const url = window.location.origin + '/track-order?num=' + encodeURIComponent(order.orderNumber)
    try { if (navigator.share) navigator.share({ title: order.orderNumber, text: 'طلب ' + order.orderNumber, url }); else if (navigator.clipboard) navigator.clipboard.writeText(url); } catch {}
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-14 lg:py-24">
      <div className="max-w-[720px] mx-auto">
        {/* Success top */}
        <section className="text-center mb-10">
          <div className="w-20 h-20 bg-[#E8F7F1] border border-[#0F6E51]/15 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10 text-[#0F6E51]" strokeWidth={2.5}/></div>
          <h1 className="font-tajawal font-extrabold text-3xl sm:text-[2.5rem] text-[#161616] tracking-tight leading-[1.15] mb-3">تم استلام طلبك بنجاح!</h1>
          <p className="text-[#6B7280] text-sm sm:text-base max-w-[420px] mx-auto leading-relaxed">تم تسجيل طلبك وسيقوم فريقنا بالتواصل معك قريباً لتجهيز وإرسال الطلب.</p>
        </section>

        {/* Order number */}
        {order?.orderNumber && (
          <section className="mb-10 flex justify-center">
            <div className="inline-flex items-center gap-4 bg-white border border-[#E5E7EB] rounded-2xl px-6 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center"><Package className="w-5 h-5 text-[#6B2178]"/></div>
              <div className="text-start">
                <div className="text-[0.75rem] text-[#6B7280] font-medium">رقم الطلب</div>
                <div dir="ltr" className="text-base font-bold text-[#161616] font-mono tracking-wide flex items-center gap-2">
                  <span>{order.orderNumber}</span>
                  <button onClick={handleCopy} type="button" aria-label="نسخ" className="inline-flex items-center gap-1 text-[0.78rem] text-[#6B2178] font-medium">{copied ? <><Check className="w-3.5 h-3.5"/> تم النسخ</> : <><Copy className="w-3.5 h-3.5"/> نسخ</>}</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Details card */}
        <section className="mb-10">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-6 pt-6 pb-3"><h2 className="text-[1.05rem] font-extrabold text-[#161616] flex items-center gap-2.5"><Package className="w-5 h-5 text-[#6B2178]" strokeWidth={2.2}/> تفاصيل الطلب</h2></div>
            <div className="px-6">
              <div className="divide-y divide-[#E5E7EB]">
                {/* Product items */}
                {order?.items?.map((item) => {
                  const thumbProps = item.productImage ? getThumbnailImageProps(item.productImage, item.productImageVariantWidths || []) : { src: '', srcSet: '', sizes: '', fallbackSrc: '' }
                  return (
                    <div key={item.id || item.productTitle} className="py-4 flex items-start gap-4">
                      <div className="w-14 h-20 shrink-0">{item.productImage ? <img src={thumbProps.src} srcSet={thumbProps.srcSet||''} sizes={thumbProps.sizes||'60px'} alt="" className="w-14 h-20 object-cover rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]" loading="lazy" decoding="async" onError={e=>{ if(e.currentTarget.dataset.variantFallbackApplied!=='1'){e.currentTarget.removeAttribute('srcset');e.currentTarget.removeAttribute('sizes');e.currentTarget.dataset.variantFallbackApplied='1';}}}/> : <div className="w-14 h-20 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center"><BookOpen className="w-6 h-6 text-[#D1D5DB]"/></div>}</div>
                      <div className="min-w-0 flex-1 pt-0.5"><h3 className="text-[0.92rem] font-bold text-[#161616] truncate">{item.productTitle||item.title||'منتج'}</h3><p className="text-[0.82rem] text-[#6B7280] mt-1.5">{item.quantity} × {formatPrice(item.unitPrice||item.price)}</p></div>
                      <div className="text-[0.92rem] font-extrabold text-[#161616] pt-0.5 shrink-0">{formatPrice(item.totalPrice)}</div>
                    </div>
                  )
                })}
                {/* Package items */}
                {order?.packageItems?.map((item) => {
                  const thumbProps = item.packageImage ? getThumbnailImageProps(item.packageImage, item.packageImageVariantWidths || []) : { src: '', srcSet: '', sizes: '', fallbackSrc: '' }
                  return (
                    <div key={item.id || item.packageTitle} className="py-4 flex items-start gap-4">
                      <div className="w-14 h-14 shrink-0">{item.packageImage ? <img src={thumbProps.src} srcSet={thumbProps.srcSet||''} sizes={thumbProps.sizes||'60px'} alt="" className="w-14 h-14 object-cover rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]" loading="lazy" decoding="async" onError={e=>{ if(e.currentTarget.dataset.variantFallbackApplied!=='1'){e.currentTarget.removeAttribute('srcset');e.currentTarget.removeAttribute('sizes');e.currentTarget.dataset.variantFallbackApplied='1';}}}/> : <div className="w-14 h-14 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center"><Package className="w-6 h-6 text-[#D1D5DB]"/></div>}</div>
                      <div className="min-w-0 flex-1 pt-0.5"><div className="flex items-center gap-1.5"><span className="text-[0.7rem] font-semibold bg-[#6B2178]/10 text-[#6B2178] px-2 py-0.5 rounded-md">باقة</span><h3 className="text-[0.92rem] font-bold text-[#161616] truncate">{item.packageTitle||item.title||'باقة'}</h3></div>{item.itemsSnapshot?.length>0 && <p className="text-[0.75rem] text-[#6B7280] truncate mt-1">{item.itemsSnapshot.map(i=>i.title||i.productTitle||'').filter(Boolean).join(' + ')}</p>}<p className="text-[0.82rem] text-[#6B7280] mt-1.5">{item.quantity} × {formatPrice(item.unitPrice||item.price)}</p></div>
                      <div className="text-[0.92rem] font-extrabold text-[#161616] pt-0.5 shrink-0">{formatPrice(item.totalPrice)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="border-t border-[#E5E7EB] bg-[#FAFAFA] px-6 py-6 space-y-4">
              {(order.fullName||order.customerName||order.name)&&<div className="flex justify-between"><span className="flex items-center gap-2 text-[0.85rem] text-[#6B7280] font-medium"><User className="w-4 h-4 text-[#6B2178]"/> العميل</span><span className="text-[0.9rem] font-bold text-[#161616]">{order.fullName||order.customerName||order.name}</span></div>}
              {(order.city||order.cityName)&&<div className="flex justify-between"><span className="flex items-center gap-2 text-[0.85rem] text-[#6B7280] font-medium"><MapPin className="w-4 h-4 text-[#6B2178]"/> المدينة</span><span className="text-[0.9rem] font-bold text-[#161616]">{order.city||order.cityName}</span></div>}
              {order.paymentMethod&&<div className="flex justify-between"><span className="flex items-center gap-2 text-[0.85rem] text-[#6B7280] font-medium"><CreditCard className="w-4 h-4 text-[#6B2178]"/> طريقة الدفع</span><span className="text-[0.9rem] font-bold text-[#161616]">{order.paymentMethod==='CASH_ON_DELIVERY'?'الدفع عند الاستلام':order.paymentMethod}</span></div>}
              <div className="pt-3 border-t border-[#E5E7EB] flex justify-between"><span className="text-[0.92rem] font-extrabold text-[#161616]">الإجمالي</span><span className="font-tajawal font-extrabold text-xl text-[#6B2178]">{formatPrice(order.total||0)}</span></div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="mb-10"><div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5"><Link to={`/track-order?num=${encodeURIComponent(order?.orderNumber||'')}`} className="inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-[#161616] hover:bg-[#262626] text-white text-[0.92rem] font-extrabold rounded-2xl transition-all shadow-[0_1px_3px_rgba(0,0,0,0.12)] active:scale-[0.99]"><Truck className="w-4 h-4"/> متابعة الطلب</Link><Link to="/shop" className="inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-white border border-[#E5E7EB] hover:border-[#EBDCF1] hover:bg-[#F9FAFB] text-[#161616] text-[0.92rem] font-extrabold rounded-2xl transition-all active:scale-[0.99]"><BookOpen className="w-4 h-4 text-[#6B2178]"/> تصفح الكتب</Link><button type="button" onClick={handleShare} className="inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-white border border-[#E5E7EB] hover:border-[#EBDCF1] hover:bg-[#F9FAFB] text-[#161616] text-[0.92rem] font-extrabold rounded-2xl transition-all active:scale-[0.99]"><Share2 className="w-4 h-4 text-[#6B2178]"/> مشاركة الطلب</button></div></section>

        {/* Progress */}
        <section className="mb-6"><div className="bg-white border border-[#E5E7EB] rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden"><div className="px-6 pt-6 pb-4"><h2 className="text-[1.05rem] font-extrabold text-[#161616] flex items-center gap-2.5"><Clock className="w-5 h-5 text-[#6B2178]" strokeWidth={2.2}/> ماذا يحدث الآن؟</h2></div><div className="px-6 pb-6"><div className="relative"><div className="absolute top-[2.2rem] bottom-[2.2rem] start-[1.15rem] w-px bg-[#E5E7EB]"/><div className="space-y-6">{[
          {label:'تم استلام الطلب',desc:'تم تسجيل طلبك بنجاح',icon:CheckCircle2,done:true},
          {label:'تجهيز الطلب',desc:'سنقوم بتجهيز طلبك قريباً',icon:Package,done:false},
          {label:'في طريقه إليك',desc:'سيتم شحن طلبك قريباً',icon:Truck,done:false},
          {label:'تم التوصيل',desc:'سيصلك طلبك قريباً',icon:ShieldCheck,done:false}
        ].map((s,i)=>{
          const Ic=s.icon; return (
            <div key={i} className="relative flex gap-4">
              <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${s.done?'bg-[#0F6E51] text-white':'bg-white border-2 border-[#E5E7EB] text-[#9CA3AF]'}`}><Ic className="w-5 h-5" strokeWidth={2}/></div>
              <div className="pt-0.5 min-w-0"><h3 className="text-[0.92rem] font-extrabold leading-snug text-[#161616]">{s.label}</h3><p className="text-[0.82rem] text-[#6B7280] mt-0.5">{s.desc}</p></div>
            </div>
          )
        })}</div></div></div></div></section>
      </div>
    </div>
  )
}

/* Small safe helpers — never shadow translation t */
function getItemThumbProps(path, widths) { try { return getThumbnailImageProps(path, widths||[]) } catch { return {src:path||'',srcSet:'',sizes:'60px',fallbackSrc:path||''} } }
