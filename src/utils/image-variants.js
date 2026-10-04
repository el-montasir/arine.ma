/**
 * Responsive image variant helper for the Storefront.
 *
 * Given a media path (relative `/uploads/...` or absolute URL), returns the
 * original URL plus a WebP srcset derived from pre-generated variants.
 *
 * VARIANT URL CONVENTION:
 *   Original:  /uploads/products/1234-abc.jpg
 *   Variant:   /uploads/products/1234-abc-200w.webp
 *
 * THE EXISTENCE INVARIANT (read this before changing anything here)
 * ==============================================================
 * A browser that sees a `srcset` picks ONE candidate and requests only that
 * one. The other candidates are never requested, so their existence is never
 * tested. Therefore a `srcset` may advertise width W only if the object
 * `...-Ww.webp` is guaranteed to exist — otherwise a legitimate request can
 * 404 on a routine device.
 *
 * This module is the single place that decides which widths to advertise, and
 * its input is the set of widths the SERVER RECORDED AS GENERATED — read from
 * the payload via the registry in `src/lib/image-metadata.js`. It does not
 * re-derive them from the intrinsic width, because that would be a second
 * implementation of the server's rule that could drift from it. What the
 * generator wrote is ground truth.
 *
 * `availableVariantWidths` is retained, exported, and still used by the
 * server-mirroring contract test, but it is no longer on the render path.
 *
 * When the widths are UNKNOWN — legacy media predating the pipeline, media the
 * backfill has not reached, a generation that failed, or a URL outside
 * `/uploads/` — we do NOT guess. We emit an empty srcset and let the browser
 * load `src` (the original), which always exists. That is the only answer that
 * is correct for both a 200px source (where 800w/1200w would 404) and a 4000px
 * source (where a smaller ladder would waste bytes). `createVariantFallbackHandler`
 * remains as a safety net, but under this invariant it should never fire.
 *
 * FALLBACK BEHAVIOR:
 *   - If the path is not a `/uploads/` media path (e.g. external URL, blob,
 *     data URI), returns the original as-is with an empty srcset. The browser
 *     then loads exactly what was requested, with no broken variant URLs.
 *   - If a variant is missing at runtime, the browser does NOT retry `src`;
 *     `createVariantFallbackHandler` performs that recovery.
 *   - The `src` always points to the original, guaranteeing legacy URLs and
 *     existing oversized media remain functional.
 *
 * VARIANT WIDTHS (200w, 400w, 800w, 1200w):
 *   - 200w:  card thumbnails (cart, checkout, admin list, search)
 *   - 400w:  product/package cards at 2x DPR
 *   - 800w:  product/package cards at 4x DPR, detail zoom
 *   - 1200w: detail-page hero images
 *
 * @param {string} path - Media path or URL
 * @param {number[]} [explicitWidths] - Widths already held by the caller (a cart
 *   item restored from localStorage, an order row). Wins over the registry.
 * @returns {{src: string, srcset: string, sizes: string, fallback: string, variants: Array<{width: number, url: string}>, widths: number[]}}
 */
import { getImageUrl } from './images'
import { getVariantWidths, isVariantRegistryEmpty } from '../lib/image-metadata'

/**
 * The variant ladder, ordered ascending. Must match IMAGE_VARIANT_SIZES +
 * IMAGE_DETAIL_SIZE in server/src/lib/image-processing.js.
 */
export const VARIANT_WIDTHS = [200, 400, 800, 1200]

/**
 * Whether responsive variant srcsets may be advertised to browsers.
 *
 * Kept OFF until the backfill has recorded widths for existing media. The gate
 * is now safer than it was: it no longer means "did the preloader measure this
 * image yet" but "does the server vouch for these widths". Turning it on before
 * the backfill has run is harmless for media the server knows about, and media
 * it does not know about degrades to the original with no srcset.
 */
export function areVariantsEnabled() {
  const flag = import.meta.env.VITE_IMAGE_VARIANTS
  return flag === true || flag === 'true' || flag === '1'
}

/**
 * Computes which variant widths the generator produces for a given intrinsic
 * width. Mirrors the server's `width >= metadata.width` skip rule: a width is
 * included if and only if it is strictly narrower than the source.
 *
 * NOT ON THE RENDER PATH. The storefront advertises the widths the server
 * recorded, not this re-derivation — see the file header. This is retained and
 * exported so the contract test can assert the two agree on the ladder, and so
 * the invariant has one documented statement on the client side.
 *
 * @param {number|null|undefined} intrinsicWidth - Source width in px, or null
 *   when unknown.
 * @returns {number[]} Guaranteed widths, ascending. Empty when unknown.
 */
