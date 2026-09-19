import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../services/admin/category.service.js'
import { logActivity } from '../../services/admin/activity-log.service.js'

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await listCategories()
  res.json({ success: true, data: categories })
})

export const createOne = asyncHandler(async (req, res) => {
  const category = await createCategory(req.validated)

  await logActivity({
    actor: req.admin,
    action: 'CATEGORY_CREATED',
    resourceType: 'CATEGORY',
    resourceId: category.id,
    details: { name: category.name, slug: category.slug, color: category.color },
    req,
  })

  res.status(201).json({ success: true, data: category })
})

export const updateOne = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف التصنيف غير صحيح')
  }
  const category = await updateCategory(id, req.validated)

  await logActivity({
    actor: req.admin,
    action: 'CATEGORY_UPDATED',
    resourceType: 'CATEGORY',
    resourceId: id,
    details: { name: category.name, slug: category.slug, color: category.color },
    req,
  })

  res.json({ success: true, data: category })
})

export const removeOne = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف التصنيف غير صحيح')
  }
  await deleteCategory(id)

  await logActivity({
    actor: req.admin,
    action: 'CATEGORY_DELETED',
    resourceType: 'CATEGORY',
    resourceId: id,
    req,
  })

  res.json({ success: true, message: 'تم حذف التصنيف' })
})