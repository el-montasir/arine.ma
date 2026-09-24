import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  isR2Configured,
  getBucketName,
  getR2Client,
} from '../src/lib/storage.js'
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const UPLOADS_ROOT = path.resolve(__dirname, '../uploads')

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles

  const files = fs.readdirSync(dirPath)
  for (const file of files) {
    if (file === '.gitkeep' || file.startsWith('.')) continue

    const fullPath = path.join(dirPath, file)
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles)
    } else {
      arrayOfFiles.push(fullPath)
    }
  }
  return arrayOfFiles
}

async function isObjectInR2(client, bucket, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false
    }
    return false
  }
}

async function migrate() {
  console.log('\n======================================================')
  console.log(' Cloudflare R2 Uploads Migration Tool')
  console.log('======================================================\n')

  if (!isR2Configured()) {
    console.error('❌ Error: Cloudflare R2 is not configured in the environment.')
    console.error('Please set the following environment variables:')
    console.error('  R2_ACCOUNT_ID')
    console.error('  R2_ACCESS_KEY_ID')
    console.error('  R2_SECRET_ACCESS_KEY')
    console.error('  R2_BUCKET_NAME (optional, defaults to "arine-media")\n')
    process.exit(1)
  }

  const bucket = getBucketName()
  const client = getR2Client()

  console.log(`Target R2 Bucket: "${bucket}"`)
  console.log(`Scanning local uploads directory: ${UPLOADS_ROOT}\n`)

  const files = getAllFiles(UPLOADS_ROOT)
  if (files.length === 0) {
    console.log('ℹ️ No local files found in server/uploads/. Migration complete.')
    return
  }

  console.log(`Found ${files.length} local files to migrate.\n`)

  let successCount = 0
  let skippedCount = 0
  let errorCount = 0
  let totalBytes = 0

  for (let i = 0; i < files.length; i++) {
    const fullPath = files[i]
    const relativePath = path.relative(UPLOADS_ROOT, fullPath).replace(/\\/g, '/')
    const key = relativePath
    const stats = fs.statSync(fullPath)
    const mimeType = getMimeType(fullPath)
    const sizeKb = (stats.size / 1024).toFixed(1)

    const prefix = `[${i + 1}/${files.length}]`

    try {
      const alreadyExists = await isObjectInR2(client, bucket, key)
      if (alreadyExists && !process.env.FORCE_OVERWRITE) {
        console.log(`${prefix} ⏩ ${key} (${sizeKb} KB) already exists in R2, skipping.`)
        skippedCount++
        continue
      }

      const buffer = fs.readFileSync(fullPath)

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      )

      console.log(`${prefix} ✅ ${key} (${sizeKb} KB, ${mimeType}) -> R2`)
      successCount++
      totalBytes += stats.size
    } catch (err) {
      console.error(`${prefix} ❌ Failed to upload ${key}:`, err.message)
      errorCount++
    }
  }

  console.log('\n======================================================')
  console.log(' Migration Summary')
  console.log('======================================================')
  console.log(`Total files scanned:   ${files.length}`)
  console.log(`Successfully uploaded: ${successCount} (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`Already in R2 (skip):  ${skippedCount}`)
  console.log(`Errors / Failed:       ${errorCount}`)
  console.log('======================================================\n')

  if (errorCount > 0) {
    process.exit(1)
  }
}

migrate().catch((err) => {
  console.error('Fatal migration error:', err)
  process.exit(1)
})
