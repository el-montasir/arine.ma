/**
 * Image variant metadata — the shared, single definition of how variant widths
 * travel between the upload pipeline, the database, the API, and the storefront.
 *
 * WHY THIS EXISTS
 * ===============
 * A browser that sees a `srcset` picks ONE candidate and requests only that one;
 * the others are never requested, so their existence is never tested. A srcset
 * may therefore advertise width W only if the object `...-Ww.webp` is known to
 * exist. This module carries that knowledge — the widths the generator actually
 * wrote — from upload to render, so the storefront never has to discover a
 * width by downloading the full-size original to measure it.
 *
 * The widths are recorded from the generator's own output, NOT recomputed from
 * the intrinsic width. That is deliberate: recording what was written is ground
 * truth, whereas re-deriving it would let the two sides drift apart the moment
 * either rule changed.
 *
 * EMPTY IS SAFE
 * =============
 * An empty array means "no variants known", and the storefront then serves the
 * original with no srcset. The original always exists, so that is always
 * correct — it is merely unoptimized. Legacy media that predates the variant
 * pipeline, and media whose generation failed, both land here.
 */

/**
 * Coerces an untrusted value into a sorted, de-duplicated list of widths.
 *
 * Defensive on purpose: this value can arrive from a Prisma row, a request body,
 * or a JSON blob in a StoreConfig row, and any of those may be null, undefined,
 * or the wrong type. Anything unrecognised degrades to an empty list, which is
 * the safe answer (serve the original, advertise nothing).
 *
 * @param {any} value
 * @returns {number[]} Widths ascending. Empty when nothing valid is present.
 */
export function normalizeVariantWidths(value) {
  if (!Array.isArray(value)) return []
  const widths = new Set()
  for (const width of value) {
    // `Number.isInteger` rather than `Number.isFinite` so a fractional or
    // exponential value can never become part of a URL.
    if (Number.isInteger(width) && width > 0) widths.add(width)
  }
  return [...widths].sort((a, b) => a - b)
}

/**
 * Normalizes an image entry from a request body into the shape written to the
 * database.
 *
 * Accepts a bare URL string (the legacy and simplest form, which carries no
 * metadata) or an object. An object without widths yields an empty array, so a
 * client that omits the field is not treated as a validation failure — it just
 * means "no variants known for this image".
 *
 * @param {any} item - A URL string or an object with at least a `url`.
 * @param {number} idx - Position, used as the default sort order and to make
 *   the first image primary.
 * @returns {{url: string, variantWidths: number[], sortOrder: number, isPrimary: boolean}|null}
 */
export function normalizeImageInput(item, idx) {
  if (typeof item === 'string') {
    const url = item.trim()
    return url ? { url, variantWidths: [], sortOrder: idx, isPrimary: idx === 0 } : null
  }

  if (!item || typeof item !== 'object' || typeof item.url !== 'string') return null
  const url = item.url.trim()
  if (!url) return null

  return {
    url,
    variantWidths: normalizeVariantWidths(item.variantWidths),
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : idx,
    isPrimary: Boolean(item.isPrimary ?? idx === 0),
  }
}

/**
 * Normalizes a whole image list, dropping entries without a usable URL.
 *
 * @param {any} rawImages
 * @returns {Array<{url: string, variantWidths: number[], sortOrder: number, isPrimary: boolean}>}
 */
export function normalizeImageInputs(rawImages) {
  if (!Array.isArray(rawImages)) return []
  return rawImages
    .map((item, idx) => normalizeImageInput(item, idx))
    .filter(Boolean)
}

/**
 * Picks the primary image URL from a normalized list, honouring an explicit
 * `isPrimary` flag before falling back to the first entry.
 *
 * @param {Array<{url: string, isPrimary: boolean}>} images
 * @param {string|null} [fallback] - Used when the list is empty.
 * @returns {string|null}
 */
export function pickPrimaryImageUrl(images, fallback = null) {
  const list = Array.isArray(images) ? images : []
  const primary = list.find((img) => img && img.isPrimary) || list[0]
  return primary?.url || fallback || null
}

/**
 * Finds the generated widths for a specific image URL within a list.
 *
 * The storefront keys its variant registry by URL, and the API exposes the
 * primary image as a BARE URL STRING (`image`) alongside the image objects
 * (`images[]`). Components call `getImageVariants(product.image)`, so the
 * widths for that bare string have to be findable from the same list.
 *
 * @param {Array<{url: string, variantWidths?: number[]}>} images
 * @param {string|null} url
 * @returns {number[]} Widths for `url`, or an empty list when not found.
 */
export function widthsForImageUrl(images, url) {
  if (!url || !Array.isArray(images)) return []
  const match = images.find((img) => img && img.url === url)
  return normalizeVariantWidths(match?.variantWidths)
}

export default {
  normalizeVariantWidths,
  normalizeImageInput,
  normalizeImageInputs,
  pickPrimaryImageUrl,
  widthsForImageUrl,
}
