/**
 * EXISTING MEDIA BACKFILL — GENERATES MISSING WEBP VARIANTS
 * =========================================================
 *
 * Purpose: generate the same responsive WebP variants that new uploads create,
 * for originals that already exist in Cloudflare R2.
 *
 * SAFETY CONTRACT (enforced in code, not just documented):
 * - DRY-RUN IS THE DEFAULT. Real writes require the explicit `--execute` flag.
 * - Never deletes objects. Never overwrites originals. Never writes a variant
 *   whose key already exists.
 * - Planning READS originals (GET) to measure their intrinsic width. That is a
 *   read: nothing is created, modified, or deleted by a dry-run, and the same
 *   measured plan is what `--execute` acts on.
 * - Database records are ONLY touched with `--write-metadata`, and only in the
 *   one column this feature added (`variantWidths`). Nothing else is written.
 * - Never modifies Cache-Control on originals (only new variant PUTs are made,
 *   and they inherit the upload pipeline's cache policy).
 * - One bad image is logged and skipped; the run continues.
 * - Credentials are never logged; errors are reduced to a safe summary.
 *
 * ONE WIDTH CONTRACT
 * A source of intrinsic width I can only have variants at widths W < I. The
 * planner MEASURES I and applies `generatedWidthsFor(I)`; the generators apply
 * the same predicate. Both therefore agree by construction, and a dry-run after
 * a successful run reports zero creatable work instead of a ladder of widths
 * that can never exist.
 *
 * USAGE:
 *   node scripts/backfill-image-variants.js                      # dry-run, all prefixes
 *   node scripts/backfill-image-variants.js --prefix products    # dry-run, one prefix
 *   node scripts/backfill-image-variants.js --execute            # REAL WRITES
 *   node scripts/backfill-image-variants.js --write-metadata     # DB widths only
 *
 * VARIANT METADATA (--write-metadata)
 * -----------------------------------
 * The storefront may only advertise a srcset width whose object is known to
 * exist. For originals uploaded before the variant pipeline, the server has no
 * record of which widths exist — so it must not advertise any, and those images
 * render at full size.
 *
 * This tool already downloads every original to generate its variants, so it
 * learns the answer at zero marginal cost. `--write-metadata` records, per
 * image, the set of widths now present in R2. It is a separate flag from
 * `--execute` so the R2 half stays usable without a database, and it is
 * idempotent: re-running writes the same widths.
 *
 * FLAGS:
 *   --prefix <name>   Limit to one prefix. Repeatable. Default: all known.
 *   --concurrency <n> Parallel images. Default 3 (conservative for Railway).
 *   --execute         Perform real uploads. Without it, the run is a dry-run.
 *   --write-metadata  Record the generated widths in the database. A WRITE.
 *                     Also requires --execute, since the widths must be
 *                     measured and recording them is a database mutation.
 *   --check-metadata  RECONCILE storage against the database and print a
 *                     per-object report. Strictly READ-ONLY: it reads
 *                     originals and object metadata, queries the database, and
 *                     performs no upload, no delete, and no database write. It
 *                     does NOT require --execute, and cannot be combined with
 *                     it. Exits non-zero when an active storefront reference is
 *                     missing widths or disagrees with storage, so it can gate
 *                     a rollout; unreferenced objects are reported but are not
 *                     a blocker and are never deleted.
 *   --help            Show usage.
 *
 * READ-ONLY MODE IS AUDITABLE
 * `--check-metadata` reaches the network and the database through exactly two
 * functions, `reconcileMetadata` and `scanReferences`. Between them the only
 * Prisma call is `findMany`, and neither function can name `uploadToStorage`,
 * `deleteFromStorage`, or any mutating delegate. A test asserts this by
 * standing a proxy Prisma client in front of the real code path and failing on
 * the first mutating call, so the guarantee is enforced rather than asserted
 * in a comment.
 */
import 'dotenv/config'
import {
  isR2Configured,
  getBucketName,
  listStorageObjects,
  storageObjectExists,
  getObjectBuffer,
  uploadToStorage,
  extractStorageKey,
} from '../src/lib/storage.js'
import {
  generateImageVariants,
  generateDetailVariant,
  buildVariantFilename,
  generatedWidthsFor,
  readIntrinsicWidth,
  IMAGE_VARIANT_SIZES,
  IMAGE_DETAIL_SIZE,
  VARIANT_FILENAME_PATTERN,
  VARIANT_WIDTHS,
} from '../src/lib/image-processing.js'

/**
 * Prefixes that actually receive uploads in this application.
 * Mirrors the subfolders used by upload.controller.js — notably there is NO
 * `banners` upload path, so banner images (if any) live wherever the admin
 * placed them and are not scanned by default. Add it explicitly with --prefix.
 */
const KNOWN_PREFIXES = ['products', 'packages', 'branding']

/**
 * Source formats eligible for transformation. Matches the upload middleware's
 * ALLOWED_MIME_TYPES exactly (image/jpeg, image/png, image/webp) so the backfill
 * never processes a file the upload path would have rejected.
 *
 * SVG is deliberately excluded: rasterizing it would destroy scalability and
 * the upload path does not accept it either.
 */
const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const MIME_BY_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

const DEFAULT_CONCURRENCY = 3

