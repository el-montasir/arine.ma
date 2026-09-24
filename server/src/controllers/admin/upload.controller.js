import path from 'path'
import crypto from 'crypto'
import { uploadToStorage } from '../../lib/storage.js'

function generateSafeFilename(originalname) {
  const ext = path.extname(originalname).toLowerCase()
  const randomSuffix = crypto.randomBytes(8).toString('hex')
  const timestamp = Date.now()
  return `${timestamp}-${randomSuffix}${ext}`
}

async function processAndUploadFile(file, subfolder) {
  const safeFilename = generateSafeFilename(file.originalname)
  const result = await uploadToStorage({
    buffer: file.buffer,
    filename: safeFilename,
    subfolder,
    mimetype: file.mimetype,
    size: file.size,
  })

  return {
    url: result.url,
    filename: safeFilename,
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
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
