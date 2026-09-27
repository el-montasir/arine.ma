/**
 * Variant metadata registry for the storefront.
 *
 * WHY THIS EXISTS
 * ===============
 * A browser that sees a `srcset` picks ONE candidate and requests only that
 * one; the others are never requested, so their existence is never tested. A
 * srcset may therefore advertise width W only if the object `...-Ww.webp` is
 * known to exist. `utils/image-variants.js` needs that knowledge, and it cannot
 * obtain it by measuring: decoding the original to read `naturalWidth` means
 * DOWNLOADING the full-size file, which is the exact cost the variant ladder
 * exists to avoid.
 *
 * So the server says which widths it wrote (it already knows — it just wrote
 * them), ships them in the payload, and the data hooks record them here as the
 * payload arrives. Rendering then reads a plain Map lookup.
 *
 * The alternative, the previous design, decoded every original off-screen to
 * measure it. That made each image download twice, and the redundant copy was
 * the larger one — for a payload of up to 2000 media paths, every image.
 *
 * WHY A MODULE-LEVEL MAP
 * ======================
 * The values are free: they arrive in JSON the page already downloaded. What
 * they key is a lookup from a bare URL string — components call
 * `getImageVariants(product.image)`, where `image` is a denormalized string, not
 * one of the `images[]` objects. Threading a prop from the hook that fetched the
 * payload down to every card would mean touching the whole tree; a singleton
 * keyed by that same URL string is the same answer with none of the plumbing.
 *
 * ORDERING
 * The hooks call `registerImageVariantsFromPayload` synchronously, before the
 * `setBooks`/`setProducts` that triggers the render. The first paint therefore
 * already has the correct srcset — strictly better than the preloader, which
 * was non-blocking and so frequently painted with no srcset at all before a
 * second render filled it in.
 *
 * MISSING ENTRIES ARE SAFE
 * ========================
 * No entry means "no variants known", and the answer is the original with an
 * empty srcset. The original always exists, so that is always correct — merely
 * unoptimized. Media predating the pipeline, media whose generation failed, and
 * non-`/uploads/` paths all land here.
 */

import { getImageUrl } from '../utils/images'

/**
 * Original media URL -> widths (px) whose WebP variants were generated.
 *
 * KEYED BY THE RESOLVED ABSOLUTE URL, which is what `getImageVariants` looks
 * up. This matters: the API returns RELATIVE paths (`/uploads/products/a.jpg`)
 * and `getImageUrl` expands them against `VITE_API_URL` before the lookup. A
 * registry keyed by the raw payload value would therefore never match, and
 * every srcset on the site would be empty. Both forms are indexed on write so
 * the lookup succeeds regardless of which one the caller holds.
 *
 * A Map rather than a plain object so a URL that happens to be `__proto__` or
 * `constructor` cannot collide with an inherited property.
 * @type {Map<string, number[]>}
 */
const registry = new Map()

/**
 * Upper bound on retained entries, so a long session that browses many products
 * cannot grow the map without limit. The oldest entries are evicted first; since
 * every render re-reads what it just registered, eviction is harmless — worst
 * case an image falls back to the original.
 */
const MAX_ENTRIES = 2000

/**
 * Coerces an untrusted value into a sorted, de-duplicated list of widths.
 *
 * Defensive: this arrives from JSON, and any value is possible there. Anything
 * unrecognised degrades to an empty list, which is the safe answer.
 *
 * @param {any} value
 * @returns {number[]} Widths ascending. Empty when nothing valid is present.
 */
export function normalizeWidths(value) {
  if (!Array.isArray(value)) return []
  const widths = new Set()
  for (const width of value) {
    // Number.isInteger, not Number.isFinite, so a fractional value can never
    // become part of a URL.
    if (Number.isInteger(width) && width > 0) widths.add(width)
  }
  return [...widths].sort((a, b) => a - b)
}

/**
 * Every key a URL may be looked up or stored under.
 *
 * The raw payload value (typically relative) and the resolved absolute URL
 * `getImageUrl` produces. Both are indexed so a write from the data hooks and
 * a read from a presentational component always meet. They are normally two
 * entries for one image, which MAX_ENTRIES is sized to absorb — it bounds
 * memory, not images, and eviction only costs a fallback to the original.
 *
 * @param {string} url
 * @returns {string[]} Unique keys, raw form first.
 */
function keysFor(url) {
  const keys = [url]
  try {
    const resolved = getImageUrl(url)
    if (resolved && resolved !== url) keys.push(resolved)
  } catch {
    // An unparseable path still has a usable raw key.
  }
  return keys
}

/**
 * Records the generated variant widths for one media URL.
 *
 * An empty list is recorded as an ABSENT key rather than an empty entry, so
 * "known to have no variants" and "never seen" are the same lookup — both inert,
 * both correct.
 *
 * @param {string} url - The ORIGINAL media path or URL, as it appears in the
 *   API payload (`/uploads/...`) or already resolved by `getImageUrl`.
 * @param {number[]} widths
 */