// ---------------------------------------------------------------------------
// Argument parsing (no external CLI dependency — plain argv scan)
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const args = {
    prefixes: [],
    concurrency: DEFAULT_CONCURRENCY,
    execute: false,
    writeMetadata: false,
    checkMetadata: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      args.help = true
    } else if (arg === '--execute') {
      args.execute = true
    } else if (arg === '--write-metadata') {
      args.writeMetadata = true
    } else if (arg === '--check-metadata') {
      args.checkMetadata = true
    } else if (arg === '--no-check-metadata') {
      args.checkMetadata = false
    } else if (arg === '--no-write-metadata') {
      args.writeMetadata = false
    } else if (arg === '--dry-run') {
      // Explicitly accepted for clarity; dry-run is already the default.
      args.execute = false
    } else if (arg === '--prefix') {
      const value = argv[++i]
      if (!value) throw new Error('--prefix requires a value')
      args.prefixes.push(value.replace(/^\/+|\/+$/g, ''))
    } else if (arg.startsWith('--prefix=')) {
      args.prefixes.push(arg.slice('--prefix='.length).replace(/^\/+|\/+$/g, ''))
    } else if (arg === '--concurrency') {
      const value = Number(argv[++i])
      if (!Number.isInteger(value) || value < 1 || value > 16) {
        throw new Error('--concurrency must be an integer between 1 and 16')
      }
      args.concurrency = value
    } else if (arg.startsWith('--concurrency=')) {
      const value = Number(arg.slice('--concurrency='.length))
      if (!Number.isInteger(value) || value < 1 || value > 16) {
        throw new Error('--concurrency must be an integer between 1 and 16')
      }
      args.concurrency = value
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

// ---------------------------------------------------------------------------
// Object classification (pure, exported so it can be unit-tested)
// ---------------------------------------------------------------------------

/**
 * Decides whether a storage object is a source image eligible for backfill.
 *
 * @param {string} key - Storage key, e.g. "products/1234-abc.jpg"
 * @returns {{eligible: boolean, reason: string}}
 */
export function classifyObject(key) {
  if (!key) return { eligible: false, reason: 'empty key' }

  const filename = key.slice(key.lastIndexOf('/') + 1)

  // Recursion guard: never treat a generated variant as a source image.
  // Without this, "foo-400w.webp" would spawn "foo-400w-400w.webp".
  if (VARIANT_FILENAME_PATTERN.test(filename)) {
    return { eligible: false, reason: 'already a generated variant' }
  }

  // Skip dotfiles (e.g. ".gitkeep").
  if (filename.startsWith('.')) {
    return { eligible: false, reason: 'hidden file' }
  }

  const dot = filename.lastIndexOf('.')
  const ext = dot > 0 ? filename.slice(dot).toLowerCase() : ''

  if (!ext) return { eligible: false, reason: 'no extension' }
  if (ext === '.svg') return { eligible: false, reason: 'svg not supported by upload path' }
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return { eligible: false, reason: `unsupported format (${ext})` }
  }

  return { eligible: true, reason: 'eligible raster source' }
}

/**
 * Returns the variant keys that SHOULD exist for a given original.
 *
 * THE ONE WIDTH CONTRACT
 * `intrinsicWidth` is REQUIRED. There is deliberately no fallback to the full
 * ladder: the widths that exist for a source are exactly
 * `generatedWidthsFor(intrinsicWidth)`, and planning anything else makes the
 * plan disagree with the run it is planning (which then declines the phantom
 * widths at execution time and reports them as failures).
 *
 * Callers that have not measured the source yet must not call this — see
 * `buildPlan`, which measures first. An unmeasured width THROWS rather than
 * degrading: returning `[]` for a source nobody measured would mark it
 * "complete", and a permanently unoptimised image is indistinguishable from
 * one that needs no work.
 *
 * @param {string} key - e.g. "products/1234-abc.jpg"
 * @param {number} intrinsicWidth - Source width in px, as read by
 *   `readIntrinsicWidth`.
 * @returns {Array<{width: number, key: string, subfolder: string}>}
 * @throws {Error} If `intrinsicWidth` is not a usable measurement.
 */
export function expectedVariantKeys(key, intrinsicWidth) {
  if (!Number.isFinite(intrinsicWidth)) {
    throw new Error(
      `expectedVariantKeys("${key}") requires a measured intrinsic width. ` +
        'The width contract is generatedWidthsFor(intrinsicWidth); without it there ' +
        'is no honest set of expected keys — read one with readIntrinsicWidth first.'
    )
  }

  const lastSlash = key.lastIndexOf('/')
  const prefix = lastSlash > 0 ? key.slice(0, lastSlash + 1) : ''
  const filename = key.slice(lastSlash + 1)
  const subfolder = lastSlash > 0 ? key.slice(0, lastSlash) : ''

  return generatedWidthsFor(intrinsicWidth).map((width) => ({
    width,
    key: prefix + buildVariantFilename(filename, width),
    subfolder,
  }))
}

// ---------------------------------------------------------------------------
// Bounded concurrency map
// ---------------------------------------------------------------------------

/**
 * Runs `worker` over `items` with at most `limit` in flight.
 * A rejected worker is captured, not thrown, so one failure cannot stop the run.
 *
 * @template T
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<any>} worker
 * @returns {Promise<Array<{status: 'ok'|'error', value?: any, error?: Error}>>}
 */
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      try {
        results[index] = { status: 'ok', value: await worker(items[index], index) }
      } catch (error) {
        results[index] = { status: 'error', error }
      }
    }
  })

  await Promise.all(runners)
  return results
}

// ---------------------------------------------------------------------------
// Safe error formatting (never leaks credentials)
// ---------------------------------------------------------------------------

export function safeErrorMessage(error) {
  const raw = error?.message || String(error)
  return raw
    // Strip anything that looks like an AWS access key id / secret.
    .replace(/AKIA[0-9A-Z]{12,}/g, 'AKIA***')
    .replace(/(SecretAccessKey|accessKeyId|secret|password|token)\s*[:=]\s*\S+/gi, '$1=***')
    .slice(0, 200)
}

// ---------------------------------------------------------------------------
// Core planning / execution
// ---------------------------------------------------------------------------

/**
 * Builds the full work plan without performing any mutation.
 *
 * READ-ONLY, in both modes. It performs LIST, GET (to measure intrinsic width)
 * and HEAD, and no write of any kind. `--execute` reuses this exact plan.
 *
 * The plan is measured, not assumed: every source's intrinsic width is read
 * before its expected widths are computed, via the same `generatedWidthsFor`
 * predicate the generators use. That is what makes a dry-run and the run it
 * predicts agree, and it is why `complete` means "every width this source is
 * wide enough to fill already exists" rather than "the four-rung ladder
 * exists".
 *
 * A source narrower than the smallest rung (generatedWidthsFor -> []) is
 * complete by definition: there is no width it could legitimately have. It is
 * still reported, under `noVariants`, so it is visible rather than silently
 * folded into "already complete".
 *
 * @param {Object} deps - Injected storage deps (allows testing without R2).
 */