export function availableVariantWidths(intrinsicWidth) {
  if (!Number.isFinite(intrinsicWidth) || intrinsicWidth <= 0) return []
  return VARIANT_WIDTHS.filter((width) => width < intrinsicWidth)
}

/**
 * Builds a variant URL for a base path, preserving any query string and hash.
 *
 * EDGE CASE THIS HANDLES: media URLs may carry cache-busting query params or
 * a hash fragment, e.g. `.../a.jpg?v=3#hero`. Suffixing the raw string would
 * produce `.../a.jpg?v=3#hero-400w.webp`, which is a *different URL* whose
 * request never reaches the file. So the suffix is applied to the PATH only,
 * and the query/hash are re-attached after it.
 *
 * @param {string} basePath - URL whose path has no file extension.
 * @param {number} width
 * @returns {string}
 */
function buildVariantUrl(basePath, width) {
  let url
  try {
    url = new URL(basePath)
  } catch {
    return ''
  }
  if (!url.pathname) return ''

  url.pathname = `${url.pathname}-${width}w.webp`
  // url.toString() re-appends `search` and `hash`, so they survive intact.
  return url.toString()
}

export function getImageVariants(path, explicitWidths) {
  const original = getImageUrl(path)
  const inert = { src: original, srcset: '', sizes: '', fallback: original, variants: [], widths: [] }

  if (!original) {
    return { src: '', srcset: '', sizes: '', fallback: '', variants: [], widths: [] }
  }

  // Only generate variants for our own /uploads/ media paths.
  // External URLs (placehold.co, etc.), blob: and data: URIs are returned as-is.
  if (!original.includes('/uploads/')) {
    return inert
  }

  // ROLLOUT GATE. Default-off; see areVariantsEnabled().
  if (!areVariantsEnabled()) {
    return inert
  }

  // EXISTENCE INVARIANT (see file header). The widths are what the server
  // recorded as generated — not a re-derivation from the intrinsic width, which
  // the client cannot know without downloading the original. An explicit list
  // from the caller (a cart item from localStorage, an order row) wins, because
  // that list came from the same server record.
  const widths = Array.isArray(explicitWidths) ? explicitWidths : getVariantWidths(original)

  if (widths.length === 0) {
    if (isVariantRegistryEmpty()) {
      // Dev aid only. An empty registry before first render means the data hooks
      // have not registered a payload yet; it cannot persist once they have.
      console.warn(
        '[image-variants] variant registry is empty — no media has registered ' +
          'widths, so no srcset will be advertised. Ensure the data hooks call ' +
          'registerImageVariantsFromPayload().'
      )
    }
    return inert
  }

  // Extract the base path by stripping the file extension.
  // e.g. https://api.arine.ma/uploads/products/1234-abc.jpg
  //   -> https://api.arine.ma/uploads/products/1234-abc
  let basePath = original
  try {
    const url = new URL(original)
    const pathname = url.pathname
    const extIndex = pathname.lastIndexOf('.')
    if (extIndex > 0) {
      url.pathname = pathname.slice(0, extIndex)
      basePath = url.toString()
    } else {
      // No extension in the path: the variant naming convention cannot apply.
      return inert
    }
  } catch {
    return inert
  }

  const variants = widths
    .map((w) => ({ width: w, url: buildVariantUrl(basePath, w) }))
    .filter((v) => v.url && v.width > 0)

  if (variants.length === 0) {
    return inert
  }

  const srcset = variants.map((v) => `${v.url} ${v.width}w`).join(', ')

  return {
    src: original,
    srcset,
    sizes: '',
    fallback: original,
    variants,
    widths,
  }
}

/**
 * Builds a self-healing `onError` handler for an <img> using a variant srcset.
 *
 * WHY THIS IS NEEDED:
 * A browser selects ONE srcset candidate before requesting it, and the choice
 * is final — `src` is not consulted if that candidate fails. There is no
 * automatic srcset fallback: the spec's selection algorithm has no error
 * recovery step. So if a candidate 404s (legacy media, or a variant the
 * backfill has not reached yet), the image renders broken unless something
 * retries. That something is this handler: it drops `srcset`/`sizes` and
 * re-points `src` at the always-valid original, which then loads normally.
 * It is one-shot — a flag on the element prevents an infinite retry loop if
 * even the original is missing, in which case the caller's own fallback takes
 * over.
 *
 * Under the existence invariant this should never fire; it is retained as a
 * defence-in-depth net for media that becomes stale between deployments.
 *
 * @param {string} [fallbackSrc] - Original URL to fall back to. Defaults to the
 *   element's current `src`, which is always the original.
 * @returns {(e: {currentTarget: {removeAttribute: Function, setAttribute: Function, dataset: object, src: string}})=>void}
 */
