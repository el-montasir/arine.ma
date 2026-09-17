import { asyncHandler } from '../../utils/async-handler.js'
import { listCustomers } from '../../services/admin/customer.service.js'

export const getCustomers = asyncHandler(async (req, res) => {
  const customers = await listCustomers()
  res.json({ success: true, data: customers, count: customers.length })
})