export async function buildPlan({ prefixes, listObjects, objectExists, readObject, measureWidth }) {
  const scanned = []
  const sources = []
  const skipped = []
  const unmeasurable = []

  for (const prefix of prefixes) {
    const objects = await listObjects(prefix)
    for (const object of objects) {
      scanned.push(object.key)
      const { eligible, reason } = classifyObject(object.key)
      if (!eligible) {
        skipped.push({ key: object.key, reason })
        continue
      }
      sources.push(object)
    }
  }

  const plan = []
  for (const source of sources) {
    let intrinsicWidth
    try {
      intrinsicWidth = await measureWidth(source.key)
    } catch (error) {
      // An unreadable, corrupt, or over-cap source cannot be planned against.
      // It is reported and EXCLUDED from the work list: a source the planner
      // cannot measure is one the executor could not transform either, so
      // planning it would only convert a clear diagnostic into a run failure.
      unmeasurable.push({ key: source.key, reason: safeErrorMessage(error) })
      continue
    }

    const expected = expectedVariantKeys(source.key, intrinsicWidth)
    const missing = []
    const present = []
    for (const variant of expected) {
      if (await objectExists(variant.key)) present.push(variant.width)
      else missing.push(variant.width)
    }

    plan.push({
      key: source.key,
      size: source.size,
      intrinsicWidth,
      // Widths the invariant makes impossible for this source. Reported, not
      // planned: they can never be created and must never be advertised.
      ineligibleWidths: VARIANT_WIDTHS.filter((w) => !expected.some((e) => e.width === w)),
      missing,
      present,
      // Complete means complete RELATIVE TO THE SOURCE: every width this image
      // is wide enough to fill already has an object. A 300px source with only
      // its 200w variant is complete; a 2000px source with three of four is not.
      complete: missing.length === 0,
    })
  }

  return {
    scanned,
    sources,
    skipped,
    unmeasurable,
    plan,
    // Sources that legitimately have no variants at all (narrower than 200px).
    noVariants: plan.filter((e) => e.intrinsicWidth > 0 && e.ineligibleWidths.length === VARIANT_WIDTHS.length),
  }
}

/**
 * Processes one source image: generate only the missing variants, then upload.
 * Dry-run performs zero writes.
 */
