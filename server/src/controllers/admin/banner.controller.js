import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'

// GET /api/admin/banners
export async function getBannersHandler(_req, res, next) {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    return res.json({ success: true, data: banners, count: banners.length })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/banners/:id
export async function getBannerByIdHandler(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, 'INVALID_ID', 'معرف العرض غير صحيح')
    }
    const banner = await prisma.banner.findUnique({ where: { id } })
    if (!banner) {
      throw new ApiError(404, 'NOT_FOUND', 'العرض غير موجود')
    }
    return res.json({ success: true, data: banner })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/banners
export async function createBannerHandler(req, res, next) {
  try {
    const {
      title,
      description,
      image,
      link,
      type = 'promotional',
      isActive = true,
      sortOrder = 0,
      startDate,
      endDate,
    } = req.body

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new ApiError(400, 'INVALID_INPUT', 'عنوان العرض مطلوب')
    }

    const banner = await prisma.banner.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        image: image?.trim() || null,
        link: link?.trim() || null,
        type: type || 'promotional',
        isActive: Boolean(isActive),
        sortOrder: Number(sortOrder) || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء العرض بنجاح',
      data: banner,
    })
  } catch (err) {
    next(err)
  }
}

// PUT /api/admin/banners/:id
export async function updateBannerHandler(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, 'INVALID_ID', 'معرف العرض غير صحيح')
    }

    const existing = await prisma.banner.findUnique({ where: { id } })
    if (!existing) {
      throw new ApiError(404, 'NOT_FOUND', 'العرض غير موجود')
    }

    const {
      title,
      description,
      image,
      link,
      type,
      isActive,
      sortOrder,
      startDate,
      endDate,
    } = req.body

    const data = {}
    if (title !== undefined) data.title = title.trim()
    if (description !== undefined) data.description = description?.trim() || null
    if (image !== undefined) data.image = image?.trim() || null
    if (link !== undefined) data.link = link?.trim() || null
    if (type !== undefined) data.type = type
    if (isActive !== undefined) data.isActive = Boolean(isActive)
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder) || 0
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null

    const banner = await prisma.banner.update({
      where: { id },
      data,
    })

    return res.json({
      success: true,
      message: 'تم تحديث العرض بنجاح',
      data: banner,
    })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/admin/banners/:id
export async function deleteBannerHandler(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, 'INVALID_ID', 'معرف العرض غير صحيح')
    }

    await prisma.banner.delete({ where: { id } })
    return res.json({ success: true, message: 'تم حذف العرض بنجاح' })
  } catch (err) {
    next(err)
  }
}
