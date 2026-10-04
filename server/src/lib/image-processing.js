/**
 * Image variant generation service.
 *
 * Generates WebP variants of uploaded images at standard card/thumbnail widths,
 * preserving the original file untouched. Variant filenames are derived from the
 * original (e.g. `12345678abc.webp` -> `12345678abc-200w.webp`) so lookups are
 * deterministic and backfills are idempotent.
 *
 * DESIGN DECISIONS:
 * - WebP chosen for ~25-35% smaller payloads vs JPEG at equal quality with
 *   broad browser support (>98% global). AVIF would be smaller but lacks
 *   Safari support on older iOS. Originals preserved for legacy clients.
 * - Variant widths (200w, 320w, 400w, 800w) chosen from measured card/detail
 *   display sizes (226x301, 300x200, detail hero 340-380px).
 * - DPR handled via width descriptor (2x = double source pixels), keeping
 *   variant count small (~5 widths, not dozens).
 * - Sharp's withoutChroma option disabled; covers text legibility.
 * - METADATA POLICY (see `applyWebPolicy`): EXIF/XMP/IPTC are stripped, but the
 *   colour profile is preserved by converting to sRGB and re-attaching an sRGB
 *   ICC tag. Stripping alone would leave wide-gamut captures (Display P3 phone
 *   photos) mis-tagged; keeping all metadata would leak EXIF (GPS, camera
 *   serial, copyright) into web-delivered variants.
 * - Processing bounded: max input 5MB (enforced by multer) and dimensions
 *   capped at MAX_DIMENSIONS to prevent decompression bombs. The cap is
 *   enforced on EVERY Sharp entry point via `readValidatedMetadata`, including
 *   the detail path, which the upload controller calls independently.
 * - Failures are non-fatal: original URL remains valid if variant generation
 *   throws, ensuring uploads never break due to image errors.
 */
import Sharp from 'sharp'

// The complete variant ladder, ascending. Card widths first, then the
// detail-page width. Declared before the two legacy constants below and
// derived FROM this list, so the ladder has exactly one definition.
export const VARIANT_WIDTHS = [200, 320, 400, 800, 1200]

// Standard (card/thumbnail) variant widths. Exported for the backfill tool,
// which routes card widths through generateImageVariants and the detail width
// through generateDetailVariant, mirroring the upload path exactly.
export const IMAGE_VARIANT_SIZES = VARIANT_WIDTHS.filter((w) => w !== VARIANT_WIDTHS.at(-1))

// Large variant for detail-page heroes. Justified by the widest detail hero
// currently rendered (PackageDetails at 380px CSS): 380 x 3x DPR = 1140px,
// which exceeds 800w. Devices below 3x DPR simply pick the 800w candidate.
export const IMAGE_DETAIL_SIZE = VARIANT_WIDTHS.at(-1)

// Matches a generated variant filename, e.g. "1234-abc-200w.webp".
// Used to EXCLUDE variants from being treated as source images during backfill,
// which would otherwise cause recursive generation (foo-400w -> foo-400w-400w).
export const VARIANT_FILENAME_PATTERN = /-(200|320|400|800|1200)w\.webp$/i

// Maximum input dimensions to guard against decompression bombs
const MAX_DIMENSIONS = 8192

/**
 * Reads and VALIDATES image metadata, enforcing the MAX_DIMENSIONS cap.
 *
 * SINGLE SOURCE OF TRUTH for the dimension guard. Both `generateImageVariants`
 * and `generateDetailVariant` route through this, so no Sharp entry point can
 * be added later that silently skips the cap. The upload controller calls the
 * two generators independently, so a guard that lived in only one of them
 * would be bypassable on the other path.
 *
 * @param {Buffer} buffer
 * @returns {Promise<import('sharp').Metadata>}
 * @throws {Error} If the buffer is unreadable, has no dimensions, or exceeds MAX_DIMENSIONS.
 */
async function readValidatedMetadata(buffer) {
  const metadata = await Sharp(buffer)
    .metadata()
    .catch((err) => {
      throw new Error(`Failed to read image metadata: ${err.message}`)
    })

  if (!metadata.width || !metadata.height) {
    throw new Error('Image has no valid dimensions')
  }

  // Guard against decompression bombs
  if (metadata.width > MAX_DIMENSIONS || metadata.height > MAX_DIMENSIONS) {
    throw new Error(
      `Image dimensions exceed maximum allowed (${MAX_DIMENSIONS}px): ${metadata.width}x${metadata.height}`
    )
  }

  return metadata
}

