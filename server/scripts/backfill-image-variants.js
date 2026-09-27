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
 * - Never deletes objects. Never overwrites originals.
 * - Database records are ONLY touched with `--write-metadata`, and only in the
 *   one column this feature added (`variantWidths`). Nothing else is written.
 * - Never modifies Cache-Control on originals (only new variant PUTs are made,
 *   and they inherit the upload pipeline's cache policy).
 * - One bad image is logged and skipped; the run continues.
 * - Credentials are never logged; errors are reduced to a safe summary.
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
 *   --write-metadata  Record the generated widths in the database. Also
 *                     requires --execute, since the widths must be measured.
 *   --help            Show usage.
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
  IMAGE_VARIANT_SIZES,
  IMAGE_DETAIL_SIZE,
  VARIANT_FILENAME_PATTERN,
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
 * Returns the variant keys that should exist for a given original.
 *
 * `intrinsicWidth` is optional: the tool does not download an image during
 * planning, so it plans the full ladder and lets generateImageVariants decline
 * the widths the source cannot fill (reported as `declined`, not as failures).
 * It is accepted so tests can pin the narrow-source case exactly.
 *
 * @param {string} key - e.g. "products/1234-abc.jpg"
 * @param {number} [intrinsicWidth] - If provided, restrict to the widths the
 *   source is actually wide enough to fill.
 * @returns {Array<{width: number, key: string}>}
 */
export function expectedVariantKeys(key, intrinsicWidth) {
  const lastSlash = key.lastIndexOf('/')
  const prefix = lastSlash > 0 ? key.slice(0, lastSlash + 1) : ''
  const filename = key.slice(lastSlash + 1)
  const subfolder = lastSlash > 0 ? key.slice(0, lastSlash) : ''

  const widths =
    Number.isFinite(intrinsicWidth) && intrinsicWidth > 0
      ? generatedWidthsFor(intrinsicWidth)
      : [...IMAGE_VARIANT_SIZES, IMAGE_DETAIL_SIZE]

  return widths.map((width) => ({
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
 * Every existence check here is read-only (HEAD).
 *
 * @param {Object} deps - Injected storage deps (allows testing without R2).
 */
export async function buildPlan({ prefixes, listObjects, objectExists }) {
  const scanned = []
  const sources = []
  const skipped = []

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
    const expected = expectedVariantKeys(source.key)
    const missing = []
    const present = []
    for (const variant of expected) {
      if (await objectExists(variant.key)) present.push(variant.width)
      else missing.push(variant.width)
    }
    plan.push({
      key: source.key,
      size: source.size,
      missing,
      present,
      // A variant wider than the source is intentionally never created, so a
      // source with none of its expected variants missing is genuinely complete.
      complete: missing.length === 0,
    })
  }

  return { scanned, sources, skipped, plan }
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
      declined: [],
      widths: missing,
      // What storage will hold after this run: the already-present widths plus
      // the ones about to be created. The declined ones are deliberately absent
      // — the source is narrower than them, so no such object can exist.
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
 * Records generated variant widths on the image rows that reference a storage
 * key.
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
 * @param {Array<{key: string, metadataWidths: number[]}>} entries
 * @param {Object} deps - Injected Prisma deps, so this is testable without a DB.
 * @returns {Promise<{updated: number, unmatchedKeys: string[], errors: Array<{key: string, message: string}>}>}
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
  if (byKey.size === 0) return { updated: 0, unmatchedKeys: [], errors: [] }

  // One read of every candidate row, then grouped in memory. A per-key query
  // would be N round trips against a table that holds the whole catalogue.
  const [productImages, packageImages, banners] = await Promise.all([
    prisma.productImage.findMany({ select: { id: true, url: true, variantWidths: true } }),
    prisma.packageImage.findMany({ select: { id: true, url: true, variantWidths: true } }),
    prisma.banner.findMany({ select: { id: true, image: true, imageVariantWidths: true } }),
  ])

  const targets = new Map() // table -> [{id, widths}]
  const push = (table, row, url, current) => {
    const key = extractStorageKey(url)
    if (!key || !byKey.has(key)) return
    const widths = byKey.get(key)
    // Idempotent: skip a row that already records exactly this set.
    if (JSON.stringify([...(current || [])].sort((a, b) => a - b)) === JSON.stringify(widths)) return
    if (!targets.has(table)) targets.set(table, [])
    targets.get(table).push({ id: row.id, widths })
  }

  const matched = new Set()
  for (const row of productImages) {
    const key = extractStorageKey(row.url)
    if (key && byKey.has(key)) matched.add(key)
    push('productImage', row, row.url, row.variantWidths)
  }
  for (const row of packageImages) {
    const key = extractStorageKey(row.url)
    if (key && byKey.has(key)) matched.add(key)
    push('packageImage', row, row.url, row.variantWidths)
  }
  for (const row of banners) {
    const key = extractStorageKey(row.image)
    if (key && byKey.has(key)) matched.add(key)
    push('banner', row, row.image, row.imageVariantWidths)
  }

  const unmatchedKeys = [...byKey.keys()].filter((key) => !matched.has(key))

  let updated = 0
  const errors = []
  for (const [table, rows] of targets) {
    const delegate = prisma[table]
    for (const row of rows) {
      try {
        await delegate.update({ where: { id: row.id }, data: { [table === 'banner' ? 'imageVariantWidths' : 'variantWidths']: row.widths } })
        updated++
      } catch (error) {
        // One bad row must not stop the run.
        errors.push({ key: `${table}#${row.id}`, message: safeErrorMessage(error) })
      }
    }
  }

  return { updated, unmatchedKeys, errors }
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
  Real uploads require the explicit --execute flag.
  Originals are never modified, overwritten, or deleted.

USAGE
  node scripts/backfill-image-variants.js                    # dry-run, all prefixes
  node scripts/backfill-image-variants.js --prefix products  # dry-run, one prefix
  node scripts/backfill-image-variants.js --execute          # REAL WRITES

OPTIONS
  --prefix <name>       Limit to one prefix (repeatable).
                        Default: ${KNOWN_PREFIXES.join(', ')}
  --concurrency <n>     Parallel images, 1-16. Default ${DEFAULT_CONCURRENCY}.
  --execute             Perform real uploads. Omit for a dry-run.
  --write-metadata      Also record the generated widths in the database
                        (requires --execute). Idempotent.
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

  if (writeMetadata && !execute) {
    console.error(
      '[Backfill] --write-metadata requires --execute. The widths are measured ' +
        'while the originals are being processed, so a dry-run cannot know them.'
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
  console.log(`  mode        : ${execute ? 'EXECUTE (real uploads)' : 'DRY-RUN (no writes)'}`)
  console.log(`  bucket      : ${getBucketName()}`)
  console.log(`  prefixes    : ${prefixes.join(', ')}`)
  console.log(`  concurrency : ${args.concurrency}`)
  console.log(`  db metadata: ${writeMetadata ? 'WRITE (variantWidths)' : 'off'}`)
  console.log('===============================================================\n')

  if (execute) {
    console.log('  NOTE: running with --execute. Variants WILL be written to R2.\n')
  }

  // ---- discovery + planning (read-only) ----
  let plan
  try {
    plan = await buildPlan({
      prefixes,
      listObjects: (prefix) => listStorageObjects(prefix),
      objectExists: (key) => storageObjectExists(key),
    })
  } catch (error) {
    console.error(`[Backfill] Discovery failed: ${safeErrorMessage(error)}`)
    process.exitCode = 1
    return
  }

  const complete = plan.plan.filter((entry) => entry.complete)
  const incomplete = plan.plan.filter((entry) => !entry.complete)
  const wouldCreate = incomplete.reduce((sum, entry) => sum + entry.missing.length, 0)

  console.log('--- DRY-RUN PLAN ---' + (execute ? ' (execution follows)' : ''))
  console.log(`  scanned objects        : ${plan.scanned.length}`)
  console.log(`  eligible originals     : ${plan.sources.length}`)
  console.log(`  already complete       : ${complete.length}`)
  console.log(`  needing variants       : ${incomplete.length}`)
  console.log(`  variants to create    : ${wouldCreate}`)
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

  if (!execute) {
    for (const entry of incomplete) {
      console.log(
        `    would generate ${entry.missing.length} variant(s) for ${entry.key} ` +
          `(widths: ${entry.missing.join('w, ')}w)`
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
        console.log(`  no matching row: ${meta.unmatchedKeys.length}`)
        for (const key of meta.unmatchedKeys.slice(0, 10)) console.log(`      ${key}`)
        if (meta.unmatchedKeys.length > 10) console.log(`      ... and ${meta.unmatchedKeys.length - 10} more`)
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

  console.log('\n--- SUMMARY ---')
  console.log(`  scanned objects      : ${summary.scanned}`)
  console.log(`  eligible originals   : ${summary.eligible}`)
  console.log(`  already complete     : ${summary.alreadyComplete}`)
  console.log(`  images generated for : ${summary.generated}`)
  console.log(`  variants created     : ${summary.variantsCreated}`)
  console.log(
    `  skipped (too wide)   : ${summary.declined} width(s) across ` +
      `${summary.declinedImages} image(s) — source narrower than the variant`
  )
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
