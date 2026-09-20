import { prisma } from '../lib/prisma.js'
import { errorResponse } from '../utils/api-response.js'

export function serializePublicPackage(pkg) {
  const images = (pkg.images || []).map((img) => ({
    id: img.id,
    url: img.url,
    sortOrder: img.sortOrder,
    isPrimary: img.isPrimary,
  }))

  const primaryImage =
    images.find((img) => img.isPrimary)?.url ||
    images[0]?.url ||
    pkg.image ||
    null

  const books = (pkg.items || []).map((item) => {
    const p = item.product
    const bookImages = (p?.images || []).map((img) => ({
      id: img.id,
      url: img.url,
      sortOrder: img.sortOrder,
      isPrimary: img.isPrimary,
    }))
    const bookPrimaryImage =
      bookImages.find((img) => img.isPrimary)?.url ||
      bookImages[0]?.url ||
      p?.image ||
      null

    return {
      id: p.id,
      title: p.title,
      author: p.author,
      price: p.price,
      oldPrice: p.oldPrice,
      category: p.category?.name ?? null,
      image: bookPrimaryImage,
      availability: p.availability,
      sortOrder: item.sortOrder,
    }
  })

  const sumBooksPrice = books.reduce((acc, b) => acc + (Number(b.price) || 0), 0)
  const effectiveOldPrice = pkg.oldPrice ?? (sumBooksPrice > pkg.price ? sumBooksPrice : null)
  let discount = 0
  if (
    effectiveOldPrice &&
    Number.isFinite(effectiveOldPrice) &&
    effectiveOldPrice > pkg.price &&
    Number.isFinite(pkg.price) &&
    pkg.price >= 0
  ) {
    discount = Math.max(
      0,
      Math.min(100, Math.round(((effectiveOldPrice - pkg.price) / effectiveOldPrice) * 100))
    )
  }

  return {
    id: pkg.id,
    title: pkg.title,
    description: pkg.description,
    price: pkg.price,
    oldPrice: effectiveOldPrice,
    discount,
    image: primaryImage,
    images,
    availability: pkg.availability,
    isNew: pkg.isNew,
    isPopular: pkg.isPopular,
    shippingMode: pkg.shippingMode ?? null,
    customShipping: pkg.customShipping ?? null,
    booksCount: books.length,
    books,
    sumBooksPrice,
  }
}

function buildOrderBy(sort) {
  switch (sort) {
    case 'price-asc':
      return [{ price: 'asc' }]
    case 'price-desc':
      return [{ price: 'desc' }]
    case 'newest':
      return [{ isNew: 'desc' }, { createdAt: 'desc' }]
    case 'popular':
      return [{ isPopular: 'desc' }, { createdAt: 'desc' }]
    default:
      return [{ isPopular: 'desc' }, { createdAt: 'desc' }]
  }
}

// GET /api/packages
export async function getPackages(req, res, next) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const sort = typeof req.query.sort === 'string' ? req.query.sort : ''

    const where = {}
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const packages = await prisma.package.findMany({
      where,
      orderBy: buildOrderBy(sort),
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                images: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return res.json({
      success: true,
      data: packages.map(serializePublicPackage),
      count: packages.length,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/packages/:id
export async function getPackageById(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return errorResponse(res, 400, 'INVALID_ID', 'معرف الباقة غير صحيح')
    }

    const pkg = await prisma.package.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                images: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!pkg) {
      return errorResponse(res, 404, 'NOT_FOUND', 'الباقة غير موجودة')
    }

    return res.json({
      success: true,
      data: serializePublicPackage(pkg),
    })
  } catch (err) {
    next(err)
  }
}
