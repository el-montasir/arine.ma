import { asyncHandler } from '../../utils/async-handler.js'
import { getDashboardStats } from '../../services/admin/dashboard.service.js'

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await getDashboardStats()
  res.json({ success: true, data })
})