export function createVariantFallbackHandler(fallbackSrc) {
  return (e) => {
    const el = e.currentTarget
    if (el.dataset.variantFallbackApplied === '1') return
    el.dataset.variantFallbackApplied = '1'
    el.removeAttribute('srcset')
    el.removeAttribute('sizes')
    const original = fallbackSrc || el.getAttribute('src') || ''
    if (original) el.setAttribute('src', original)
  }
}

/**
 * Returns srcset + sizes configured for card thumbnails (226x301 display).
 * Suitable for: product cards, package cards, search results, favorites.
 *
 * @param {string} path - Media path or URL
 * @param {number[]} [explicitWidths] - Explicit variant widths if already known
 * @param {boolean|{priority?: boolean, isPriority?: boolean}} [options] - Loading priority options
 */
export function getCardImageProps(path, explicitWidths, options = {}) {
  const isPriority =
    typeof options === 'boolean'
      ? options
      : Boolean(options?.priority || options?.isPriority)
  const data = getImageVariants(path, explicitWidths)
  return {
    src: data.src,
    srcSet: data.srcset,
    sizes: '(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 226px',
    loading: isPriority ? 'eager' : 'lazy',
    ...(isPriority ? { fetchPriority: 'high' } : {}),
    decoding: 'async',
    fallbackSrc: data.src,
  }
}

/**
 * Returns srcset + sizes configured for detail-page hero images.
 * Suitable for: product detail, package detail.
 */
export function getDetailImageProps(path, explicitWidths) {
  const data = getImageVariants(path, explicitWidths)
  return {
    src: data.src,
    srcSet: data.srcset,
    // MEASURED, not guessed. The detail hero is hard-capped at every breakpoint:
    //   BookDetails    -> `max-w-[340px]`, and `w-56` (224px) below `lg`
    //   PackageDetails -> `max-w-[380px]`
    // so the slot never exceeds 380 CSS px. The previous `100vw/80vw/1200px` sizes
    // over-declared the slot ~3x, which made browsers pick the 1200w variant on a
    // 2x device (1200px slot x 2 DPR) for an image actually painted at 380px —
    // paying ~3x the bytes for zero extra detail. With the real slot the ladder
    // resolves exactly as designed: 1x -> 400w, 2x -> 800w, 3x (380x3=1140) -> 1200w.
    sizes: '380px',
    loading: 'eager',
    decoding: 'async',
    fallbackSrc: data.src,
  }
}

/**
 * Returns srcset + sizes configured for small thumbnails (50-150px display).
 * Suitable for: cart drawer, checkout, admin list thumbnails.
 */
export function getThumbnailImageProps(path, explicitWidths) {
  const data = getImageVariants(path, explicitWidths)
  return {
    src: data.src,
    srcSet: data.srcset,
    sizes: '(max-width: 768px) 60px, 80px',
    loading: 'lazy',
    decoding: 'async',
    fallbackSrc: data.src,
  }
}

/**
 * Returns srcset + sizes for the compact homepage promo banner image.
 *
 * The slot is a fixed `h-20 w-32` (128x80 CSS px) at every breakpoint, so the
 * declared `sizes` is the constant `128px`. Sizing it up (`100vw`, or the
 * 80px the thumbnail helper uses) would over-declare the slot and make the
 * browser fetch a heavier variant than the box can show — or, at 100vw, pull a
 * 1200w candidate for an 80px-tall box.
 *
 * `loading="eager"`: the banner sits at the very top of the homepage, where a
 * lazy image is often still un-requested when the section is scrolled into view,
 * which costs a visible blank. Eager is also safe against double-download — the
 * browser still requests exactly ONE srcset candidate, and the widths advertised
 * are only the ones the server recorded as generated.
 */
export function getCompactBannerImageProps(path, explicitWidths) {
  const data = getImageVariants(path, explicitWidths)
  return {
    src: data.src,
    srcSet: data.srcset,
    sizes: '128px',
    loading: 'eager',
    decoding: 'async',
    fallbackSrc: data.src,
  }
}

export default {
  getImageVariants,
  getCardImageProps,
  getDetailImageProps,
  getThumbnailImageProps,
  getCompactBannerImageProps,
  createVariantFallbackHandler,
  areVariantsEnabled,
  availableVariantWidths,
  VARIANT_WIDTHS,
}
