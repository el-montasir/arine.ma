import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'

const INCLUDE = { category: true }

// Admin-only product shape — includes costPrice and per-unit profit.
// The public store serializer in product.controller.js does NOT include these.
export function serializeAdminProduct(product) {
  const costPrice = product.costPrice ?? null
  return {
    id: product.id,
    title: product.title,
    author: product.author,
    categoryId: product.categoryId,
    category: product.category?.name ?? null,
    price: product.price,
    costPrice,
    profitPerUnit: costPrice != null ? product.price - costPrice : null,
    oldPrice: product.oldPrice,
    discount: product.discount,
    image: product.image,
    availability: product.availability,
    description: product.description,
    rating: product.rating,
    isNew: product.isNew,
    isPopular: product.isPopular,
    pages: product.pages,
    publisher: product.publisher,
    year: product.year,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

export async function listProducts(filters = {}) {
  const where = {}
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { author: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  if (filters.categoryId) where.categoryId = Number(filters.categoryId)
  if (filters.availability) where.availability = filters.availability

  const products = await prisma.product.findMany({
    where,
    include: INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
  return products.map(serializeAdminProduct)
}

export async function getProduct(id) {
  return prisma.product.findUnique({ where: { id }, include: INCLUDE })
}

export async function createProduct(data) {
  const product = await prisma.product.create({ data, include: INCLUDE })
  return serializeAdminProduct(product)
}

export async function updateProduct(id, data) {
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'الكتاب غير موجود')
  const product = await prisma.product.update({ where: { id }, data, include: INCLUDE })
  return serializeAdminProduct(product)
}

export async function deleteProduct(id) {
  try {
    await prisma.product.delete({ where: { id } })
    return true
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw new ApiError(409, 'PRODUCT_REFERENCED', 'لا يمكن حذف كتاب مسجّل في طلبات سابقة')
    }
    throw err
  }
}