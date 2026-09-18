import path from 'path'

function formatFileResponse(file, subfolder) {
  const relativeUrl = `/uploads/${subfolder}/${file.filename}`
  return {
    url: relativeUrl,
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
  }
}

export function uploadProductImages(req, res) {
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const data = req.files.map((f) => formatFileResponse(f, 'products'))
    return res.status(201).json({
      success: true,
      data: data.length === 1 ? data[0] : data,
      files: data,
    })
  }

  if (req.file) {
    const data = formatFileResponse(req.file, 'products')
    return res.status(201).json({
      success: true,
      data,
      files: [data],
    })
  }

  return res.status(400).json({
    success: false,
    error: {
      code: 'NO_FILE_UPLOADED',
      message: 'لم يتم استلام أي ملف للرفع',
    },
  })
}

export function uploadPackageImages(req, res) {
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const data = req.files.map((f) => formatFileResponse(f, 'packages'))
    return res.status(201).json({
      success: true,
      data: data.length === 1 ? data[0] : data,
      files: data,
    })
  }

  if (req.file) {
    const data = formatFileResponse(req.file, 'packages')
    return res.status(201).json({
      success: true,
      data,
      files: [data],
    })
  }

  return res.status(400).json({
    success: false,
    error: {
      code: 'NO_FILE_UPLOADED',
      message: 'لم يتم استلام أي ملف للرفع',
    },
  })
}

export function uploadBrandingLogo(req, res) {
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

  if (file) {
    const data = formatFileResponse(file, 'branding')
    return res.status(201).json({
      success: true,
      data,
      files: [data],
    })
  }

  return res.status(400).json({
    success: false,
    error: {
      code: 'NO_FILE_UPLOADED',
      message: 'لم يتم استلام أي ملف شعار للرفع',
    },
  })
}
