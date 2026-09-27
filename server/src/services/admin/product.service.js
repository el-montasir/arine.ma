import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import { deleteFromStorage } from '../../lib/storage.js'
import {
  normalizeImageInputs,
  normalizeVariantWidths,
  pickPrimaryImageUrl,
  widthsForImageUrl,
} from '../../lib/image-metadata.js'

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
    // Round-tripped so an admin editing an unrelated field does not wipe the
    // variant metadata this image already has.
    variantWidths: normalizeVariantWidths(img.variantWidths),
    sortOrder: img.sortOrder,
    isPrimary: img.isPrimary,
  }))

  const primaryImage =
    pickPrimaryImageUrl(images, product.image)

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
    imageVariantWidths: widthsForImageUrl(images, primaryImage),
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

  // Normalize images list, KEEPING the generated variant widths. These are what
  // the storefront is cleared to advertise; a bare URL carries none, which is
  // the correct answer for a source with no variants.
  const imageList = normalizeImageInputs(rawImages)

  if (imageList.length === 0 && data.image) {
    imageList.push({ url: String(data.image).trim(), variantWidths: [], sortOrder: 0, isPrimary: true })
  }

  // Set primary image to legacy image field for backwards compatibility
  if (imageList.length > 0) {
    data.image = pickPrimaryImageUrl(imageList)
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
        imageList.length > 0
          ? {
              create: imageList.map((img) => ({
                url: img.url,
                variantWidths: img.variantWidths,
                sortOrder: img.sortOrder,
                isPrimary: img.isPrimary,
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

  let imageList = null
  if (rawImages !== undefined) {
    imageList = normalizeImageInputs(rawImages)
    data.image = pickPrimaryImageUrl(imageList)
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
    if (imageList !== null) {
      // Re-create images array cleanly. Every save rewrites the widths, so the
      // payload must carry them: the admin form round-trips what the serializer
      // gave it, which is what preserves backfilled metadata across an edit.
      await tx.productImage.deleteMany({ where: { productId: id } })
      if (imageList.length > 0) {
        await tx.productImage.createMany({
          data: imageList.map((img) => ({
            productId: id,
            url: img.url,
            variantWidths: img.variantWidths,
            sortOrder: img.sortOrder,
            isPrimary: img.isPrimary,
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