/**
 * Applies the metadata policy to a WebP output pipeline.
 *
 * - `.rotate()` with no argument applies the EXIF orientation tag, so the
 *   correctly-oriented pixels are baked in. The tag itself is then dropped
 *   along with the rest of the EXIF block, which is the only way to strip
 *   orientation without risking sideways rendering for phone photos.
 * - `.withIccProfile('srgb', {attach:true})` converts wide-gamut input to
 *   sRGB and re-attaches a web-friendly sRGB ICC profile, so the variant
 *   renders in the same colours as the original.
 *
 * Everything else (EXIF, XMP, IPTC) is dropped: `withMetadata`/`keepMetadata`
 * are deliberately NOT used, since they would copy GPS and camera data into
 * web-delivered images.
 *
 * Note: an earlier `metadata: true` inside `.webp({...})` was a no-op — it is
 * not a member of Sharp's `WebpOptions` and is silently ignored, so the output
 * was byte-identical with and without it.
 *
 * @param {import('sharp').Sharp} pipeline
 * @returns {import('sharp').Sharp}
 */
function applyWebPolicy(pipeline) {
  return pipeline.rotate().withIccProfile('srgb', { attach: true })
}

/**
 * The width ladder, ascending. SINGLE SOURCE OF TRUTH for which widths exist.
 *
 * The storefront hardcodes the same list in `src/utils/image-variants.js`
 * (browser bundles cannot import server code), and the contract test asserts
 * the two are identical — see the EXISTENCE INVARIANT below.
 *
 * EXISTENCE INVARIANT
 * ===================
 * For a source of intrinsic width I, the set of objects that exist is exactly
 *
 *     generatedWidthsFor(I) = { W in VARIANT_WIDTHS : W < I }
 *
 * and both the upload pipeline and the backfill derive their work from that
 * one predicate. This mirrors the `width >= metadata.width` skip below and the
 * `metadata.width < IMAGE_DETAIL_SIZE` early return in generateDetailVariant.
 *
 * The frontend does NOT re-evaluate this predicate. It advertises the set of
 * widths this module recorded as generated (persisted per image as
 * `variantWidths`, shipped in the API payload, read by the storefront from
 * src/lib/image-metadata.js). That is why the two sides cannot disagree: the
 * client never re-derives the answer, it reads it.
 *
 * The rule is deliberately strict (`<`, not `<=`): a variant at exactly the
 * source's width would be a re-encode at identical pixel dimensions — extra
 * bytes and extra storage for zero added detail.
 *
 * @param {number} intrinsicWidth - Source width in px.
 * @returns {number[]} Widths to generate, ascending.
 */
export function generatedWidthsFor(intrinsicWidth) {
  if (!Number.isFinite(intrinsicWidth) || intrinsicWidth <= 0) return []
  return VARIANT_WIDTHS.filter((width) => width < intrinsicWidth)
}

/**
 * Reads ONLY the intrinsic width of a source image, under the same validated
 * read — and therefore the same MAX_DIMENSIONS decompression-bomb cap — as
 * every Sharp entry point in this module.
 *
 * WHY THIS EXISTS
 * The backfill planner must know a source's intrinsic width to apply the
 * EXISTENCE INVARIANT above, and must apply the SAME predicate the generators
 * apply. Deriving the width anywhere else (a second Sharp call, a hand-rolled
 * header parse) would be a second implementation of the rule, free to drift
 * from it — which is exactly the defect that made a dry-run disagree with the
 * run it was planning. Reading it here means both sides call one predicate.
 *
 * Exported rather than kept private so the planner can be honest about which
 * widths are creatable. It is read-only: it decodes metadata and nothing else,
 * and never writes an output buffer.
 *
 * @param {Buffer} buffer
 * @returns {Promise<{width: number, height: number, format?: string}>}
 * @throws {Error} If the buffer is unreadable, dimensionless, or over the cap.
 */
export async function readIntrinsicWidth(buffer) {
  const { width, height, format } = await readValidatedMetadata(buffer)
  return { width, height, format }
}

/**
 * Builds the variant filename for a given original filename and width.
 * SINGLE SOURCE OF TRUTH for variant naming — the upload pipeline and the
 * backfill tool both call this, so the two can never disagree.
 *
 * @param {string} originalFilename - e.g. "1234-abc.jpg"
 * @param {number} width - e.g. 200
 * @returns {string} - e.g. "1234-abc-200w.webp"
 */
export function buildVariantFilename(originalFilename, width) {
  const extIndex = originalFilename.lastIndexOf('.')
  const baseName = extIndex > 0 ? originalFilename.slice(0, extIndex) : originalFilename
  return `${baseName}-${width}w.webp`
}

