import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'
import { slugify } from '../../utils/slugify.js'

export function serializeCategory(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    count: category._count?.products ?? null,
  }
}

export async function listCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { id: 'asc' },
    include: { _count: { select: { products: true } } },
  })
  return categories.map(serializeCategory)
}

async function uniqueSlug(name, slug, excludeId) {
  const base = slug || slugify(name)
  let candidate = base
  let n = 2
  // Keep trying until the slug is free (collisions are rare for admin-created cats).
  for (;;) {
    const taken = await prisma.category.findUnique({ where: { slug: candidate } })
    if (!taken || taken.id === excludeId) return candidate
    candidate = `${base}-${n++}`
  }
}

export async function createCategory({ name, slug }) {
  const finalSlug = await uniqueSlug(name, slug, null)
  return prisma.category.create({ data: { name, slug: finalSlug } })
}

export async function updateCategory(id, { name, slug }) {
  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'التصنيف غير موجود')

  const data = { name, ...(slug ? { slug } : {}) }
  if (data.slug && data.slug !== existing.slug) {
    data.slug = await uniqueSlug(name ?? existing.name, data.slug, id)
  }
  return prisma.category.update({ where: { id }, data })
}

export async function deleteCategory(id) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })
  if (!category) throw new ApiError(404, 'NOT_FOUND', 'التصنيف غير موجود')
  if (category._count.products > 0) {
    throw new ApiError(
      409,
      'CATEGORY_NOT_EMPTY',
      'لا يمكن حذف تصنيف يحتوي على كتب — انقل الكتب إلى تصنيف آخر أولاً'
    )
  }
  await prisma.category.delete({ where: { id } })
  return true
}