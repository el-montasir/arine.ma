/**
 * Compact homepage promotional banner.
 *
 * This renders an EXISTING `Banner` row of type `promotional`, fetched by
 * `useBanners('promotional')`. It is the same data, the same admin controls, the
 * same upload pipeline and the same enable/disable semantics as before — only
 * the homepage presentation changed, to occupy the space the old large hero
 * used to hold. There is deliberately no second promo mechanism.
 *
 * DESIGN NOTES
 * ============
 * - Layout follows the existing site idiom: the purple gradient card, the
 *   128x80 image block, the eyebrow pill and the white CTA button, all of which
 *   this component already used inline.
 * - `width`/`height` are set on the <img> alongside the fixed `h-20 w-32` box so
 *   the slot is reserved before the image arrives. This is a banner near the top
 *   of the page, so avoidable layout shift matters.
 * - Optional content is only rendered when configured. There is no empty badge,
 *   no empty subtitle gap and no empty CTA.
 */
import { useState, useEffect } from 'react'
import { Megaphone, ArrowLeft, ArrowRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getCompactBannerImageProps, createVariantFallbackHandler } from '../utils/image-variants'

/**
 * Schemes that must never reach an href, a router path or a `window.open` call.
 * A banner `link` is admin-supplied free text, so it is untrusted input.
 */
const UNSAFE_SCHEME = /^\s*(javascript|data|vbscript):/i

/**
 * Resolves a banner `link` into something safe to act on, or null.
 *
 * A link is only ever used in one of two ways: SPA navigation for an internal
 * route, or a new tab for an absolute http(s) URL. Everything else is dropped,
 * so a malformed or hostile value renders no CTA at all rather than a broken
 * one.
 *
 * INTERNAL PATHS
 * --------------
 * Must be rooted (`/shop`, `/book/18`). That single rule is what rejects
 * protocol-relative URLs: `//evil.example` also starts with `/`, so it is
 * excluded explicitly before the rooted-path check. Without that, a
 * protocol-relative link would be handed to the router as if it were a route.
 *
 * @param {unknown} rawLink
 * @returns {{href: string, external: boolean}|null}
 */
