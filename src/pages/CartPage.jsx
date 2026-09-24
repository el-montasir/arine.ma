import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ArrowRight, Package as PackageIcon } from 'lucide-react'
import BookCover from '../components/BookCover'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice } from '../utils/format'
import { getImageUrl } from '../utils/images'

export default function CartPage() {
  const { items, subtotal, shipping, total, shippingConfig, updateQuantity, removeFromCart } = useCart()
  const { t, isRTL } = useLanguage()

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  if (items.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-16 text-center">
        <div className="w-24 h-24 bg-[#F6EDF9] border border-[#EBDCF1] rounded-[24px] flex items-center justify-center mx-auto mb-5 shadow-xs">
          <ShoppingBag className="w-12 h-12 text-[#8F3AA1]" />
        </div>
        <h2 className="text-2xl font-tajawal font-extrabold text-[#1C1220] mb-2">{t('emptyCartTitle')}</h2>
        <p className="text-[#7A6D80] mb-6 text-sm sm:text-base">{t('emptyCartSubtitle')}</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#8F3AA1] to-[#6B2178] hover:opacity-95 text-white font-bold rounded-[14px] shadow-md shadow-[#6B2178]/20 transition-all"
          >
            <span>{t('exploreBooks')}</span>
            <ArrowIcon className="w-4 h-4" />
          </Link>
          <Link
            to="/packages"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white border border-[#EBDCF1] text-[#6B2178] hover:bg-[#F6EDF9] font-bold rounded-[14px] transition-all"
          >
            <span>{t('packages') || 'الباقات'}</span>
            <ArrowIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-tajawal font-extrabold text-[#1C1220] mb-8">{t('cart')}</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Items */}
        <div className="flex-1">
          <div className="space-y-4">
            {items.map((item) => {
              const itemKey = item.key || item.id
              return (
                <div
                  key={itemKey}
                  className="flex gap-4 p-4 sm:p-5 bg-white border border-[#EFE8F2] rounded-[20px] shadow-[0_1px_2px_rgba(62,17,71,.03),0_6px_18px_-10px_rgba(62,17,71,.08)] hover:border-[#EBDCF1] transition-all"
                >
                  <div className="flex-shrink-0 w-20">
                    {item.isPackage ? (
                      item.image ? (
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.title}
                          className="w-20 h-24 object-cover rounded-[14px] border border-[#EFE8F2]"
                        />
                      ) : (
                        <div className="w-20 h-24 bg-[#F6EDF9] rounded-[14px] flex items-center justify-center border border-[#EBDCF1]">
                          <PackageIcon className="w-8 h-8 text-[#6B2178]" />
                        </div>
                      )
                    ) : (
                      (() => {
                        const primaryImg = (() => {
                          if (Array.isArray(item.images) && item.images.length > 0) {
                            const obj = item.images.find(i => i.isPrimary) || item.images[0]
                            return typeof obj === 'string' ? obj : obj?.url
                          }
                          return item.image || null
                        })()

                        if (primaryImg) {
                          return (
                            <img
                              src={getImageUrl(primaryImg)}
                              alt={item.title}
                              className="w-20 h-24 object-cover rounded-[14px] border border-[#EFE8F2]"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          )
                        }
                        return <BookCover book={item} size="sm" className="w-20" />
                      })()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {item.isPackage && (
                          <span className="px-2.5 py-0.5 bg-[#F6EDF9] text-[#6B2178] text-[11px] font-bold rounded-md mb-1.5 inline-block">
                            {t('package') || 'باقة'}
                          </span>
                        )}
                        <Link
                          to={item.isPackage ? `/package/${item.packageId || item.id}` : `/book/${item.id}`}
                          className="font-bold text-[#1C1220] hover:text-[#6B2178] transition-colors block leading-snug"
                        >
                          {item.title}
                        </Link>
                        <p className="text-[0.82rem] text-[#7A6D80] mt-0.5">
                          {item.isPackage ? `${item.booksCount || item.books?.length || 0} ${t('books') || 'كتب'}` : item.author}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(itemKey)}
                        className="p-2 text-[#7A6D80] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        aria-label={t('close')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-1.5 bg-[#F5F1F7] border border-[#EFE8F2] rounded-[13px] px-1 py-0.5">
                        <button
                          onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                          className="p-1.5 hover:bg-white hover:shadow-xs rounded-[10px] text-[#4A3D50] hover:text-[#1C1220] transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-bold text-sm text-[#1C1220]">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                          className="p-1.5 hover:bg-white hover:shadow-xs rounded-[10px] text-[#4A3D50] hover:text-[#1C1220] transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="font-tajawal font-extrabold text-[#6B2178] text-lg sm:text-xl">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:w-[350px]">
          <div className="bg-white border border-[#EFE8F2] rounded-[24px] p-6 lg:p-7 shadow-[0_1px_2px_rgba(62,17,71,.04),0_12px_32px_-12px_rgba(62,17,71,.12)] sticky top-28">
            <h3 className="font-tajawal font-extrabold text-lg text-[#1C1220] mb-5 pb-3 border-b border-[#EFE8F2]">{t('orderSummary')}</h3>
            <div className="space-y-3.5 text-[0.88rem]">
              <div className="flex justify-between items-center">
                <span className="text-[#7A6D80] font-medium">{t('subtotal')}</span>
                <span className="font-bold text-[#1C1220]">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#7A6D80] font-medium">{t('shipping')}</span>
                <span className={`font-bold ${shipping === 0 ? 'text-[#0F6E51]' : 'text-[#1C1220]'}`}>
                  {shipping === 0 ? t('free') : formatPrice(shipping)}
                </span>
              </div>
              {shipping === 0 && subtotal > 0 && (
                <p className="text-[0.78rem] text-[#0F6E51] bg-[#E8F7F1] border border-[#0F6E51]/15 px-3 py-2 rounded-xl font-semibold">
                  {items.some((i) => i.shippingMode === 'free' || i.shippingMode === 'FREE')
                    ? t('freeShippingProductQualified')
                    : t('freeShippingQualified')}
                </p>
              )}
              {shipping > 0 && shippingConfig?.freeEnabled && (
                <p className="text-[0.78rem] text-[#7A6D80] bg-[#F5F1F7] border border-[#EFE8F2] px-3 py-2 rounded-xl">
                  {t('freeShippingThresholdHint', { amount: Math.max(0, shippingConfig.freeThreshold - subtotal) })}
                </p>
              )}
              <div className="border-t border-[#EFE8F2] pt-4 flex justify-between items-baseline">
                <span className="font-bold text-base text-[#1C1220]">{t('total')}</span>
                <span className="font-tajawal font-extrabold text-2xl text-[#6B2178]">{formatPrice(total)}</span>
              </div>
            </div>

            <Link
              to="/checkout"
              className="block w-full py-4 bg-gradient-to-r from-[#8F3AA1] to-[#6B2178] hover:opacity-95 text-white text-base font-bold rounded-[16px] text-center transition-all shadow-lg shadow-[#6B2178]/25 active:scale-[0.99] mt-6"
            >
              {t('proceedToCheckout')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