export function registerImageVariants(url, widths) {
  if (typeof url !== 'string' || !url) return
  const normalized = normalizeWidths(widths)
  if (normalized.length === 0) return

  for (const key of keysFor(url)) {
    if (registry.size >= MAX_ENTRIES && !registry.has(key)) {
      // Map iterates in insertion order, so the first key is the oldest.
      const oldest = registry.keys().next()
      if (!oldest.done) registry.delete(oldest.value)
    }
    registry.set(key, normalized)
  }
}

/**
 * Reads the generated variant widths for a media URL.
 *
 * @param {string} url
 * @returns {number[]} Widths ascending, or an empty list when unknown.
 */
export function getVariantWidths(url) {
  if (typeof url !== 'string' || !url) return []
  for (const key of keysFor(url)) {
    const hit = registry.get(key)
    if (hit) return hit
  }
  return []
}

/** @returns {boolean} whether any media has registered widths. */
export function isVariantRegistryEmpty() {
  return registry.size === 0
}

/**
 * Finds the generated widths for one URL within an `images[]` list.
 *
 * For a component that holds a whole product object rather than a registered
 * payload — a cart item restored from localStorage, a package's nested book —
 * this reads the widths straight off the list instead of the registry, because
 * the registry may have been populated by a different, unrelated request (or
 * evicted, see MAX_ENTRIES).
 *
 * @param {Array<{url: string, variantWidths?: number[]}>|undefined} images
 * @param {string|null|undefined} url
 * @returns {number[]} Widths for `url`, or an empty list.
 */
export function widthsForImageUrl(images, url) {
  if (!url || !Array.isArray(images)) return []
  const match = images.find((img) => img && img.url === url)
  return normalizeWidths(match?.variantWidths)
}

/** Test-only: empties the registry. */
export function clearVariantRegistry() {
  registry.clear()
}

/**
 * Records a single `{url, variantWidths}` pair.
 *
 * @param {any} image - An image object, or a bare URL string (which carries no
 *   metadata and is therefore skipped).
 * @param {string|null} [widthsKey] - Field holding the widths. Defaults to
 *   `variantWidths`; `imageVariantWidths` exists for the sibling field that
 *   describes the denormalized `image` string.
 */
function record(image, widthsKey = 'variantWidths') {
  if (typeof image === 'string') return // a bare URL carries no widths
  if (!image || typeof image !== 'object') return
  registerImageVariants(image.url, image[widthsKey])
}

/**
 * Walks a payload and records every image's variant widths.
 *
 * Handles the shapes the API actually returns, which are deliberately varied:
 *   - a list of products/packages/banners: `{ image, imageVariantWidths, images[] }`
 *   - a single product/package
 *   - an order: `items[].productImage{...,productImageVariantWidths}`
 *   - a store config: `{ store: { logo, logoVariantWidths } }`
 *
 * Unknown shapes are ignored rather than throwing: a payload we cannot read is
 * an inert payload, never a crash.
 *
 * @param {any} payload
 */
export function registerImageVariantsFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return

  if (Array.isArray(payload)) {
    for (const entry of payload) registerImageVariantsFromPayload(entry)
    return
  }

  // `image` is a BARE URL string, so its widths arrive in the sibling
  // `imageVariantWidths` field rather than on the object itself.
  record({ url: payload.image, variantWidths: payload.imageVariantWidths })

  if (Array.isArray(payload.images)) {
    for (const image of payload.images) record(image)
  }
  if (Array.isArray(payload.logo)) {
    // not expected, but a logo list is a legitimate image list
    for (const image of payload.logo) record(image)
  } else if (payload.logo && typeof payload.logo === 'object') {
    record({ url: payload.logo.url, variantWidths: payload.logo.variantWidths })
  }
  registerImageVariants(payload.logo, payload.logoVariantWidths)

  // Order rows snapshot the thumbnail under their own names rather than
  // `image`, so they need an explicit pairing — a bare recursive walk would
  // miss them and TrackOrder would fall back to the original.
  registerImageVariants(payload.productImage, payload.productImageVariantWidths)
  registerImageVariants(payload.packageImage, payload.packageImageVariantWidths)

  for (const key of ['items', 'packageItems', 'books', 'products', 'packages']) {
    const list = payload[key]
    if (Array.isArray(list)) {
      for (const entry of list) registerImageVariantsFromPayload(entry)
    }
  }

  for (const key of ['data', 'result', 'product', 'package', 'banner', 'store', 'order']) {
    if (payload[key] && typeof payload[key] === 'object') {
      registerImageVariantsFromPayload(payload[key])
    }
  }
}

export default {
  registerImageVariants,
  registerImageVariantsFromPayload,
  getVariantWidths,
  isVariantRegistryEmpty,
  clearVariantRegistry,
  normalizeWidths,
  widthsForImageUrl,
}