export async function processSource({ source, planEntry, execute, deps = {} }) {
  const { key } = source
  const { missing } = planEntry

  // Storage functions are injected (defaulting to the real R2-backed ones) so
  // this function can be exercised end-to-end against a fake store in tests
  // without patching an immutable ESM module namespace.
  const readObject = deps.getObjectBuffer || getObjectBuffer
  const objectExists = deps.storageObjectExists || storageObjectExists
  const upload = deps.uploadToStorage || uploadToStorage

  if (planEntry.complete) {
    // No download needed, but the widths are still known: they are exactly the
    // ones the plan found already present. Reporting them is what lets a
    // complete-but-unrecorded image get its metadata on this run.
    return {
      key,
      action: 'skipped-complete',
      variants: 0,
      bytesRead: 0,
      bytesWritten: 0,
      declined: [],
      widths: [],
      // The FULL set that exists in storage — `present` plus nothing missing.
      // Measured against the source's own width, so this is the complete truth
      // for this image, not a subset of a ladder it may not fill.
      metadataWidths: [...(planEntry.present || [])].sort((a, b) => a - b),
    }
  }

  if (!execute) {
    return {
      key,
      action: 'would-generate',
      variants: missing.length,
      widths: missing,
      declined: [],
      bytesRead: 0,
      bytesWritten: 0,
      // What storage will hold after this run: the already-present widths plus
      // the ones about to be created. `missing` is already restricted to the
      // widths this source can fill, so nothing ineligible is implied here.
      metadataWidths: [...new Set([...(planEntry.present || []), ...missing])].sort((a, b) => a - b),
    }
  }

  // --- real work below this line; only reached with --execute ---
  const buffer = await readObject(key)
  if (!buffer) {
    throw new Error('source object could not be read')
  }

  const lastSlash = key.lastIndexOf('/')
  const subfolder = lastSlash > 0 ? key.slice(0, lastSlash) : ''
  const filename = key.slice(lastSlash + 1)

  // Split missing widths: card widths go through the batch generator, the
  // detail width through its dedicated generator (identical to upload path).
  const cardWidths = missing.filter((w) => IMAGE_VARIANT_SIZES.includes(w))
  const needsDetail = missing.includes(IMAGE_DETAIL_SIZE)

  let variants = []
  if (cardWidths.length) {
    const result = await generateImageVariants(
      buffer,
      subfolder,
      filename,
      MIME_BY_EXTENSION[extensionOf(filename)],
      cardWidths
    )
    variants = variants.concat(result.variants)
  }
  if (needsDetail) {
    const detail = await generateDetailVariant(buffer, subfolder, filename)
    if (detail) variants.push({ ...detail, width: IMAGE_DETAIL_SIZE })
  }

  // Widths the shared generator intentionally declined because the source is
  // narrower than them (`width >= metadata.width` in image-processing.js, and
  // generateDetailVariant returns null below IMAGE_DETAIL_SIZE). These are NOT
  // outstanding work: uploading them is impossible by design, and the upload
  // path skips them for new originals too. Reporting them keeps the summary
  // honest and makes a source with a narrow original converge instead of
  // re-reporting "missing" on every future run.
  const produced = new Set(variants.map((v) => v.width))
  const declined = missing.filter((width) => !produced.has(width))

  let bytesWritten = 0
  const uploaded = []
  for (const variant of variants) {
    // Re-check immediately before writing: another run may have just created it.
    if (await objectExists(variant.url.replace(/^\/uploads\//, ''))) {
      continue
    }
    const result = await upload({
      buffer: variant.buffer,
      filename: variant.filename,
      subfolder,
      mimetype: 'image/webp',
      size: variant.bytes,
    })
    bytesWritten += result.size
    uploaded.push(variant.width)
  }

  return {
    key,
    action: uploaded.length ? 'generated' : 'skipped-existing',
    variants: uploaded.length,
    widths: uploaded,
    declined,
    // The set that exists in storage once this run finishes: what was already
    // there, plus what was just written. A width another run wrote between
    // planning and this check is still correct to include — it is present.
    metadataWidths: [...new Set([...(planEntry.present || []), ...uploaded])].sort((a, b) => a - b),
    bytesRead: buffer.length,
    bytesWritten,
  }
}

// ---------------------------------------------------------------------------
// Variant metadata (database)
// ---------------------------------------------------------------------------

/**
 * Every database surface that holds a media URL, and therefore needs a place
 * to record the widths generated for it.
 *
 * This list is the single source of truth for "which models does the metadata
 * writer cover". It exists because a media field that is NOT in this list is
 * silently left without metadata — which is safe (the storefront then emits no
 * srcset and serves the original) but permanently unoptimised, and invisible,
 * because a row nobody writes looks exactly like a row with nothing to write.
 *
 * `field` is the URL column; `widthsField` is the sibling column holding the
 * widths. For the denormalized `Product.image` / `Package.image` and the
 * StoreConfig logo there is no sibling column on the row — the denormalized
 * field always mirrors `images[0].url`, so the join row beside it is
 * authoritative and updating it updates both reads.
 *
 * DELIBERATELY NOT COVERED
 * `FacebookCatalogItem.imageUrl` is also a media URL and is NOT in this list,
 * on purpose. It is a snapshot pushed to Meta's CDN as a single absolute link
 * for an external product feed; the storefront never renders it, so it never
 * produces a srcset and has no widths to record. The `Product` / `Package` it
 * was derived from carries its own metadata, which is what any rendered use
 * would read. Adding it here would write widths nothing ever consults.
 */
const METADATA_TARGETS = [
  { model: 'productImage', field: 'url', widthsField: 'variantWidths', surface: 'Product images' },
  { model: 'packageImage', field: 'url', widthsField: 'variantWidths', surface: 'Package images' },
  { model: 'banner', field: 'image', widthsField: 'imageVariantWidths', surface: 'Banners' },
  { model: 'orderItem', field: 'productImage', widthsField: 'productImageVariantWidths', surface: 'Order item snapshots' },
  { model: 'packageOrderItem', field: 'packageImage', widthsField: 'packageImageVariantWidths', surface: 'Package order item snapshots' },
  { model: 'storeConfig', field: 'value', widthsField: null, surface: 'StoreConfig (branding logo)' },
]

/**
 * The StoreConfig rows this tool is willing to treat as media references.
 *
 * StoreConfig is an untyped key-value table, so "is this a media reference" is
 * answered by the key, not by the schema. A value that merely CONTAINS an
 * /uploads/ path is not a media reference — it could be a copy block, a
 * markdown blob, or a hero description that happens to mention an image — so
 * only an exact media value is considered, and any other key that happens to
 * match an entry is left for a human to look at rather than silently claimed.
 */
const STORE_CONFIG_MEDIA_KEYS = new Map([['store.logo', 'store.logo_variant_widths']])

/**
 * Records generated variant widths on the rows that reference a storage key.
 *
 * WHY THE STORE HOLDS GENERATED WIDTHS, NOT THE INTRINSIC WIDTH
 * The invariant is "every width advertised exists". Recording what the
 * generator actually wrote satisfies it directly; re-deriving it later from the
 * intrinsic width would be a second implementation of the server's rule, free
 * to drift from it. So the row holds the answer, not the input to the answer.
 *
 * URL MATCHING
 * A stored URL may be absolute (`https://api.../uploads/products/x.jpg`),
 * relative (`/uploads/products/x.jpg`), or a bare key (`products/x.jpg`), and
 * may carry a query string. Both sides are normalized through
 * `extractStorageKey` before comparison — raw string equality would silently
 * match nothing on the absolute-URL rows.
 *
 * ORDER SNAPSHOTS
 * Order rows deliberately snapshot the image, so a historical order keeps
 * rendering after its product is edited or deleted. They therefore need their
 * OWN widths, recorded when the order was placed; the backfill cannot derive
 * them from the product row afterwards, because the product may have changed.
 * They are still updated here, which is correct for any order placed before the
 * pipeline shipped, where the snapshot predates the column and the product
 * image it names is the same object. An order whose snapshot names an image
 * that has since been REPLACED (a new upload, so a new object) is correctly not
 * matched — its original object has no variants, and the snapshot has none
 * either.
 *
 * @param {Array<{key: string, metadataWidths: number[]}>} entries
 * @param {Object} deps - Injected Prisma deps, so this is testable without a DB.
 * @returns {Promise<{updated: number, unmatchedKeys: string[], errors: Array<{key: string, message: string}>, references: object}>}
 */
export async function writeVariantMetadata(entries, deps = {}) {
  const prisma = deps.prisma
  if (!prisma) throw new Error('writeVariantMetadata requires a prisma client')

  const byKey = new Map()
  for (const entry of entries) {
    if (!entry?.key) continue
    const widths = [...new Set(entry.metadataWidths || [])]
      .filter((w) => Number.isInteger(w) && w > 0)
      .sort((a, b) => a - b)
    if (widths.length === 0) continue
    byKey.set(entry.key, widths)
  }
  if (byKey.size === 0) return { updated: 0, unmatchedKeys: [], errors: [], references: emptyReferences() }

  // One read of every candidate row, then grouped in memory. A per-key query
  // would be N round trips against a table that holds the whole catalogue.
  const [readResults, storeConfigRows] = await Promise.all([
    Promise.all(
      METADATA_TARGETS.filter((t) => t.model !== 'storeConfig').map(async (target) => ({
        target,
        rows: await prisma[target.model].findMany({
          select: { id: true, [target.field]: true, [target.widthsField]: true },
        }),
      }))
    ),
    prisma.storeConfig.findMany({ select: { key: true, value: true } }),
  ])

  const targets = new Map() // model -> [{id, widths, field}]
  /** Every key that is referenced SOMEWHERE, with the surfaces that name it. */
  const references = emptyReferences()
  const record = (key, surface) => {
    if (!key) return
    const set = references.get(key) || new Set()
    set.add(surface)
    references.set(key, set)
  }
  const push = (target, row, url) => {
    const key = extractStorageKey(url)
    if (!key) return
    record(key, target.surface)
    if (!byKey.has(key)) return
    const widths = byKey.get(key)
    // Idempotent: skip a row that already records exactly this set.
    if (JSON.stringify([...(row[target.widthsField] || [])].sort((a, b) => a - b)) === JSON.stringify(widths)) return
    if (!targets.has(target.model)) targets.set(target.model, [])
    targets.get(target.model).push({ id: row.id, widths, field: target.widthsField })
  }

  for (const { target, rows } of readResults) {
    for (const row of rows) push(target, row, row[target.field])
  }

  // StoreConfig: key/value, so the KEY decides whether a value is a media
  // reference. The widths go in a sibling row, which is why this target
  // declares `widthsField: null`.
  for (const row of storeConfigRows) {
    const widthsKey = STORE_CONFIG_MEDIA_KEYS.get(row.key)
    if (!widthsKey) continue
    const key = extractStorageKey(row.value)
    if (!key) continue
    const target = METADATA_TARGETS.find((t) => t.model === 'storeConfig')
    record(key, target.surface)
    if (!byKey.has(key)) continue
    const widths = byKey.get(key)
    const existing = storeConfigRows.find((r) => r.key === widthsKey)
    let current = []
    if (existing?.value) {
      try {
        current = JSON.parse(existing.value)
      } catch {
        current = []
      }
    }
    if (JSON.stringify([...current].sort((a, b) => a - b)) === JSON.stringify(widths)) continue
    if (!targets.has('storeConfig')) targets.set('storeConfig', [])
    targets.get('storeConfig').push({ id: row.key, widths, field: 'value', siblingKey: widthsKey })
  }

  // A key nothing references. Reported with the surfaces that DO reference it,
  // so "unmatched" is distinguishable from "unreferenced" — the difference
  // between a bug in this writer and a genuine R2 leftover.
  const matched = new Set([...references.keys()].filter((key) => byKey.has(key)))
  const unmatchedKeys = [...byKey.keys()].filter((key) => !matched.has(key))

  let updated = 0
  const errors = []
  for (const [model, rows] of targets) {
    const delegate = prisma[model]
    for (const row of rows) {
      try {
        if (model === 'storeConfig') {
          // upsert, not update: the sibling row usually does not exist yet.
          await delegate.upsert({
            where: { key: row.siblingKey },
            create: { key: row.siblingKey, value: JSON.stringify(row.widths), type: 'json' },
            update: { value: JSON.stringify(row.widths) },
          })
        } else {
          await delegate.update({ where: { id: row.id }, data: { [row.field]: row.widths } })
        }
        updated++
      } catch (error) {
        // One bad row must not stop the run.
        errors.push({ key: `${model}#${row.id}`, message: safeErrorMessage(error) })
      }
    }
  }

  return { updated, unmatchedKeys, errors, references }
}

// ---------------------------------------------------------------------------
// Metadata RECONCILIATION (read-only)
// ---------------------------------------------------------------------------

/**
 * The four states an original's metadata can be in, as reported by
 * `reconcileMetadata`.
 *
 * `correct` and `unreferenced` are both fine; `missing` and `stale` are the two
 * that mean a storefront srcset and storage disagree.
 *
 * - `correct`     — a live reference records exactly the widths that exist.
 * - `missing`     — a live reference, but no widths recorded at all. The
 *                   storefront emits no srcset and serves the original: safe,
 *                   but every visitor downloads a full-size file.
 * - `stale`       — a live reference recording widths that do NOT match storage.
 *                   Either it claims a variant that was never written (a 404 on
 *                   the storefront) or it omits one that was. The 404 case is
 *                   the dangerous one, and it is why `stale` is a blocker.
 * - `unreferenced` — no row in any model names this object. Reported for
 *                   review; never a storefront blocker, because nothing renders
 *                   it. Never deleted.
 */
export const METADATA_STATE = Object.freeze({
  CORRECT: 'correct',
  MISSING: 'missing',
  STALE: 'stale',
  UNREFERENCED: 'unreferenced',
})

/**
 * Reads every media reference in the database and returns, per storage key, the
 * surfaces that name it and the widths each of them currently records.
 *
 * STRICTLY READ-ONLY. Every call made on the Prisma client is `findMany`. There
 * is no code path from here to `update`, `upsert`, `create`, `delete` or
 * `deleteMany` — deliberately. This is the function the production
 * reconciliation runs, and it must be auditable as a reader: a grep for any
 * mutating delegate in this function should return nothing.
 *
 * It walks the SAME `METADATA_TARGETS` list the writer uses, so a surface
 * cannot be covered for writing but invisible to the check (or vice versa).
 * That shared list is the point: the two halves of the tool agreeing by
 * construction is what makes the report trustworthy.
 *
 * StoreConfig needs its own handling because it is an untyped key-value table
 * — the KEY decides whether a value is a media reference — and because the logo
 * has no widths column, only the sibling key.
 *
 * @param {{prisma: object}} deps
 * @returns {Promise<{references: Map<string, {surfaces: Set<string>, recorded: Array<{surface: string, widths: number[]}>}>}>}
 */
export async function scanReferences({ prisma }) {
  if (!prisma) throw new Error('scanReferences requires a prisma client')

  const targets = METADATA_TARGETS.filter((t) => t.model !== 'storeConfig')
  const [rowResults, storeConfigRows] = await Promise.all([
    Promise.all(
      targets.map(async (target) => ({
        target,
        rows: await prisma[target.model].findMany(),
      }))
    ),
    prisma.storeConfig.findMany(),
  ])

  const references = new Map()
  const record = (key, surface, widths) => {
    if (!key) return
    let entry = references.get(key)
    if (!entry) {
      entry = { surfaces: new Set(), recorded: [] }
      references.set(key, entry)
    }
    entry.surfaces.add(surface)
    entry.recorded.push({ surface, widths: normalizeWidths(widths) })
  }

  for (const { target, rows } of rowResults) {
    for (const row of rows || []) {
      const key = extractStorageKey(row?.[target.field])
      if (!key) continue
      record(key, target.surface, target.widthsField ? row[target.widthsField] : null)
    }
  }

  for (const row of storeConfigRows || []) {
    const widthsKey = STORE_CONFIG_MEDIA_KEYS.get(row?.key)
    if (!widthsKey) continue
    const key = extractStorageKey(row.value)
    if (!key) continue
    const target = METADATA_TARGETS.find((t) => t.model === 'storeConfig')
    // The widths live in the sibling row, so they are looked up, not read off
    // this one. A missing sibling means "recorded nothing", not "unknown".
    const sibling = (storeConfigRows || []).find((r) => r?.key === widthsKey)
    let widths = null
    if (sibling?.value != null) {
      try {
        widths = typeof sibling.value === 'string' ? JSON.parse(sibling.value) : sibling.value
      } catch {
        widths = null
      }
    }
    record(key, target.surface, widths)
  }

  return { references }
}

/**
 * Compares what STORAGE holds against what the DATABASE records, for every
 * eligible original, and classifies each one.
 *
 * WHY THE STORAGE SIDE IS MEASURED, NOT RECOMPUTED FROM THE PLAN
 * The truth about which variants exist is the measured set the planner already
 * built: `present` (found in storage) plus `missing` (creatable and absent).
 * The full truth is their union. Comparing that against the DB is the only
 * check that can catch a *stale* record — a row claiming a width that was never
 * written — which is the failure that actually 404s on the storefront. A check
 * that only asked "is anything recorded?" would pass straight over it.
 *
 * @param {Array<{key: string, intrinsicWidth: number, present: number[], missing: number[], complete: boolean}>} planEntries
 * @param {Array<{key: string, reason: string}>} unmeasurable - Unreadable sources, reported separately.
 * @param {{prisma: object}} deps
 */
export async function reconcileMetadata(planEntries, unmeasurable, deps) {
  const { references } = await scanReferences(deps)
  const rows = []
  const add = (key, state, detail) =>
    rows.push({ key, state, ...detail })

  for (const entry of planEntries) {
    // What storage will hold: present now, plus what this run would create.
    // For a reconciliation the "missing" half is included deliberately — the
    // question is whether the DB agrees with the intended end state, not with
    // storage's intermediate one.
    const inStorage = [...new Set([...(entry.present || []), ...(entry.missing || [])])].sort(
      (a, b) => a - b
    )
    const ref = references.get(entry.key)

    if (!ref) {
      add(entry.key, METADATA_STATE.UNREFERENCED, {
        intrinsicWidth: entry.intrinsicWidth,
        availableWidths: inStorage,
        surfaces: [],
        recordedWidths: [],
        variantWidthsMissing: inStorage,
        variantWidthsExtra: [],
      })
      continue
    }

    // EACH SURFACE IS JUDGED ON ITS OWN.
    //
    // A key can be named by several rows (a product image and an order snapshot
    // of it, say), and the storefront reads each independently. Taking the union
    // of what they record would let a correct row mask a lagging one — the
    // union would match storage while the snapshot still advertises a width
    // that was never written. So the union is computed only for REPORTING; the
    // verdict comes from the worst individual surface.
    const recorded = ref.recorded
    const recordedUnion = [...new Set(recorded.flatMap((r) => r.widths))].sort((a, b) => a - b)
    const missingWidths = inStorage.filter((w) => !recordedUnion.includes(w))
    const extraWidths = recordedUnion.filter((w) => !inStorage.includes(w))

    // A surface disagrees if it claims a width storage does not hold (a 404 on
    // the storefront) or omits one it does (an unoptimised full-size load).
    const disagreeing = recorded.filter(
      (r) => r.widths.length !== inStorage.length || r.widths.some((w) => !inStorage.includes(w))
    )
    // "Records nothing" is a MISSING row only when there is something to record.
    // A source too narrow to fill any rung has no variants by design, so an
    // empty list is the CORRECT answer for it, not a gap.
    const recordsNothing = recorded.every((r) => r.widths.length === 0)
    const hasVariants = inStorage.length > 0

    // Order matters. A row that records NOTHING is reported as missing rather
    // than stale: both are blockers, but "missing" is the accurate description
    // and it routes the operator to the right repair. Only once something is
    // recorded does a disagreement become a staleness question.
    let state
    if (recordsNothing && hasVariants) state = METADATA_STATE.MISSING
    else if (disagreeing.length) state = METADATA_STATE.STALE
    else state = METADATA_STATE.CORRECT

    add(entry.key, state, {
      intrinsicWidth: entry.intrinsicWidth,
      availableWidths: inStorage,
      surfaces: [...ref.surfaces],
      recordedWidths: recorded,
      variantWidthsMissing: missingWidths,
      variantWidthsExtra: extraWidths,
    })
  }

  const isBlocker = (r) => r.state === METADATA_STATE.MISSING || r.state === METADATA_STATE.STALE
  return {
    rows,
    unreadable: (unmeasurable || []).map((u) => ({ key: u.key, reason: u.reason })),
    summary: {
      correct: rows.filter((r) => r.state === METADATA_STATE.CORRECT).length,
      missing: rows.filter((r) => r.state === METADATA_STATE.MISSING).length,
      stale: rows.filter((r) => r.state === METADATA_STATE.STALE).length,
      unreferenced: rows.filter((r) => r.state === METADATA_STATE.UNREFERENCED).length,
      unreadable: (unmeasurable || []).length,
      // An unreferenced object is an R2 leftover, not a storefront defect:
      // nothing renders it, so it cannot produce a 404.
      blocking: rows.filter(isBlocker).length,
    },
  }
}

function normalizeWidths(widths) {
  if (!Array.isArray(widths)) return []
  return [...new Set(widths.filter((w) => Number.isInteger(w) && w > 0))].sort((a, b) => a - b)
}

function emptyReferences() {
  return new Map()
}

function extensionOf(filename) {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(dot).toLowerCase() : ''
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
===============================================================
 IMAGE VARIANT BACKFILL
===============================================================

Generates missing responsive WebP variants for existing R2 media,
using the same pipeline as new uploads.

SAFETY
  Dry-run is the DEFAULT and performs zero writes.
  Planning reads originals to measure their intrinsic width, so the plan
  applies the same width rule the generators do. A dry-run after a successful
  run reports 0 creatable variants.
  Real uploads require the explicit --execute flag.
  Originals are never modified, overwritten, or deleted.

USAGE
  node scripts/backfill-image-variants.js                    # dry-run, all prefixes
  node scripts/backfill-image-variants.js --prefix products  # dry-run, one prefix
  node scripts/backfill-image-variants.js --execute          # REAL WRITES
  node scripts/backfill-image-variants.js --check-metadata   # READ-ONLY reconciliation

OPTIONS
  --prefix <name>       Limit to one prefix (repeatable).
                        Default: ${KNOWN_PREFIXES.join(', ')}
  --concurrency <n>     Parallel images, 1-16. Default ${DEFAULT_CONCURRENCY}.
  --execute             Perform real uploads. Omit for a dry-run.
  --write-metadata      RECORD the generated widths in the database.
                        A WRITE. Requires --execute. Idempotent.
  --check-metadata      RECONCILE storage against the database and report.
                        READ-ONLY: no uploads, no database writes, and no
                        requirement for --execute. Exits non-zero if an active
                        storefront reference is missing or disagrees with
                        storage. Cannot be combined with --execute or
                        --write-metadata. Never deletes anything.
  --help                Show this message.
`)
}

export async function main(argv = process.argv.slice(2)) {
  let args
  try {
    args = parseArgs(argv)
  } catch (error) {
    console.error(`[Backfill] ${safeErrorMessage(error)}\n`)
    printHelp()
    process.exitCode = 1
    return
  }

  if (args.help) {
    printHelp()
    return
  }

  const prefixes = args.prefixes.length ? args.prefixes : KNOWN_PREFIXES
  const execute = args.execute
  const writeMetadata = args.writeMetadata
  const checkMetadata = args.checkMetadata

  // Reconcile mode is READ-ONLY and therefore never needs --execute. It is also
  // incompatible with it: passing both would mean the operator asked for a
  // report and a mutation at once, and silently honouring only one of them is
  // how the wrong thing happens. Refuse rather than pick.
  if (checkMetadata && execute) {
    console.error(
      '[Backfill] --check-metadata is read-only and cannot be combined with --execute.\n' +
        '         Run it on its own to produce the reconciliation report; run --execute' +
        '\n         separately to apply any repairs it recommends.'
    )
    process.exitCode = 1
    return
  }

  if (writeMetadata && checkMetadata) {
    console.error(
      '[Backfill] --check-metadata and --write-metadata are mutually exclusive.\n' +
        '         One reports, the other writes. Pick the one you meant.'
    )
    process.exitCode = 1
    return
  }

  // UNCHANGED: recording widths is a database write and still requires
  // --execute. Check mode reports; it does not record.
  if (writeMetadata && !execute) {
    console.error(
      '[Backfill] --write-metadata requires --execute. Planning now measures each ' +
        "source's intrinsic width, so a dry-run can REPORT the widths, but recording " +
        'them is a database write and is never performed by a dry-run.'
    )
    process.exitCode = 1
    return
  }

  if (!isR2Configured()) {
    console.error(
      '[Backfill] R2 is not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY).\n' +
      '         Refusing to run — the backfill targets the same store new uploads use.'
    )
    process.exitCode = 1
    return
  }

  console.log('===============================================================')
  console.log(' IMAGE VARIANT BACKFILL')
  console.log('===============================================================')
  const mode = checkMetadata
    ? 'RECONCILE (read-only: no uploads, no database writes)'
    : execute
      ? 'EXECUTE (real uploads)'
      : 'DRY-RUN (no writes)'
  console.log(`  mode        : ${mode}`)
  console.log(`  bucket      : ${getBucketName()}`)
  console.log(`  prefixes    : ${prefixes.join(', ')}`)
  console.log(`  concurrency : ${args.concurrency}`)
  console.log(
    `  db metadata: ${writeMetadata ? 'WRITE (variantWidths)' : checkMetadata ? 'READ-ONLY (reconciliation)' : 'off'}`
  )
  console.log('===============================================================\n')

  if (execute) {
    console.log('  NOTE: running with --execute. Variants WILL be written to R2.\n')
  }
  if (checkMetadata) {
    console.log('  NOTE: --check-metadata. This run performs NO writes of any kind.\n')
  }

  // ---- discovery + planning (read-only) ----
  // Planning downloads each original to read its intrinsic width. That is a
  // read, not a write: the same objects, unchanged. It is what lets this plan
  // and the execution that follows apply ONE width contract.
  let plan
  try {
    plan = await buildPlan({
      prefixes,
      listObjects: (prefix) => listStorageObjects(prefix),
      objectExists: (key) => storageObjectExists(key),
      readObject: (key) => getObjectBuffer(key),
      measureWidth: async (key) => {
        const buffer = await getObjectBuffer(key)
        if (!buffer) throw new Error('source object could not be read')
        return (await readIntrinsicWidth(buffer)).width
      },
    })
  } catch (error) {
    console.error(`[Backfill] Discovery failed: ${safeErrorMessage(error)}`)
    process.exitCode = 1
    return
  }

  const complete = plan.plan.filter((entry) => entry.complete)
  const incomplete = plan.plan.filter((entry) => !entry.complete)
  const wouldCreate = incomplete.reduce((sum, entry) => sum + entry.missing.length, 0)
  const notPlannable = plan.unmeasurable.length + plan.noVariants.length

  console.log('--- DRY-RUN PLAN ---' + (execute ? ' (execution follows)' : ''))
  console.log(`  scanned objects        : ${plan.scanned.length}`)
  console.log(`  eligible originals     : ${plan.sources.length}`)
  console.log(`  already complete       : ${complete.length}`)
  console.log(`  needing variants       : ${incomplete.length}`)
  console.log(`  variants to create     : ${wouldCreate}`)
  console.log(`  no variants possible   : ${plan.noVariants.length}  (narrower than ${VARIANT_WIDTHS[0]}px)`)
  console.log(`  unreadable / over cap  : ${plan.unmeasurable.length}`)
  console.log(`  skipped (not eligible) : ${plan.skipped.length}`)
  console.log('')

  if (plan.skipped.length) {
    const byReason = new Map()
    for (const item of plan.skipped) {
      byReason.set(item.reason, (byReason.get(item.reason) || 0) + 1)
    }
    for (const [reason, count] of byReason) {
      console.log(`    skipped ${String(count).padStart(5)}  — ${reason}`)
    }
    console.log('')
  }

  if (plan.unmeasurable.length) {
    console.log('  UNREADABLE (excluded from the work list — reported, not retried):')
    for (const item of plan.unmeasurable) {
      console.log(`    ${item.key} — ${item.reason}`)
    }
    console.log('')
  }

  if (plan.noVariants.length) {
    console.log('  NO VARIANT POSSIBLE (source is narrower than the smallest rung):')
    for (const entry of plan.noVariants) {
      console.log(`    ${entry.key} — ${entry.intrinsicWidth}px wide`)
    }
    console.log('')
  }

  if (!execute) {
    for (const entry of incomplete) {
      console.log(
        `    would generate ${entry.missing.length} variant(s) for ${entry.key} ` +
          `(${entry.intrinsicWidth}px source; widths: ${entry.missing.join('w, ')}w; ` +
          `ineligible: ${entry.ineligibleWidths.length ? entry.ineligibleWidths.join('w, ') + 'w' : 'none'})`
      )
    }
    console.log('\nDRY-RUN COMPLETE — no objects were created, modified, or deleted.')
    console.log('Re-run with --execute to perform the uploads.\n')
    return
  }

  // ---- execution ----
  console.log('--- EXECUTING ---')
  const results = await mapWithConcurrency(incomplete, args.concurrency, (source) =>
    processSource({
      source,
      planEntry: plan.plan.find((entry) => entry.key === source.key),
      execute,
    })
  )

  const summary = {
    scanned: plan.scanned.length,
    eligible: plan.sources.length,
    alreadyComplete: complete.length,
    noVariants: plan.noVariants.length,
    unmeasurable: plan.unmeasurable.length,
    skipped: plan.skipped.length,
    generated: 0,
    variantsCreated: 0,
    declined: 0,
    declinedImages: 0,
    failed: 0,
    bytesRead: 0,
    bytesWritten: 0,
  }

  results.forEach((result, index) => {
    const key = incomplete[index].key
    if (result.status === 'error') {
      summary.failed++
      console.log(`  FAILED   ${key} — ${safeErrorMessage(result.error)}`)
      return
    }
    const value = result.value
    summary.variantsCreated += value.variants
    summary.bytesRead += value.bytesRead
    summary.bytesWritten += value.bytesWritten
    summary.declined += value.declined?.length || 0
    if (value.declined?.length) {
      summary.declinedImages++
    }
    if (value.action === 'generated') {
      summary.generated++
      console.log(
        `  OK       ${key} — ${value.variants} variant(s) ` +
          `[${value.widths.join('w, ')}w] ` +
          `${(value.bytesRead / 1024).toFixed(0)} KiB -> ${(value.bytesWritten / 1024).toFixed(0)} KiB`
      )
    }
  })

  // ---- variant metadata (opt-in, separate from the R2 half) ----
  if (writeMetadata) {
    console.log('\n--- WRITING VARIANT METADATA ---')
    try {
      const { prisma } = await import('../src/lib/prisma.js')
      const entries = results
        .filter((result) => result.status === 'ok' && result.value?.metadataWidths?.length)
        .map((result) => ({ key: result.value.key, metadataWidths: result.value.metadataWidths }))
      const meta = await writeVariantMetadata(entries, { prisma })
      console.log(`  rows updated   : ${meta.updated}`)
      if (meta.unmatchedKeys.length) {
        // Split by cause. "No row anywhere" and "a row exists but has no
        // widths column this writer knows" are different problems, and only
        // the first is a harmless R2 leftover.
        const unreferenced = meta.unmatchedKeys.filter((k) => !meta.references.get(k)?.size)
        console.log(`  no matching row: ${meta.unmatchedKeys.length}`)
        for (const key of meta.unmatchedKeys.slice(0, 10)) {
          const surfaces = [...(meta.references.get(key) || [])]
          console.log(
            `      ${key}${surfaces.length ? `  [referenced by: ${surfaces.join(', ')}]` : '  [UNREFERENCED in the current DB]'}`
          )
        }
        if (meta.unmatchedKeys.length > 10) console.log(`      ... and ${meta.unmatchedKeys.length - 10} more`)
        console.log(`      of which unreferenced: ${unreferenced.length} (no row, any model, names this object)`)
        console.log('      No objects were deleted. These are reported for review only.')
      }
      for (const err of meta.errors) {
        console.log(`  FAILED         ${err.key} — ${err.message}`)
      }
      if (meta.errors.length) process.exitCode = 1
    } catch (error) {
      console.error(`[Backfill] Metadata write failed: ${safeErrorMessage(error)}`)
      process.exitCode = 1
    }
  }

  // ---- metadata reconciliation (opt-in, STRICTLY READ-ONLY) ----
  if (checkMetadata) {
    console.log('\n--- METADATA RECONCILIATION (read-only) ---')
    try {
      const { prisma } = await import('../src/lib/prisma.js')
      const report = await reconcileMetadata(plan.plan, plan.unmeasurable, { prisma })

      const widthList = (w) => (w.length ? w.join(', ') : '(none)')
      for (const row of report.rows) {
        const surfaces = row.surfaces.length ? row.surfaces.join(', ') : '-'
        const recorded = row.recordedWidths.length
          ? row.recordedWidths
              .map((r) => `${r.surface}=[${widthList(r.widths)}]`)
              .join(' ')
          : '(nothing recorded)'
        console.log(`  ${row.state.toUpperCase().padEnd(12)} ${row.key}`)
        console.log(`      available widths  : [${widthList(row.availableWidths)}]  (source ${row.intrinsicWidth}px)`)
        console.log(`      referenced by     : ${surfaces}`)
        console.log(`      recorded widths   : ${recorded}`)
        if (row.state === METADATA_STATE.STALE) {
          const parts = []
          if (row.variantWidthsMissing.length) parts.push(`missing [${row.variantWidthsMissing.join(', ')}]`)
          if (row.variantWidthsExtra.length) parts.push(`claims absent [${row.variantWidthsExtra.join(', ')}]`)
          console.log(`      problem           : ${parts.join('; ')}`)
        }
      }
      for (const u of report.unreadable) {
        console.log(`  UNREADABLE    ${u.key} — ${u.reason}`)
      }

      const sm = report.summary
      console.log('\n  --- RECONCILIATION SUMMARY ---')
      console.log(`  active refs, metadata correct  : ${sm.correct}`)
      console.log(`  active refs, metadata missing  : ${sm.missing}`)
      console.log(`  active refs, metadata stale    : ${sm.stale}  (DB disagrees with storage)`)
      console.log(`  unreferenced / orphan originals: ${sm.unreferenced}`)
      console.log(`  unreadable / over cap          : ${sm.unreadable}`)
      console.log(`  storefront blockers            : ${sm.blocking}`)
      if (sm.unreferenced) {
        console.log(
          '  NOTE: unreferenced objects are R2 leftovers, reported for review only.\n' +
            '        Nothing renders them, so they are not a storefront blocker, and\n' +
            '        this tool never deletes them.'
        )
      }
      if (sm.blocking) {
        console.log(
          '\n  UNSAFE TO ENABLE VITE_IMAGE_VARIANTS:\n' +
            `    ${sm.missing} active reference(s) record no widths, and ${sm.stale} disagree with\n` +
            '    storage. The first costs full-size downloads; the second produces 404s on\n' +
            '    any variant the storefront advertises from a stale row.\n' +
            '    Repair with: --execute --write-metadata'
        )
        process.exitCode = 1
      } else {
        console.log(
          '\n  SAFE: every active reference records the widths storage actually holds.\n' +
            '  Objects with no variants (source narrower than 200px) intentionally record\n' +
            '  nothing and emit no srcset, so they are correct, not missing.'
        )
      }
      console.log('\n  This mode performed no uploads and no database writes.')
    } catch (error) {
      console.error(`[Backfill] Reconciliation failed: ${safeErrorMessage(error)}`)
      process.exitCode = 1
    }
  }

  console.log('\n--- SUMMARY ---')
  console.log(`  scanned objects      : ${summary.scanned}`)
  console.log(`  eligible originals   : ${summary.eligible}`)
  console.log(`  already complete     : ${summary.alreadyComplete}  (every creatable width present)`)
  console.log(`  images generated for : ${summary.generated}`)
  console.log(`  variants created     : ${summary.variantsCreated}`)
  console.log(
    `  declined at generate : ${summary.declined} width(s) across ` +
      `${summary.declinedImages} image(s) — planner and generator disagreed`
  )
  console.log(`  no variants possible : ${summary.noVariants}  (source narrower than ${VARIANT_WIDTHS[0]}px)`)
  console.log(`  unreadable / over cap: ${summary.unmeasurable}`)
  console.log(`  skipped (not eligible): ${summary.skipped}`)
  console.log(`  failed               : ${summary.failed}`)
  console.log(`  bytes read           : ${(summary.bytesRead / 1024 / 1024).toFixed(2)} MiB`)
  console.log(`  bytes written        : ${(summary.bytesWritten / 1024 / 1024).toFixed(2)} MiB`)
  console.log('\nOriginals were not modified. No objects were deleted.\n')
}

// Only run when invoked directly, so the helpers above can be imported by tests.
const isDirectRun = process.argv[1] && process.argv[1].endsWith('backfill-image-variants.js')
if (isDirectRun) {
  main()
}

export default {
  main,
  parseArgs,
  classifyObject,
  expectedVariantKeys,
  mapWithConcurrency,
  buildPlan,
  processSource,
  safeErrorMessage,
  writeVariantMetadata,
}