export function resolveBannerLink(rawLink) {
  if (typeof rawLink !== 'string') return null
  const href = rawLink.trim()
  if (!href) return null
  if (UNSAFE_SCHEME.test(href)) return null
  if (/^https?:\/\//i.test(href)) return { href, external: true }
  if (href.startsWith('//')) return null
  const normalizedHref = href.startsWith('/') ? href : `/${href}`
  return { href: normalizedHref, external: false }
}

export default function PromoBanner({ banner, onNavigate }) {
  const { isRTL } = useLanguage()
  const [imageShape, setImageShape] = useState(null)

  useEffect(() => {
    setImageShape(null)
  }, [banner?.image])

  if (!banner) return null

  const target = resolveBannerLink(banner.link)
  const imageProps = getCompactBannerImageProps(banner.image, banner.imageVariantWidths)
  const title = typeof banner.title === 'string' ? banner.title.trim() : ''
  const description = typeof banner.description === 'string' ? banner.description.trim() : ''

  // A banner with neither an image nor a title has nothing to show. Rendering an
  // empty gradient card would reintroduce exactly the kind of blank decorative
  // block the promo region is meant to avoid.
  if (!imageProps.src && !title) return null

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  const handleCta = () => {
    if (!target) return
    if (target.external) {
      // `noopener` keeps the opened tab from reaching back through
      // `window.opener`. Internal destinations use the router so navigation
      // stays client-side and no full page reload happens.
      window.open(target.href, '_blank', 'noopener,noreferrer')
    } else if (typeof onNavigate === 'function') {
      onNavigate(target.href)
    } else {
      window.location.href = target.href
    }
  }

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    if (naturalHeight > naturalWidth) {
      setImageShape('portrait')
    } else {
      setImageShape('wide')
    }
  }

  const isPortrait = imageShape === 'portrait'
  const hasImage = Boolean(imageProps.src)

  return (
    <section
      onClick={target ? handleCta : undefined}
      onKeyDown={
        target
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleCta()
              }
            }
          : undefined
      }
      role={target ? 'button' : undefined}
      tabIndex={target ? 0 : undefined}
      className={`relative overflow-hidden rounded-[20px] bg-gradient-to-r from-[#4c1660] to-[#8b2f9e] border border-[#8b2f9e]/30 p-4 sm:p-5 text-white flex shadow-md ${
        isPortrait
          ? 'flex-row sm:flex-row items-center gap-3.5 sm:gap-4 justify-between'
          : 'flex-col sm:flex-row items-center gap-3.5 sm:gap-4 justify-between'
      } ${
        target ? 'cursor-pointer select-none transition-transform active:scale-[0.99]' : ''
      }`}
    >
      {hasImage && (
        <div
          className={
            isPortrait
              ? 'w-[36%] max-w-[130px] sm:w-32 sm:h-20 shrink-0 flex items-center justify-center self-stretch sm:self-auto'
              : 'w-full sm:w-32 sm:h-20 shrink-0'
          }
        >
          <img
            src={imageProps.src}
            srcSet={imageProps.srcSet}
            sizes={imageProps.sizes}
            // Decorative: the banner's title and description sit directly beside
            // this image, so naming it here would just repeat them to a screen
            // reader. `alt=""` is the accessible choice, not a missing one.
            alt=""
            width={128}
            height={80}
            className={
              isPortrait
                ? 'w-full h-full max-h-[175px] sm:max-h-none sm:h-20 sm:w-32 object-contain sm:object-cover rounded-xl border border-white/20 bg-black/10 sm:bg-transparent'
                : 'w-full h-36 sm:h-20 sm:w-32 object-cover rounded-xl shrink-0 border border-white/20'
            }
            loading={imageProps.loading}
            decoding={imageProps.decoding}
            onLoad={handleImageLoad}
            onError={createVariantFallbackHandler(imageProps.fallbackSrc)}
          />
        </div>
      )}

      {/* Portrait Mobile Layout: content with inline CTA */}
      {isPortrait ? (
        <>
          <div className="flex-1 min-w-0 text-right flex flex-col justify-between py-0.5 self-stretch sm:self-auto">
            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-full mb-1.5">
                <Megaphone className="h-3 w-3" />
                عرض خاص
              </div>
              {title && (
                <h2 className="font-tajawal font-bold text-sm sm:text-base text-white leading-snug line-clamp-2">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-white/85 mt-1 line-clamp-2 leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            {target && (
              <div className="mt-2.5 sm:hidden">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCta()
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-[#4c1660] hover:bg-[#FAF9F7] text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  <span>استفد من العرض</span>
                  <ArrowIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {target && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleCta()
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#4c1660] hover:bg-[#FAF9F7] text-xs font-bold rounded-xl transition-all shrink-0 shadow-sm cursor-pointer"
            >
              <span>استفد من العرض</span>
              <ArrowIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      ) : (
        /* Wide / Square / Initial / No-image Layout */
        <>
          <div
            className={`flex-1 min-w-0 ${
              hasImage ? 'w-full text-center sm:text-right' : 'w-full text-right'
            }`}
          >
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-full mb-1.5">
              <Megaphone className="h-3 w-3" />
              عرض خاص
            </div>
            {title && (
              <h2 className="font-tajawal font-bold text-base text-white">{title}</h2>
            )}
            {description && (
              <p className="text-xs text-white/85 mt-1 line-clamp-2 leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {target && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleCta()
              }}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-[#4c1660] hover:bg-[#FAF9F7] text-xs font-bold rounded-xl transition-all shrink-0 shadow-sm cursor-pointer ${
                hasImage ? 'w-full sm:w-auto mt-1 sm:mt-0' : 'w-full sm:w-auto'
              }`}
            >
              <span>استفد من العرض</span>
              <ArrowIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}
    </section>
  )
}
