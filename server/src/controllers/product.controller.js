import { prisma } from '../lib/prisma.js'
import { errorResponse } from '../utils/api-response.js'

// Shape a Prisma product row into the exact JSON shape the React frontend consumes
export function serializeProduct(product) {
  const images = (product.images || []).map((img) => ({
    id: img.id,
    url: img.url,
    sortOrder: img.sortOrder,
    isPrimary: img.isPrimary,
  }))

  const primaryImage =
    images.find((img) => img.isPrimary)?.url ||
    images[0]?.url ||
    product.image ||
    null

  return {
    id: product.id,
    title: product.title,
    author: product.author,
    category: product.category?.name ?? null,
    categoryId: product.categoryId,
    price: product.price,
    oldPrice: product.oldPrice,
    discount: product.discount,
    image: primaryImage,
    images,
    availability: product.availability,
    description: product.description,
    rating: product.rating,
    isNew: product.isNew,
    isPopular: product.isPopular,
    pages: product.pages,
    publisher: product.publisher,
    year: product.year,
    shippingMode: product.shippingMode ?? null,
    customShipping: product.customShipping ?? null,
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
      return [{ isPopular: 'desc' }, { rating: 'desc' }]
    default:
      return [{ isPopular: 'desc' }, { rating: 'desc' }]
  }
}

// GET /api/products?search=&category=&sort=
export async function getProducts(req, res, next) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : ''
    const sort = typeof req.query.sort === 'string' ? req.query.sort : ''

    const where = {}
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }
    if (category) {
      where.category = {
        OR: [
          { slug: category },
          { name: category },
          { name: { contains: category, mode: 'insensitive' } },
        ],
      }
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: buildOrderBy(sort),
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return res.json({
      success: true,
      data: products.map(serializeProduct),
      count: products.length,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/products/:id
export async function getProductById(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return errorResponse(res, 400, 'INVALID_ID', 'معرف الكتاب غير صحيح')
    }
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    })
    if (!product) {
      return errorResponse(res, 404, 'NOT_FOUND', 'الكتاب غير موجود')
    }
    return res.json({ success: true, data: serializeProduct(product) })
  } catch (err) {
    next(err)
  }
}
