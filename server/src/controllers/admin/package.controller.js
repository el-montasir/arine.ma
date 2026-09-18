import { asyncHandler } from '../../utils/async-handler.js'
import { errorResponse } from '../../utils/api-response.js'
import {
  listPackages,
  getPackage,
  createPackage,
  updatePackage,
  deletePackage,
} from '../../services/admin/package.service.js'

function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export const getAdminPackages = asyncHandler(async (req, res) => {
  const packages = await listPackages({
    search: req.query.search?.trim() || '',
    availability: req.query.availability?.trim() || '',
  })
  res.json({ success: true, data: packages, count: packages.length })
})

export const getAdminPackageById = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'معرف الباقة غير صحيح')
  const pkg = await getPackage(id)
  if (!pkg) return errorResponse(res, 404, 'NOT_FOUND', 'الباقة غير موجودة')
  res.json({ success: true, data: pkg })
})

export const createAdminPackage = asyncHandler(async (req, res) => {
  const pkg = await createPackage(req.body)
  res.status(201).json({ success: true, data: pkg })
})

export const updateAdminPackage = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'معرف الباقة غير صحيح')
  const pkg = await updatePackage(id, req.body)
  res.json({ success: true, data: pkg })
})

export const deleteAdminPackage = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'معرف الباقة غير صحيح')
  await deletePackage(id)
  res.json({ success: true, message: 'تم حذف الباقة بنجاح' })
})
