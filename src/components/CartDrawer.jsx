import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Package as PackageIcon,
  MapPin,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import BookCover from './BookCover'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useCheckout } from '../hooks/useCheckout'
import { formatPrice } from '../utils/format'
import { getThumbnailImageProps, createVariantFallbackHandler } from '../utils/image-variants'
import { widthsForImageUrl } from '../lib/image-metadata'

function CartDrawerCheckout({ onBack, onClose }) {
  const {
    form,
    fieldErrors,
    formError,
    submitting,
    update,
    handleSubmit,
    items,
    subtotal,
    shipping,
    total,
    shippingConfig,
  } = useCheckout({
    onSuccess: () => {
      onClose()
    },
  })
  const { t, isRTL } = useLanguage()

  const BackIcon = isRTL ? ArrowRight : ArrowLeft
  const SubmitArrowIcon = isRTL ? ArrowLeft : ArrowRight

  const inputClass = (hasError) =>
    `w-full px-3.5 py-2.5 sm:py-3 bg-[#F5F1F7] border rounded-[12px] text-[0.85rem] text-[#1C1220] placeholder:text-[#7A6D80]/50 outline-none focus:bg-white focus:ring-2 focus:ring-[#EBDCF1] transition-all ${
      hasError
        ? 'border-red-300 focus:border-red-500'
        : 'border-[#EFE8F2] focus:border-[#8F3AA1]'
    }`

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EFE8F2] bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 -ms-1.5 rounded-xl text-[#7A6D80] hover:text-[#1C1220] hover:bg-[#F5F1F7] transition-colors flex items-center justify-center cursor-pointer"
            aria-label="العودة للسلة"
          >
            <BackIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-tajawal font-extrabold text-[#1C1220]">{t('checkout')}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-[#7A6D80] hover:text-[#1C1220] hover:bg-[#F5F1F7] transition-colors cursor-pointer"
          aria-label={t('close')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form with scrollable body and fixed footer */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 space-y-3.5">
          {formError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-200 text-red-700 text-[0.82rem] rounded-[14px]"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Contact Information Card */}
          <div className="bg-white rounded-[16px] border border-[#EFE8F2] p-3.5 sm:p-4 shadow-2xs">
            <h3 className="font-tajawal font-extrabold text-[0.92rem] text-[#1C1220] mb-3 flex items-center gap-2 pb-2.5 border-b border-[#EFE8F2]">
              <div className="w-5 h-5 bg-[#F6EDF9] text-[#6B2178] border border-[#EBDCF1] rounded-full flex items-center justify-center text-[0.7rem] font-bold shadow-2xs shrink-0">1</div>
              <span>{t('contactInfo')}</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[0.78rem] text-[#4A3D50] font-semibold mb-1">{t('fullName')} *</label>
                <input
                  type="text"
                  placeholder={t('fullNamePlaceholder')}
                  value={form.fullName}
                  onChange={update('fullName')}
                  aria-invalid={!!fieldErrors.fullName}
                  className={inputClass(fieldErrors.fullName)}
                />
                {fieldErrors.fullName && (
                  <p className="text-[0.72rem] text-red-600 mt-1">{fieldErrors.fullName}</p>
                )}
              </div>
              <div>
                <label className="block text-[0.78rem] text-[#4A3D50] font-semibold mb-1">{t('phone')} *</label>
                <input
                  type="tel"
                  placeholder={t('phonePlaceholder')}
                  value={form.phone}
                  onChange={update('phone')}
                  aria-invalid={!!fieldErrors.phone}
                  className={inputClass(fieldErrors.phone)}
                />
                {fieldErrors.phone && (
                  <p className="text-[0.72rem] text-red-600 mt-1">{fieldErrors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* 2. Delivery Address Card */}
          <div className="bg-white rounded-[16px] border border-[#EFE8F2] p-3.5 sm:p-4 shadow-2xs">
            <h3 className="font-tajawal font-extrabold text-[0.92rem] text-[#1C1220] mb-3 flex items-center gap-2 pb-2.5 border-b border-[#EFE8F2]">
              <div className="w-5 h-5 bg-[#F6EDF9] text-[#6B2178] border border-[#EBDCF1] rounded-full flex items-center justify-center text-[0.7rem] font-bold shadow-2xs shrink-0">2</div>
              <MapPin className="w-3.5 h-3.5 text-[#6B2178] shrink-0" />
              <span>{t('deliveryAddress')}</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[0.78rem] text-[#4A3D50] font-semibold mb-1">{t('address')} *</label>
                <input
                  type="text"
                  placeholder={t('addressPlaceholder')}
                  value={form.address}
                  onChange={update('address')}
                  aria-invalid={!!fieldErrors.address}
                  className={inputClass(fieldErrors.address)}
                />
                {fieldErrors.address && (
                  <p className="text-[0.72rem] text-red-600 mt-1">{fieldErrors.address}</p>
                )}
              </div>
              <div>
                <label className="block text-[0.78rem] text-[#4A3D50] font-semibold mb-1">{t('city')} *</label>
                <input
                  type="text"
                  placeholder={t('cityPlaceholder')}
                  value={form.city}
                  onChange={update('city')}
                  aria-invalid={!!fieldErrors.city}
                  className={inputClass(fieldErrors.city)}
                />
                {fieldErrors.city && (
                  <p className="text-[0.72rem] text-red-600 mt-1">{fieldErrors.city}</p>
                )}
              </div>
              <div>
                <label className="block text-[0.78rem] text-[#4A3D50] font-semibold mb-1">{t('orderNotes')}</label>
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
          <div className="bg-white rounded-[16px] border border-[#EFE8F2] p-3.5 sm:p-4 shadow-2xs">
            <h3 className="font-tajawal font-extrabold text-[0.92rem] text-[#1C1220] mb-3 flex items-center gap-2 pb-2.5 border-b border-[#EFE8F2]">
              <div className="w-5 h-5 bg-[#F6EDF9] text-[#6B2178] border border-[#EBDCF1] rounded-full flex items-center justify-center text-[0.7rem] font-bold shadow-2xs shrink-0">3</div>
              <CreditCard className="w-3.5 h-3.5 text-[#6B2178] shrink-0" />
              <span>{t('paymentMethod')}</span>
            </h3>
            <div className="space-y-2.5">
              <label className="flex items-center gap-3 p-3 bg-[#F6EDF9] border-2 border-[#8F3AA1] rounded-[13px] cursor-pointer transition-all shadow-xs">
                <input
                  type="radio"
                  name="paymentDrawer"
                  value="CASH_ON_DELIVERY"
                  checked={form.paymentMethod === 'CASH_ON_DELIVERY'}
                  onChange={update('paymentMethod')}
                  className="accent-[#6B2178] w-4 h-4"
                />
                <div>
                  <div className="font-bold text-[#1C1220] text-[0.85rem]">
                    {t('cashOnDelivery')}
                  </div>
                  <div className="text-[0.72rem] text-[#7A6D80]">{t('cashOnDeliveryDesc')}</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-[#F5F1F7] border border-[#EFE8F2] rounded-[13px] cursor-not-allowed opacity-60">
                <input type="radio" name="paymentDrawer" disabled className="w-4 h-4" />
                <div>
                  <div className="font-bold text-[#1C1220] text-[0.85rem]">{t('creditCardSoon')}</div>
                  <div className="text-[0.72rem] text-[#7A6D80]">{t('securePayment')}</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#EFE8F2] px-5 py-3.5 space-y-2.5 bg-[#FCFAFD] shrink-0">
          <div className="flex justify-between items-center text-[0.82rem]">
            <span className="text-[#7A6D80] font-medium">{t('subtotal')}</span>
            <span className="font-bold text-[#1C1220] font-tajawal">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-[0.82rem]">
            <span className="text-[#7A6D80] font-medium">{t('shipping')}</span>
            <span className={`font-bold ${shipping === 0 ? 'text-[#0F6E51]' : 'text-[#1C1220] font-tajawal'}`}>
              {shipping === 0 ? t('free') : formatPrice(shipping)}
            </span>
          </div>
          {shipping === 0 && subtotal > 0 && (
            <p className="text-[0.72rem] text-[#0F6E51] bg-[#E8F7F1] border border-[#0F6E51]/15 px-2.5 py-1.5 rounded-lg font-semibold">
              {items.some((i) => i.shippingMode === 'free' || i.shippingMode === 'FREE')
                ? t('freeShippingProductQualified')
                : t('freeShippingQualified')}
            </p>
          )}
          {shipping > 0 && shippingConfig?.freeEnabled && (
            <p className="text-[0.72rem] text-[#7A6D80] bg-white border border-[#EFE8F2] px-2.5 py-1.5 rounded-lg">
              توصيل مجاني للطلبات فوق {shippingConfig?.freeThreshold} د.م
            </p>
          )}
          <div className="border-t border-[#EFE8F2] pt-2 flex justify-between items-baseline">
            <span className="font-bold text-[0.92rem] text-[#1C1220]">{t('total')}</span>
            <span className="font-extrabold text-[#6B2178] text-lg font-tajawal">{formatPrice(total)}</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-[#8F3AA1] to-[#6B2178] hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[0.92rem] font-bold rounded-[14px] text-center transition-all shadow-md shadow-[#6B2178]/25 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('processingOrder')}</span>
              </>
            ) : (
              <>
                <span>{t('confirmOrder')}</span>
                <SubmitArrowIcon className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-[0.68rem] text-[#7A6D80] text-center">
            {t('agreeTerms')}
          </p>
        </div>
      </form>
    </>
  )
}

export default function CartDrawer() {
  const {
    items,
    count,
    subtotal,
    shipping,
    total,
    shippingConfig,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
  } = useCart()
  const { t, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [view, setView] = useState('cart')

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (!isCartOpen) {
      setView('cart')
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isCartOpen])

  if (!isCartOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-xs fade-in"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Cart Container: Centered floating panel on mobile, side drawer on desktop */}
      <div
        className={`fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none lg:p-0 lg:block lg:inset-y-0 ${
          isRTL ? 'lg:left-0 lg:right-auto' : 'lg:right-0 lg:left-auto'
        } lg:w-full lg:max-w-[420px]`}
      >
        <div
          className="pointer-events-auto w-full max-w-[420px] max-h-[calc(100dvh-32px)] rounded-[24px] bg-white shadow-2xl flex flex-col overflow-hidden fade-in lg:h-full lg:max-h-none lg:rounded-none lg:drawer-in"
          role="dialog"
          aria-label={view === 'checkout' ? t('checkout') : t('cart')}
        >
          {view === 'checkout' ? (
            <CartDrawerCheckout
              onBack={() => setView('cart')}
              onClose={() => setIsCartOpen(false)}
            />
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFE8F2] bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#6B2178]" />
                  <h2 className="text-lg font-tajawal font-extrabold text-[#1C1220]">{t('cart')}</h2>
                  {count > 0 && (
                    <span className="px-2.5 py-0.5 bg-[#F6EDF9] text-[#6B2178] text-[0.75rem] font-bold rounded-full">
                      {t('itemsCount', { count })}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 rounded-xl text-[#7A6D80] hover:text-[#1C1220] hover:bg-[#F5F1F7] transition-colors"
                  aria-label={t('close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8">
                    <div className="w-20 h-20 bg-[#F6EDF9] border border-[#EBDCF1] rounded-[20px] flex items-center justify-center mb-4 shadow-xs">
                      <ShoppingBag className="w-10 h-10 text-[#8F3AA1]" />
                    </div>
                    <p className="text-[#1C1220] font-bold text-base mb-1">{t('emptyCartTitle')}</p>
                    <p className="text-[#7A6D80] text-xs">{t('emptyCartSubtitle')}</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {items.map((item) => {
                      const itemKey = item.key || item.id
                      return (
                        <div
                          key={itemKey}
                          className="flex gap-3.5 p-3.5 bg-white rounded-[16px] border border-[#EFE8F2] shadow-2xs hover:border-[#EBDCF1] transition-all"
                        >
                          <div className="flex-shrink-0 w-16">
                            {item.isPackage ? (
                              item.image ? (
                                (() => {
                                  const pkgThumb = getThumbnailImageProps(item.image, item.imageVariantWidths)
                                  const retryPkg = createVariantFallbackHandler(pkgThumb.fallbackSrc)
                                  return (
                                    <img
                                      src={pkgThumb.src}
                                      srcSet={pkgThumb.srcSet}
                                      sizes={pkgThumb.sizes}
                                      alt={item.title}
                                      className="w-16 h-20 object-cover rounded-[12px] border border-[#EFE8F2]"
                                      loading={pkgThumb.loading}
                                      decoding={pkgThumb.decoding}
                                      onError={(e) => {
                                        if (e.currentTarget.dataset.variantFallbackApplied !== '1') {
                                          retryPkg(e)
                                        }
                                      }}
                                    />
                                  )
                                })()
                              ) : (
                                <div className="w-16 h-20 bg-[#F6EDF9] rounded-[12px] flex items-center justify-center border border-[#EBDCF1]">
                                  <PackageIcon className="w-6 h-6 text-[#6B2178]" />
                                </div>
                              )
                            ) : (
                              (() => {
                                const primaryImg = (() => {
                                  if (Array.isArray(item.images) && item.images.length > 0) {
                                    const obj = item.images.find((i) => i.isPrimary) || item.images[0]
                                    return typeof obj === 'string' ? obj : obj?.url
                                  }
                                  return item.image || null
                                })()

                                if (primaryImg) {
                                  const itemWidths = widthsForImageUrl(item.images, primaryImg)
                                  const thumbProps = getThumbnailImageProps(primaryImg, itemWidths)
                                  const retryWithOriginal = createVariantFallbackHandler(thumbProps.fallbackSrc)
                                  return (
                                    <img
                                      src={thumbProps.src}
                                      srcSet={thumbProps.srcSet}
                                      sizes={thumbProps.sizes}
                                      alt={item.title}
                                      className="w-16 h-20 object-cover rounded-[12px] border border-[#EFE8F2]"
                                      loading={thumbProps.loading}
                                      decoding={thumbProps.decoding}
                                      onError={(e) => {
                                        if (e.currentTarget.dataset.variantFallbackApplied !== '1') {
                                          retryWithOriginal(e)
                                          return
                                        }
                                        e.currentTarget.style.display = 'none'
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                      }}
                                    />
                                  )
                                }
                                return <BookCover book={item} size="sm" className="w-16" />
                              })()
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-0.5">
                              {item.isPackage && (
                                <span className="px-2 py-0.5 bg-[#F6EDF9] text-[#6B2178] text-[10px] font-bold rounded">
                                  {t('package') || 'باقة'}
                                </span>
                              )}
                            </div>
                            <h4 className="text-[0.88rem] font-bold text-[#1C1220] line-clamp-2 leading-snug">
                              {item.title}
                            </h4>
                            <p className="text-[0.75rem] text-[#7A6D80] mt-0.5">
                              {item.isPackage ? `${item.booksCount || item.books?.length || 0} ${t('books') || 'كتب'}` : item.author}
                            </p>

                            <div className="flex items-center justify-between mt-3">
                              {/* Quantity */}
                              <div className="flex items-center gap-1 bg-[#F5F1F7] border border-[#EFE8F2] rounded-[10px] px-1 py-0.5">
                                <button
                                  onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                                  className="p-1 hover:bg-white rounded-[7px] text-[#4A3D50] hover:text-[#1C1220] transition-colors cursor-pointer"
                                  aria-label="Decrease"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center text-[0.82rem] font-bold text-[#1C1220]">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                                  className="p-1 hover:bg-white rounded-[7px] text-[#4A3D50] hover:text-[#1C1220] transition-colors cursor-pointer"
                                  aria-label="Increase"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[#6B2178] font-bold text-[0.95rem] font-tajawal">
                                  {formatPrice(item.price * item.quantity)}
                                </span>
                                <button
                                  onClick={() => removeFromCart(itemKey)}
                                  className="p-1.5 text-[#7A6D80] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  aria-label={t('close')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="border-t border-[#EFE8F2] px-6 py-4 space-y-3 bg-[#FCFAFD] shrink-0">
                  <div className="flex justify-between items-center text-[0.85rem]">
                    <span className="text-[#7A6D80] font-medium">{t('subtotal')}</span>
                    <span className="font-bold text-[#1C1220] font-tajawal">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[0.85rem]">
                    <span className="text-[#7A6D80] font-medium">{t('shipping')}</span>
                    <span className={`font-bold ${shipping === 0 ? 'text-[#0F6E51]' : 'text-[#1C1220] font-tajawal'}`}>
                      {shipping === 0 ? t('free') : formatPrice(shipping)}
                    </span>
                  </div>
                  {shipping === 0 && subtotal > 0 && (
                    <p className="text-[0.75rem] text-[#0F6E51] bg-[#E8F7F1] border border-[#0F6E51]/15 px-2.5 py-1.5 rounded-lg font-semibold">
                      {items.some((i) => i.shippingMode === 'free' || i.shippingMode === 'FREE')
                        ? t('freeShippingProductQualified')
                        : t('freeShippingQualified')}
                    </p>
                  )}
                  {shipping > 0 && shippingConfig?.freeEnabled && (
                    <p className="text-[0.75rem] text-[#7A6D80] bg-white border border-[#EFE8F2] px-2.5 py-1.5 rounded-lg">
                      توصيل مجاني للطلبات فوق {shippingConfig?.freeThreshold} د.م
                    </p>
                  )}
                  <div className="border-t border-[#EFE8F2] pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-[#1C1220]">{t('total')}</span>
                    <span className="font-extrabold text-[#6B2178] text-xl font-tajawal">{formatPrice(total)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                        setIsCartOpen(false)
                        navigate('/checkout')
                      } else {
                        setView('checkout')
                      }
                    }}
                    className="block w-full py-3.5 bg-gradient-to-r from-[#8F3AA1] to-[#6B2178] hover:opacity-95 text-white text-[0.95rem] font-bold rounded-[14px] text-center transition-all shadow-md shadow-[#6B2178]/25 active:scale-[0.99] mt-2 cursor-pointer"
                  >
                    {t('proceedToCheckout')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
