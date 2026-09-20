import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'

const INCLUDE = {
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
}

export function calculatePackageDiscount(originalPrice, sellingPrice) {
  if (originalPrice == null || sellingPrice == null) return 0
  const original = Number(originalPrice)
  const selling = Number(sellingPrice)

  if (!Number.isFinite(original) || original <= 0) return 0
  if (!Number.isFinite(selling) || selling < 0) return 0
  if (selling >= original) return 0

  const discount = Math.round(((original - selling) / original) * 100)
  return Math.max(0, Math.min(100, discount))
}

export function serializeAdminPackage(pkg) {
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
      costPrice: p.costPrice ?? null,
      category: p.category?.name ?? null,
      image: bookPrimaryImage,
      availability: p.availability,
      sortOrder: item.sortOrder,
    }
  })

  const sumBooksPrice = books.reduce((acc, b) => acc + (Number(b.price) || 0), 0)
  const costPrice = pkg.costPrice ?? null
  const profitPerUnit = costPrice != null ? pkg.price - costPrice : null
  const effectiveOldPrice = pkg.oldPrice ?? (sumBooksPrice > pkg.price ? sumBooksPrice : null)
  const discount = calculatePackageDiscount(effectiveOldPrice, pkg.price)

  return {
    id: pkg.id,
    title: pkg.title,
    description: pkg.description,
    price: pkg.price,
    costPrice,
    profitPerUnit,
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
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  }
}

export async function listPackages(filters = {}) {
  const where = {}
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  if (filters.availability) where.availability = filters.availability

  const packages = await prisma.package.findMany({
    where,
    include: INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
  return packages.map(serializeAdminPackage)
}

export async function getPackage(id) {
  const pkg = await prisma.package.findUnique({
    where: { id: Number(id) },
    include: INCLUDE,
  })
  if (!pkg) return null
  return serializeAdminPackage(pkg)
}

export async function createPackage(inputData) {
  const { images: rawImages, bookIds, items: rawItems, ...data } = inputData

  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    throw ApiError.badRequest('عنوان الباقة مطلوب')
  }
  if (typeof data.price !== 'number' || Number.isNaN(data.price) || data.price < 0) {
    throw ApiError.badRequest('سعر الباقة غير صحيح')
  }

  // Determine book IDs
  let selectedBookIds = []
  if (Array.isArray(bookIds)) {
    selectedBookIds = bookIds.map(Number).filter(Boolean)
  } else if (Array.isArray(rawItems)) {
    selectedBookIds = rawItems.map((item) => Number(item.productId || item.id)).filter(Boolean)
  }

  // Validate existing books and compute total retail value
  let sumBooksPrice = 0
  if (selectedBookIds.length > 0) {
    const existingBooks = await prisma.product.findMany({
      where: { id: { in: selectedBookIds } },
      select: { id: true, price: true },
    })
    const booksMap = new Map(existingBooks.map((b) => [b.id, b]))
    selectedBookIds = selectedBookIds.filter((id) => booksMap.has(id))
    sumBooksPrice = selectedBookIds.reduce((sum, id) => sum + (Number(booksMap.get(id)?.price) || 0), 0)
  }

  const sellingPrice = Math.round(data.price)
  const effectiveOldPrice =
    data.oldPrice != null && Number(data.oldPrice) > 0
      ? Math.round(Number(data.oldPrice))
      : sumBooksPrice > 0
      ? sumBooksPrice
      : null

  // Calculate discount automatically from original price and selling price
  const discount = calculatePackageDiscount(effectiveOldPrice, sellingPrice)

  // Normalize images to standard array of objects
  let imagesList = []
  if (Array.isArray(rawImages)) {
    imagesList = rawImages
      .map((img, idx) => {
        if (typeof img === 'string') {
          return { url: img.trim(), isPrimary: idx === 0, sortOrder: idx }
        }
        if (img && typeof img.url === 'string') {
          return {
            url: img.url.trim(),
            isPrimary: Boolean(img.isPrimary ?? idx === 0),
            sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : idx,
          }
        }
        return null
      })
      .filter((img) => Boolean(img && img.url))
  }

  const primaryImageUrl =
    imagesList.find((img) => img.isPrimary)?.url ||
    imagesList[0]?.url ||
    (typeof data.image === 'string' ? data.image.trim() : null) ||
    null

  const created = await prisma.package.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      price: sellingPrice,
      costPrice: data.costPrice != null ? Math.round(data.costPrice) : null,
      oldPrice: effectiveOldPrice,
      discount,
      image: primaryImageUrl,
      availability: data.availability || 'in-stock',
      isNew: Boolean(data.isNew),
      isPopular: Boolean(data.isPopular),
      shippingMode: data.shippingMode || null,
      customShipping: data.customShipping != null ? Math.round(data.customShipping) : null,
      items: {
        create: selectedBookIds.map((bookId, idx) => ({
          productId: bookId,
          sortOrder: idx,
        })),
      },
      images: {
        create: imagesList.map((img, idx) => ({
          url: img.url,
          sortOrder: img.sortOrder,
          isPrimary: Boolean(img.isPrimary) || (idx === 0 && !imagesList.some((i) => i.isPrimary)),
        })),
      },
    },
    include: INCLUDE,
  })

  return serializeAdminPackage(created)
}

