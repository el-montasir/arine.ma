import { asyncHandler } from '../../utils/async-handler.js'
import { listSettings, upsertSetting } from '../../services/admin/setting.service.js'

export const getSettings = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await listSettings() })
})

export const updateSetting = asyncHandler(async (req, res) => {
  const setting = await upsertSetting(req.validated.key, req.validated.value)
  res.json({ success: true, data: { [setting.key]: setting.value } })
})