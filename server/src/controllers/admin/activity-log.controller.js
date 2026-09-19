import { asyncHandler } from '../../utils/async-handler.js'
import { listActivityLogs } from '../../services/admin/activity-log.service.js'

export const getActivityLogs = asyncHandler(async (req, res) => {
  const { page, limit, actorId, action, resourceType, startDate, endDate, search } = req.query
  const result = await listActivityLogs({
    page,
    limit,
    actorId,
    action,
    resourceType,
    startDate,
    endDate,
    search,
  })
  res.json({ success: true, ...result })
})
