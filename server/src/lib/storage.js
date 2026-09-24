import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads')

/**
 * Checks whether all required Cloudflare R2 credentials are provided in the environment.
 */
export function isR2Configured() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env
  return Boolean(
    R2_ACCOUNT_ID &&
    R2_ACCOUNT_ID.trim() &&
    R2_ACCESS_KEY_ID &&
    R2_ACCESS_KEY_ID.trim() &&
    R2_SECRET_ACCESS_KEY &&
    R2_SECRET_ACCESS_KEY.trim()
  )
}

/**
 * Returns the target R2 bucket name (defaults to 'arine-media').
 */
export function getBucketName() {
  return (process.env.R2_BUCKET_NAME || 'arine-media').trim()
}

let s3ClientInstance = null

/**
 * Lazily initializes and returns the S3Client configured for Cloudflare R2.
 */
export function getR2Client() {
  if (!isR2Configured()) return null

  if (!s3ClientInstance) {
    const accountId = process.env.R2_ACCOUNT_ID.trim()
    const accessKeyId = process.env.R2_ACCESS_KEY_ID.trim()
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY.trim()

    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  return s3ClientInstance
}

/**
 * Extracts the storage object key (e.g. "products/1728192-abc.jpg")
 * from an API path ("/uploads/products/123.jpg") or absolute URL.
 */
export function extractStorageKey(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return null
  const cleaned = pathOrUrl.trim()

  if (cleaned.startsWith('data:') || cleaned.startsWith('blob:')) return null

  // Match /uploads/<subfolder>/<filename>
  const match = cleaned.match(/(?:^|\/)uploads\/(.+)$/)
  if (match && match[1]) {
    return match[1].replace(/^\/+/, '')
  }

  // If already formatted as a relative subfolder key
  if (/^(products|branding|packages|banners)\//.test(cleaned)) {
    return cleaned
  }

  return null
}

/**
 * Uploads a file buffer directly to Cloudflare R2 (or local disk if R2 is unconfigured).
 *
 * @param {Object} params
 * @param {Buffer} params.buffer - File buffer in memory
 * @param {string} params.filename - Safe unique filename
 * @param {string} [params.subfolder='products'] - Subdirectory (products, packages, branding, banners)
 * @param {string} [params.mimetype='application/octet-stream'] - MIME type
 * @param {number} [params.size] - File byte size
 * @returns {Promise<{url: string, key: string, filename: string, size: number, mimetype: string, storedIn: string}>}
 */
export async function uploadToStorage({
  buffer,
  filename,
  subfolder = 'products',
  mimetype = 'application/octet-stream',
  size,
}) {
  const key = `${subfolder}/${filename}`
  const bucket = getBucketName()

  if (isR2Configured()) {
    const client = getR2Client()
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )
  } else {
    // Local filesystem fallback for dev environments lacking R2 credentials
    const targetDir = path.join(UPLOADS_ROOT, subfolder)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    const targetPath = path.join(targetDir, filename)
    await fs.promises.writeFile(targetPath, buffer)
  }

  return {
    url: `/uploads/${subfolder}/${filename}`,
    key,
    filename,
    size: size || buffer.length,
    mimetype,
    storedIn: isR2Configured() ? 'r2' : 'local',
  }
}

/**
 * Fetches an object stream from Cloudflare R2.
 * Returns null if not configured or if object is not found.
 *
 * @param {string} key - Object key (e.g. "products/abc.jpg")
 * @returns {Promise<{stream: any, contentType: string, contentLength: number, etag: string, lastModified: Date, cacheControl: string}|null>}
 */
export async function getFromStorage(key) {
  if (!key || typeof key !== 'string') return null

  const cleanKey = key.replace(/^\/?(uploads\/)?/, '')

  if (isR2Configured()) {
    try {
      const client = getR2Client()
      const command = new GetObjectCommand({
        Bucket: getBucketName(),
        Key: cleanKey,
      })
      const response = await client.send(command)
      return {
        stream: response.Body,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        etag: response.ETag,
        lastModified: response.LastModified,
        cacheControl: response.CacheControl,
      }
    } catch (err) {
      if (
        err.name === 'NoSuchKey' ||
        err.name === 'NotFound' ||
        err.$metadata?.httpStatusCode === 404
      ) {
        return null
      }
      console.warn(`[Storage] R2 getObject error for key "${cleanKey}":`, err.message)
      return null
    }
  }

  return null
}

/**
 * Deletes an object from Cloudflare R2 and removes local file if present.
 *
 * @param {string} pathOrUrlOrKey
 * @returns {Promise<boolean>}
 */
export async function deleteFromStorage(pathOrUrlOrKey) {
  const key = extractStorageKey(pathOrUrlOrKey)
  if (!key) return false

  let deleted = false

  if (isR2Configured()) {
    try {
      const client = getR2Client()
      await client.send(
        new DeleteObjectCommand({
          Bucket: getBucketName(),
          Key: key,
        })
      )
      deleted = true
    } catch (err) {
      console.warn(`[Storage] Failed to delete R2 object "${key}":`, err.message)
    }
  }

  // Also clean up local file if it exists
  try {
    const localPath = path.join(UPLOADS_ROOT, key)
    if (fs.existsSync(localPath)) {
      await fs.promises.unlink(localPath)
      deleted = true
    }
  } catch (err) {
    // Ignore local unlink errors
  }

  return deleted
}
