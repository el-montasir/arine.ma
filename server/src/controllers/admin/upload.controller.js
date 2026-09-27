import path from 'path'
import crypto from 'crypto'
import { uploadToStorage } from '../../lib/storage.js'
import {
  generateImageVariants,
  generateDetailVariant,
  IMAGE_DETAIL_SIZE,
} from '../../lib/image-processing.js'

function generateSafeFilename(originalname) {
  const ext = path.extname(originalname).toLowerCase()
  const randomSuffix = crypto.randomBytes(8).toString('hex')
  const timestamp = Date.now()
  return `${timestamp}-${randomSuffix}${ext}`
}

/**
 * Generates WebP variants for an uploaded image and uploads them to storage.
 * Failures are non-fatal: variant generation errors are logged but do not
 * prevent the original upload from completing. This ensures uploads never
 * break due to image processing errors.
 *
 * @param {Buffer} originalBuffer
 * @param {string} subfolder
 * @param {string} safeFilename
 * @param {string} mimetype
 * @returns {Promise<Array<{width: number, url: string, bytes: number}>|null>}
 */
async function generateAndUploadVariants(originalBuffer, subfolder, safeFilename, mimetype) {
  try {
    const { variants } = await generateImageVariants(
      originalBuffer,
      subfolder,
      safeFilename,
      mimetype
    )

    const uploadedVariants = []
    for (const variant of variants) {
      const result = await uploadToStorage({
        buffer: variant.buffer,
        filename: variant.filename,
        subfolder,
        mimetype: 'image/webp',
        size: variant.bytes,
      })
      uploadedVariants.push({
        width: variant.width,
        url: result.url,
        bytes: result.size,
      })
    }

    return uploadedVariants
  } catch (err) {
    console.warn(`[ImageProcessing] Variant generation failed for "${safeFilename}":`, err.message)
    return null
  }
}

/**
 * Generates a detail-page optimized variant (1200px) for large images.
 * Failures are non-fatal.
 *
 * @param {Buffer} originalBuffer
 * @param {string} subfolder
 * @param {string} safeFilename
 * @returns {Promise<{url: string, bytes: number}|null>}
 */
async function generateAndUploadDetailVariant(originalBuffer, subfolder, safeFilename) {
  try {
    const variant = await generateDetailVariant(originalBuffer, subfolder, safeFilename)
    if (!variant) return null

    const result = await uploadToStorage({
      buffer: variant.buffer,
      filename: variant.filename,
      subfolder,
      mimetype: 'image/webp',
      size: variant.bytes,
    })

    return {
      url: result.url,
      bytes: result.size,
    }
  } catch (err) {
    console.warn(`[ImageProcessing] Detail variant failed for "${safeFilename}":`, err.message)
    return null
  }
}

/**
 * The variant widths that were actually written to storage for this upload.
 *
 * THIS IS THE EXISTENCE INVARIANT'S GROUND TRUTH. The storefront may only
 * advertise a srcset candidate for a width listed here, so it can never request
 * an object that was not generated. Deriving the ladder client-side from a
 * measured intrinsic width would require downloading every full-size original
 * to measure it — defeating the point of the variants — and would leave the two
 * sides free to disagree about the rule.
 *
 * Both generator results are merged here so there is ONE field to persist, and
 * `variants`/`detailVariant` are excluded from the response: they carry
 * per-variant byte counts the storefront has no use for, and shipping them in
 * every upload response just inflates it.
 *
 * @param {Array<{width: number}>|null} variants
 * @param {{url: string, bytes: number}|null} detailVariant
 * @returns {number[]} Widths ascending. Empty when generation failed or the
 *   source is narrower than the smallest variant.
 */
function collectVariantWidths(variants, detailVariant) {
  const widths = new Set()
  for (const variant of variants || []) {
    if (Number.isFinite(variant?.width)) widths.add(variant.width)
  }
  if (detailVariant) widths.add(IMAGE_DETAIL_SIZE)
  return [...widths].sort((a, b) => a - b)
}

async function processAndUploadFile(file, subfolder) {
  const safeFilename = generateSafeFilename(file.originalname)

  // Upload the original first (preserves original)
  const result = await uploadToStorage({
    buffer: file.buffer,
    filename: safeFilename,
    subfolder,
    mimetype: file.mimetype,
    size: file.size,
  })

  // Generate and upload variants (additive, non-fatal)
  const variants = await generateAndUploadVariants(
    file.buffer,
    subfolder,
    safeFilename,
    file.mimetype
  )

  // Generate detail variant (non-fatal)
  const detailVariant = await generateAndUploadDetailVariant(
    file.buffer,
    subfolder,
    safeFilename
  )

  return {
    url: result.url,
    filename: safeFilename,
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    // Widths the storefront is cleared to advertise for `url`.
    variantWidths: collectVariantWidths(variants, detailVariant),
  }
}

export async function uploadProductImages(req, res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : [])
    if (!files.length) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'لم يتم استلام أي ملف للرفع',
        },
      })
    }

    const data = await Promise.all(
      files.map((file) => processAndUploadFile(file, 'products'))
    )

    return res.status(201).json({
      success: true,
      data: data.length === 1 ? data[0] : data,
      files: data,
    })
  } catch (err) {
    next(err)
  }
}

export async function uploadPackageImages(req, res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : [])
    if (!files.length) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'لم يتم استلام أي ملف للرفع',
        },
      })
    }

    const data = await Promise.all(
      files.map((file) => processAndUploadFile(file, 'packages'))
    )

    return res.status(201).json({
      success: true,
      data: data.length === 1 ? data[0] : data,
      files: data,
    })
  } catch (err) {
    next(err)
  }
}

export async function uploadBrandingLogo(req, res, next) {
  try {
    let file = req.file
    if (!file && req.files) {
      if (Array.isArray(req.files) && req.files.length > 0) {
        file = req.files[0]
      } else if (typeof req.files === 'object') {
        const allFiles = Object.values(req.files).flat()
        if (allFiles.length > 0) {
          file = allFiles[0]
        }
      }
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'لم يتم استلام أي ملف شعار للرفع',
        },
      })
    }

    const data = await processAndUploadFile(file, 'branding')

    return res.status(201).json({
      success: true,
      data,
      files: [data],
    })
  } catch (err) {
    next(err)
  }
}
