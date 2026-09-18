import { prisma } from '../lib/prisma.js'

// GET /api/banners - Public endpoint for active banners
export async function getActiveBanners(req, res, next) {
  try {
    const type = typeof req.query.type === 'string' ? req.query.type.trim() : ''
    const now = new Date()

    const where = {
      isActive: true,
      AND: [
        {
          OR: [{ startDate: null }, { startDate: { lte: now } }],
        },
        {
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      ],
    }

    if (type) {
      where.type = type
    }

    const banners = await prisma.banner.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return res.json({ success: true, data: banners, count: banners.length })
  } catch (err) {
    next(err)
  }
}
