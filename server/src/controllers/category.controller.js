import { prisma } from '../lib/prisma.js'

// GET /api/categories — with live product counts.
export async function getCategories(req, res, next) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { products: true } } },
    })
    return res.json({
      success: true,
      data: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: c._count.products,
      })),
    })
  } catch (err) {
    next(err)
  }
}