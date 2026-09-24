import multer from 'multer'
import path from 'path'

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

// Strict file filter checking both MIME type and file extension
function imageFileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase()
  const mime = file.mimetype.toLowerCase()

  if (ALLOWED_MIME_TYPES.has(mime) && ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true)
  } else {
    const err = new Error('نوع الملف غير مدعوم. الصيغ المسموحة هي JPG، PNG، WEBP فقط.')
    err.code = 'INVALID_FILE_TYPE'
    err.status = 400
    cb(err, false)
  }
}

// 5MB limit
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Use memory storage so file buffers can be uploaded directly to Cloudflare R2
const memoryStorage = multer.memoryStorage()

export const uploadProductsMulter = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
})

export const uploadPackagesMulter = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
})

export const uploadBrandingMulter = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
})

// Error-handling wrapper middleware for multer to output clean JSON errors
export function handleMulterError(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (!err) return next()

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'حجم الملف كبير جداً. الحد الأقصى المسموح به هو 5 ميغابايت.',
            },
          })
        }
        return res.status(400).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        })
      }

      return res.status(err.status || 400).json({
        success: false,
        error: {
          code: err.code || 'UPLOAD_ERROR',
          message: err.message || 'فشل رفع الملف',
        },
      })
    })
  }
}