/**
 * Returns the storage key a variant would be written to.
 * Mirrors uploadToStorage's key layout exactly.
 *
 * @param {string} subfolder
 * @param {string} originalFilename
 * @param {number} width
 * @returns {string} - e.g. "products/1234-abc-200w.webp"
 */
export function buildVariantKey(subfolder, originalFilename, width) {
  return `${subfolder}/${buildVariantFilename(originalFilename, width)}`
}

/**
 * Generates WebP variants for a given image buffer at standard card widths.
 * Original buffer is NOT modified.
 *
 * @param {Buffer} originalBuffer - Original image buffer
 * @param {string} subfolder - Target subfolder (products, packages, banners, branding)
 * @param {string} originalFilename - Safe filename of the original (e.g. "1234-abc.jpg")
 * @param {string} originalMimetype - MIME type of original (e.g. "image/jpeg")
 * @param {number[]} [onlyWidths] - Restrict generation to these widths. Used by the
 *   backfill tool to regenerate only variants that are actually missing.
 * @returns {Promise<{ variants: Array<{width: number, buffer: Buffer, filename: string, url: string, bytes: number}> }>}
 */
export async function generateImageVariants(
  originalBuffer,
  subfolder,
  originalFilename,
  _originalMimetype,
  onlyWidths
) {
  const variants = []
  const targetWidths = onlyWidths?.length ? onlyWidths : IMAGE_VARIANT_SIZES

  // Validate and guard against oversized/malformed images (shared with the
  // detail path, so neither can be called without the dimension cap).
  const metadata = await readValidatedMetadata(originalBuffer)

  // Generate each variant
  for (const width of targetWidths) {
    // Skip widths the source is too narrow to fill — stated by the shared
    // predicate so the backfill, the upload path, and the storefront's srcset
    // all evaluate exactly the same rule (see generatedWidthsFor).
    if (!generatedWidthsFor(metadata.width).includes(width)) continue

    const quality = width === 320 ? 80 : 82

    const variantBuffer = await applyWebPolicy(
      Sharp(originalBuffer).resize({
        width,
        withoutEnlargement: true,
        withoutChroma: false, // Preserve color detail for text readability
      })
    )
      .webp({
        quality, // Scoped: 80 for 320w, 82 for standard card variants (covers Arabic text legibility)
        lossless: false,
      })
      .toBuffer()

    // Variant filename: <basename>-<width>w.webp — via the single source of
    // truth so the upload path and the backfill tool cannot drift apart.
    const variantFilename = buildVariantFilename(originalFilename, width)
    const key = `${subfolder}/${variantFilename}`

    variants.push({
      width,
      buffer: variantBuffer,
      filename: variantFilename,
      url: `/uploads/${key}`,
      bytes: variantBuffer.length,
    })
  }

  return { variants }
}

/**
 * Generates a single large optimized variant (for detail pages) at 1200px width.
 *
 * Returns null when the source is narrower than IMAGE_DETAIL_SIZE (enlarging
 * would add no detail) — but THROWS when the source is malformed or exceeds
 * MAX_DIMENSIONS, matching generateImageVariants so the cap cannot be bypassed
 * by reaching this function through the upload controller.
 *
 * @param {Buffer} originalBuffer
 * @param {string} subfolder
 * @param {string} originalFilename
 * @returns {Promise<{buffer: Buffer, filename: string, url: string, bytes: number}|null>}
 */
export async function generateDetailVariant(originalBuffer, subfolder, originalFilename) {
  // Same validated read (and therefore the same MAX_DIMENSIONS cap) as the
  // standard path. Previously this caught errors and returned null, which let
  // an oversized image past the guard entirely.
  const metadata = await readValidatedMetadata(originalBuffer)
  if (!generatedWidthsFor(metadata.width).includes(IMAGE_DETAIL_SIZE)) return null

  const variantBuffer = await applyWebPolicy(
    Sharp(originalBuffer).resize({ width: IMAGE_DETAIL_SIZE, withoutEnlargement: true })
  )
    .webp({ quality: 80, lossless: false })
    .toBuffer()

  const variantFilename = buildVariantFilename(originalFilename, IMAGE_DETAIL_SIZE)
  const key = `${subfolder}/${variantFilename}`

  return {
    buffer: variantBuffer,
    filename: variantFilename,
    url: `/uploads/${key}`,
    bytes: variantBuffer.length,
  }
}

export default {
  generateImageVariants,
  generateDetailVariant,
  buildVariantFilename,
  buildVariantKey,
  generatedWidthsFor,
  readIntrinsicWidth,
  VARIANT_WIDTHS,
  IMAGE_VARIANT_SIZES,
  IMAGE_DETAIL_SIZE,
  VARIANT_FILENAME_PATTERN,
}
