import { prisma } from '../lib/prisma.js'
import { errorResponse } from '../utils/api-response.js'
import {
  normalizeVariantWidths,
  pickPrimaryImageUrl,
  widthsForImageUrl,
} from '../lib/image-metadata.js'

const STOCK_ENABLED = process.env.STOCK_MANAGEMENT_ENABLED === 'true'

function productStockFields(p) {
  if (!STOCK_ENABLED || !p.trackStock) return { canPurchase: true, stockStatus: 'untracked' }
  const stock = p.currentStock ?? 0
  const threshold = p.lowStockThreshold ?? 5
  if (stock <= 0) return { canPurchase: false, stockStatus: 'out' }
  if (stock <= threshold) return { canPurchase: true, stockStatus: 'low' }
  return { canPurchase: true, stockStatus: 'ok' }
}

export function serializePublicPackage(pkg) {
  const images = (pkg.images || []).map((img) => ({
    id: img.id,
    url: img.url,
    variantWidths: normalizeVariantWidths(img.variantWidths),
    sortOrder: img.sortOrder,
    isPrimary: img.isPrimary,
  }))

  const primaryImage = pickPrimaryImageUrl(images, pkg.image)

  const books = (pkg.items || []).map((item) => {
    const p = item.product
    const bookImages = (p?.images || []).map((img) => ({
      id: img.id,
      url: img.url,
      variantWidths: normalizeVariantWidths(img.variantWidths),
      sortOrder: img.sortOrder,
      isPrimary: img.isPrimary,
    }))
    const bookPrimaryImage = pickPrimaryImageUrl(bookImages, p?.image)

    return {
      id: p.id,
      title: p.title,
      author: p.author,
      price: p.price,
      oldPrice: p.oldPrice,
      category: p.category?.name ?? null,
      image: bookPrimaryImage,
      imageVariantWidths: widthsForImageUrl(bookImages, bookPrimaryImage),
      availability: p.availability,
      sortOrder: item.sortOrder,
      componentQuantity: item.quantity ?? 1,
      ...productStockFields(p),
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

  const pkgCanPurchase = books.every((b) => b.canPurchase)
  const pkgStockStatus = !pkgCanPurchase ? 'out' : books.some((b) => b.stockStatus === 'low') ? 'low' : 'ok'

  return {
    id: pkg.id,
    title: pkg.title,
    description: pkg.description,
    price: pkg.price,
    oldPrice: effectiveOldPrice,
    discount,
    image: primaryImage,
    imageVariantWidths: widthsForImageUrl(images, primaryImage),
    images,
    availability: pkg.availability,
    isNew: pkg.isNew,
    isPopular: pkg.isPopular,
    shippingMode: pkg.shippingMode ?? null,
    customShipping: pkg.customShipping ?? null,
    booksCount: books.length,
    books,
    sumBooksPrice,
    canPurchase: STOCK_ENABLED ? pkgCanPurchase : true,
    stockStatus: STOCK_ENABLED ? pkgStockStatus : 'untracked',
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