export async function updatePackage(id, inputData) {
  const pkgId = Number(id)
  const existing = await prisma.package.findUnique({
    where: { id: pkgId },
    include: INCLUDE,
  })
  if (!existing) {
    throw ApiError.notFound('الباقة غير موجودة')
  }

  const { images: rawImages, bookIds, items: rawItems, ...data } = inputData

  // Process book associations if provided
  let hasBookChanges = false
  let selectedBookIds = []
  let sumBooksPrice = (existing.items || []).reduce(
    (acc, item) => acc + (Number(item.product?.price) || 0),
    0
  )

  if (Array.isArray(bookIds)) {
    hasBookChanges = true
    selectedBookIds = bookIds.map(Number).filter(Boolean)
  } else if (Array.isArray(rawItems)) {
    hasBookChanges = true
    selectedBookIds = rawItems.map((item) => Number(item.productId || item.id)).filter(Boolean)
  }

  if (hasBookChanges) {
    // Validate
    const validBooks = await prisma.product.findMany({
      where: { id: { in: selectedBookIds } },
      select: { id: true, price: true },
    })
    const booksMap = new Map(validBooks.map((b) => [b.id, b]))
    selectedBookIds = selectedBookIds.filter((bId) => booksMap.has(bId))
    sumBooksPrice = selectedBookIds.reduce((sum, id) => sum + (Number(booksMap.get(id)?.price) || 0), 0)
  }

  const sellingPrice = data.price !== undefined ? Math.round(Number(data.price)) : existing.price
  if (data.price !== undefined && (Number.isNaN(sellingPrice) || sellingPrice < 0)) {
    throw ApiError.badRequest('سعر الباقة غير صحيح')
  }

  let effectiveOldPrice
  if (data.oldPrice !== undefined) {
    effectiveOldPrice =
      data.oldPrice != null && Number(data.oldPrice) > 0
        ? Math.round(Number(data.oldPrice))
        : sumBooksPrice > 0
        ? sumBooksPrice
        : null
  } else if (hasBookChanges && !existing.oldPrice) {
    effectiveOldPrice = sumBooksPrice > 0 ? sumBooksPrice : null
  } else {
    effectiveOldPrice = existing.oldPrice ?? (sumBooksPrice > 0 ? sumBooksPrice : null)
  }

  // Calculate discount automatically from original price and selling price
  const calculatedDiscount = calculatePackageDiscount(effectiveOldPrice, sellingPrice)

  const updateData = {
    discount: calculatedDiscount,
  }

  if (data.title !== undefined) updateData.title = data.title.trim()
  if (data.description !== undefined) updateData.description = data.description?.trim() || null
  if (data.price !== undefined) updateData.price = sellingPrice
  if (data.costPrice !== undefined) updateData.costPrice = data.costPrice != null ? Math.round(data.costPrice) : null
  if (data.oldPrice !== undefined || effectiveOldPrice !== existing.oldPrice) {
    updateData.oldPrice = effectiveOldPrice
  }
  if (data.availability !== undefined) updateData.availability = data.availability
  if (data.isNew !== undefined) updateData.isNew = Boolean(data.isNew)
  if (data.isPopular !== undefined) updateData.isPopular = Boolean(data.isPopular)
  if (data.shippingMode !== undefined) updateData.shippingMode = data.shippingMode || null
  if (data.customShipping !== undefined) {
    updateData.customShipping = data.customShipping != null ? Math.round(data.customShipping) : null
  }

  // Process images if provided
  const hasImageChanges = Array.isArray(rawImages)
  let imagesList = []
  if (hasImageChanges) {
    imagesList = rawImages
      .map((img, idx) => {
        if (typeof img === 'string') {
          return { url: img.trim(), isPrimary: idx === 0, sortOrder: idx }
        }
        if (img && typeof img.url === 'string') {
          return {
            url: img.url.trim(),
            isPrimary: Boolean(img.isPrimary ?? idx === 0),
            sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : idx,
          }
        }
        return null
      })
      .filter((img) => Boolean(img && img.url))

    const primaryImg =
      imagesList.find((img) => img.isPrimary)?.url ||
      imagesList[0]?.url ||
      null
    if (primaryImg) updateData.image = primaryImg
  }

  await prisma.$transaction(async (tx) => {
    if (hasBookChanges) {
      await tx.packageItem.deleteMany({ where: { packageId: pkgId } })
      if (selectedBookIds.length > 0) {
        await tx.packageItem.createMany({
          data: selectedBookIds.map((bookId, idx) => ({
            packageId: pkgId,
            productId: bookId,
            sortOrder: idx,
          })),
        })
      }
    }

    if (hasImageChanges) {
      await tx.packageImage.deleteMany({ where: { packageId: pkgId } })
      if (imagesList.length > 0) {
        await tx.packageImage.createMany({
          data: imagesList.map((img, idx) => ({
            packageId: pkgId,
            url: img.url,
            sortOrder: img.sortOrder,
            isPrimary: Boolean(img.isPrimary) || (idx === 0 && !imagesList.some((i) => i.isPrimary)),
          })),
        })
      }
    }

    if (Object.keys(updateData).length > 0) {
      await tx.package.update({
        where: { id: pkgId },
        data: updateData,
      })
    }
  })

  const updated = await prisma.package.findUnique({
    where: { id: pkgId },
    include: INCLUDE,
  })

  return serializeAdminPackage(updated)
}

export async function deletePackage(id) {
  const pkgId = Number(id)
  const existing = await prisma.package.findUnique({ where: { id: pkgId } })
  if (!existing) {
    throw ApiError.notFound('الباقة غير موجودة')
  }

  await prisma.package.delete({ where: { id: pkgId } })
  return { success: true }
}
