import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import { deleteFromStorage } from '../../lib/storage.js'

const INCLUDE = {
  category: true,
  images: {
    orderBy: { sortOrder: 'asc' },
  },
}

// Admin-only product shape — includes costPrice, per-unit profit, images, and shipping settings.
export function serializeAdminProduct(product) {
  const costPrice = product.costPrice ?? null
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
    categoryId: product.categoryId,
    category: product.category?.name ?? null,
    price: product.price,
    costPrice,
    profitPerUnit: costPrice != null ? product.price - costPrice : null,
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

export async function createProduct(inputData) {
  const { images: rawImages, ...data } = inputData

  // Normalize images list
  const imageUrls = Array.isArray(rawImages)
    ? rawImages
        .map((item) => (typeof item === 'string' ? item.trim() : item?.url?.trim()))
        .filter(Boolean)
    : []

  if (imageUrls.length === 0 && data.image) {
    imageUrls.push(data.image.trim())
  }

  // Set primary image to legacy image field for backwards compatibility
  if (imageUrls.length > 0) {
    data.image = imageUrls[0]
  }

  // Set discount: use explicit discount if passed, or auto-calculate from oldPrice & price
  if (data.discount !== undefined && data.discount != null) {
    data.discount = Number(data.discount)
  } else if (data.price != null) {
    const pPrice = Number(data.price)
    const pOldPrice = data.oldPrice != null ? Number(data.oldPrice) : null
    if (pOldPrice != null && Number.isFinite(pOldPrice) && pOldPrice > pPrice && pOldPrice > 0) {
      data.discount = Math.round(((pOldPrice - pPrice) / pOldPrice) * 100)
    } else {
      data.discount = 0
    }
  }

  const product = await prisma.product.create({
    data: {
      ...data,
      images:
        imageUrls.length > 0
          ? {
              create: imageUrls.map((url, idx) => ({
                url,
                sortOrder: idx,
                isPrimary: idx === 0,
              })),
            }
          : undefined,
    },
    include: INCLUDE,
  })

  return serializeAdminProduct(product)
}

export async function updateProduct(id, inputData) {
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'الكتاب غير موجود')

  const { images: rawImages, ...data } = inputData

  let imageUrls = null
  if (rawImages !== undefined) {
    imageUrls = Array.isArray(rawImages)
      ? rawImages
          .map((item) => (typeof item === 'string' ? item.trim() : item?.url?.trim()))
          .filter(Boolean)
      : []

    if (imageUrls.length > 0) {
      data.image = imageUrls[0]
    } else {
      data.image = null
    }
  }

  // Set discount: use explicit discount if passed, or auto-calculate from oldPrice & price
  if (data.discount !== undefined && data.discount != null) {
    data.discount = Number(data.discount)
  } else if (data.oldPrice !== undefined || data.price !== undefined) {
    const targetPrice = data.price !== undefined ? Number(data.price) : existing.price
    const targetOldPrice = data.oldPrice !== undefined ? (data.oldPrice != null ? Number(data.oldPrice) : null) : existing.oldPrice
    if (targetOldPrice != null && Number.isFinite(targetOldPrice) && targetPrice != null && targetOldPrice > targetPrice && targetOldPrice > 0) {
      data.discount = Math.round(((targetOldPrice - targetPrice) / targetOldPrice) * 100)
    } else {
      data.discount = 0
    }
  }

  return prisma.$transaction(async (tx) => {
    if (imageUrls !== null) {
      // Re-create images array cleanly
      await tx.productImage.deleteMany({ where: { productId: id } })
      if (imageUrls.length > 0) {
        await tx.productImage.createMany({
          data: imageUrls.map((url, idx) => ({
            productId: id,
            url,
            sortOrder: idx,
            isPrimary: idx === 0,
          })),
        })
      }
    }

    const updated = await tx.product.update({
      where: { id },
      data,
      include: INCLUDE,
    })

    return serializeAdminProduct(updated)
  })
}

export async function deleteProduct(id) {
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { images: true },
  })
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'الكتاب غير موجود')
  }

  // Collect image URLs to delete from storage
  const imagesToDelete = new Set()
  if (existing.image) imagesToDelete.add(existing.image)
  if (existing.images && Array.isArray(existing.images)) {
    existing.images.forEach((img) => {
      if (img?.url) imagesToDelete.add(img.url)
    })
  }

  await prisma.product.delete({ where: { id } })

  // Clean up storage assets safely in the background
  for (const imgUrl of imagesToDelete) {
    deleteFromStorage(imgUrl).catch(() => {})
  }

  return true
}
