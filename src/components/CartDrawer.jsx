import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Minus, Plus, Trash2, ShoppingBag, Package as PackageIcon } from 'lucide-react'
import BookCover from './BookCover'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { formatPrice } from '../utils/format'
import { getImageUrl } from '../utils/images'

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

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (!isCartOpen) return
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

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 ${isRTL ? 'left-0' : 'right-0'} z-[90] w-full max-w-[420px] bg-white shadow-2xl flex flex-col drawer-in`}
        role="dialog"
        aria-label={t('cart')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFE8F2] bg-white">
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
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
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
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.title}
                            className="w-16 h-20 object-cover rounded-[12px] border border-[#EFE8F2]"
                          />
                        ) : (
                          <div className="w-16 h-20 bg-[#F6EDF9] rounded-[12px] flex items-center justify-center border border-[#EBDCF1]">
                            <PackageIcon className="w-6 h-6 text-[#6B2178]" />
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
                                className="w-16 h-20 object-cover rounded-[12px] border border-[#EFE8F2]"
                                onError={(e) => {
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
                            className="p-1 hover:bg-white rounded-[7px] text-[#4A3D50] hover:text-[#1C1220] transition-colors"
                            aria-label="Decrease"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-[0.82rem] font-bold text-[#1C1220]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                            className="p-1 hover:bg-white rounded-[7px] text-[#4A3D50] hover:text-[#1C1220] transition-colors"
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
                            className="p-1.5 text-[#7A6D80] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
          <div className="border-t border-[#EFE8F2] px-6 py-4 space-y-3 bg-[#FCFAFD]">
            <div className="flex justify-between items-center text-[0.85rem]">
              <span className="text-[#7A6D80] font-medium">{t('subtotal')}</span>
              <span className="font-bold text-[#1C1220]">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-[0.85rem]">
              <span className="text-[#7A6D80] font-medium">{t('shipping')}</span>
              <span className={`font-bold ${shipping === 0 ? 'text-[#0F6E51]' : 'text-[#1C1220]'}`}>
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
                {t('freeShippingThresholdHint', { amount: Math.max(0, shippingConfig.freeThreshold - subtotal) })}
              </p>
            )}
            <div className="border-t border-[#EFE8F2] pt-3 flex justify-between items-baseline">
              <span className="font-bold text-[#1C1220]">{t('total')}</span>
              <span className="font-extrabold text-[#6B2178] text-xl font-tajawal">{formatPrice(total)}</span>
            </div>

            <Link
              to="/checkout"
              onClick={() => setIsCartOpen(false)}
              className="block w-full py-3.5 bg-gradient-to-r from-[#8F3AA1] to-[#6B2178] hover:opacity-95 text-white text-[0.95rem] font-bold rounded-[14px] text-center transition-all shadow-md shadow-[#6B2178]/25 active:scale-[0.99] mt-2"
            >
              {t('proceedToCheckout')}
            </Link>
          </div>
        )}
      </div>
    </>
  )
}