import {
  extractStorageKey,
  getObjectBuffer,
  storageObjectExists,
  uploadToStorage,
} from './storage.js'
import {
  VARIANT_WIDTHS,
  buildVariantKey,
  generateDetailVariant,
  generateImageVariants,
} from './image-processing.js'
import { normalizeVariantWidths } from './image-metadata.js'

/**
 * Safety net run whenever a product or package is saved: every uploaded image
 * ends up with its WebP variant widths recorded, whatever the admin form sent.
 *
 * Without widths the storefront must fall back to the full-size original (up
 * to several MB per cover). That happened once when the admin form dropped
 * them, so the server no longer trusts the client for it:
 *
 *  1. Widths already present → kept as they are.
 *  2. Otherwise, variants already in storage (normal upload, earlier backfill)
 *     → their widths are recorded.
 *  3. Otherwise the original is read and the variants are generated now, the
 *     same way the upload endpoint does.
 *
 * Never throws: a failure leaves that image's widths empty (the storefront
 * then shows the original, which always works) and is logged.
 *
 * @param {Array<{url: string, variantWidths?: number[]}>} images - normalized list, updated in place
 * @returns {Promise<typeof images>}
 */
export async function ensureImageVariants(images) {
  if (!Array.isArray(images) || images.length === 0) return images
  await Promise.all(images.map((img) => fillWidths(img)))
  return images
}

async function fillWidths(img) {
  if (!img || normalizeVariantWidths(img.variantWidths).length > 0) return
  const key = extractStorageKey(img.url)
  if (!key || !key.includes('/')) return

  const slash = key.indexOf('/')
  const subfolder = key.slice(0, slash)
  const filename = key.slice(slash + 1)

  try {
    const existing = await existingWidths(subfolder, filename)
    if (existing.length > 0) {
      img.variantWidths = existing
      return
    }
    img.variantWidths = await generateWidths(key, subfolder, filename)
  } catch (err) {
    console.warn(`[ImageVariants] Could not resolve variants for "${key}":`, err.message)
  }
}

async function existingWidths(subfolder, filename) {
  const checks = await Promise.all(
    VARIANT_WIDTHS.map(async (width) =>
      (await storageObjectExists(buildVariantKey(subfolder, filename, width))) ? width : null
    )
  )
  return checks.filter((w) => w !== null)
}

async function generateWidths(key, subfolder, filename) {
  const buffer = await getObjectBuffer(key)
  if (!buffer) return []

  const { variants } = await generateImageVariants(buffer, subfolder, filename)
  const detail = await generateDetailVariant(buffer, subfolder, filename)
  const all = detail ? [...variants, { ...detail, width: VARIANT_WIDTHS.at(-1) }] : variants

  const widths = []
  for (const variant of all) {
    await uploadToStorage({
      buffer: variant.buffer,
      filename: variant.filename,
      subfolder,
      mimetype: 'image/webp',
      size: variant.bytes,
    })
    widths.push(variant.width)
  }
  return widths.sort((a, b) => a - b)
}
