import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../services/admin/category.service.js'

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await listCategories()
  res.json({ success: true, data: categories })
})

export const createOne = asyncHandler(async (req, res) => {
  const category = await createCategory(req.validated)
  res.status(201).json({ success: true, data: category })
})

export const updateOne = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف التصنيف غير صحيح')
  }
  const category = await updateCategory(id, req.validated)
  res.json({ success: true, data: category })
})

export const removeOne = asyncHandler(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(res, 400, 'INVALID_ID', 'معرف التصنيف غير صحيح')
  }
  await deleteCategory(id)
  res.json({ success: true, message: 'تم حذف التصنيف' })
})