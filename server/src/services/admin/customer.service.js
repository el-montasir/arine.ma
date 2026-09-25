import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/api-error.js'

const FINANCIAL = ['CONFIRMED', 'SHIPPING', 'DELIVERED']

/**
 * Ensure existing orders have corresponding customer records if any are missing.
 */
async function syncMissingCustomersFromOrders() {
  const unlinkedOrders = await prisma.order.findMany({
    where: { customerId: null },
    select: { id: true, phone: true, fullName: true, city: true, address: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  if (unlinkedOrders.length === 0) return

  for (const order of unlinkedOrders) {
    const normalizedPhone = String(order.phone || '').trim().replace(/\s+/g, '')
    if (!normalizedPhone) continue

    let customer = await prisma.customer.findUnique({
      where: { phone: normalizedPhone },
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          fullName: order.fullName,
          phone: normalizedPhone,
          city: order.city,
          address: order.address,
          status: 'ACTIVE',
        },
      })
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { customerId: customer.id },
    }).catch(() => {})
  }
}

/**
 * List all customers with aggregated order statistics.
 */
export async function listCustomers({ search, status } = {}) {
  // Gracefully ensure historical orders are linked if any exist unlinked
  await syncMissingCustomersFromOrders().catch(() => {})

  const where = {}

  if (status && status !== 'ALL') {
    where.status = status
  }

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ]
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      orders: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return customers.map((c) => {
    const financialOrders = c.orders.filter((o) => FINANCIAL.includes(o.status))
    const totalSpent = financialOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const lastOrderAt = c.orders.length > 0 ? c.orders[0].createdAt : null

    return {
      id: c.id,
      name: c.fullName,
      fullName: c.fullName,
      phone: c.phone,
      city: c.city || '',
      address: c.address || '',
      notes: c.notes || '',
      status: c.status,
      orderCount: c.orders.length,
      confirmedOrderCount: financialOrders.length,
      totalSpent,
      lastOrderAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      recentOrders: c.orders.slice(0, 5),
    }
  }).sort((a, b) => b.totalSpent - a.totalSpent || (b.orderCount - a.orderCount))
}

/**
 * Get a single customer by ID.
 */
export async function getCustomer(id) {
  const customerId = Number(id)
  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new ApiError(400, 'INVALID_ID', 'معرف العميل غير صحيح')
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          packageItems: true,
        },
      },
    },
  })

  if (!customer) {
    throw new ApiError(404, 'NOT_FOUND', 'العميل غير موجود')
  }

  const financialOrders = customer.orders.filter((o) => FINANCIAL.includes(o.status))
  const totalSpent = financialOrders.reduce((sum, o) => sum + (o.total || 0), 0)

  return {
    id: customer.id,
    name: customer.fullName,
    fullName: customer.fullName,
    phone: customer.phone,
    city: customer.city || '',
    address: customer.address || '',
    notes: customer.notes || '',
    status: customer.status,
    orderCount: customer.orders.length,
    confirmedOrderCount: financialOrders.length,
    totalSpent,
    lastOrderAt: customer.orders.length > 0 ? customer.orders[0].createdAt : null,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    orders: customer.orders,
  }
}

/**
 * Update customer details.
 * NOTE: Historical order snapshots (fullName, phone, city, total) are preserved.
 */
export async function updateCustomer(id, data) {
  const customerId = Number(id)
  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new ApiError(400, 'INVALID_ID', 'معرف العميل غير صحيح')
  }

  const existing = await prisma.customer.findUnique({
    where: { id: customerId },
  })

  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'العميل غير موجود')
  }

  const updateData = {}

  if (data.fullName !== undefined) {
    const trimmed = String(data.fullName || '').trim()
    if (!trimmed) throw new ApiError(400, 'INVALID_NAME', 'اسم العميل مطلوب')
    updateData.fullName = trimmed
  }

  if (data.phone !== undefined) {
    const normalizedPhone = String(data.phone || '').trim().replace(/\s+/g, '')
    if (!normalizedPhone) throw new ApiError(400, 'INVALID_PHONE', 'رقم الهاتف مطلوب')

    // Check uniqueness if changing phone
    if (normalizedPhone !== existing.phone) {
      const conflict = await prisma.customer.findUnique({
        where: { phone: normalizedPhone },
      })
      if (conflict) {
        throw new ApiError(409, 'PHONE_ALREADY_EXISTS', 'رقم الهاتف مستخدم بالفعل لعميل آخر')
      }
    }
    updateData.phone = normalizedPhone
  }

  if (data.city !== undefined) {
    updateData.city = data.city ? String(data.city).trim() : null
  }

  if (data.address !== undefined) {
    updateData.address = data.address ? String(data.address).trim() : null
  }

  if (data.notes !== undefined) {
    updateData.notes = data.notes ? String(data.notes).trim() : null
  }

  if (data.status !== undefined) {
    if (!['ACTIVE', 'ARCHIVED'].includes(data.status)) {
      throw new ApiError(400, 'INVALID_STATUS', 'حالة العميل غير صحيحة')
    }
    updateData.status = data.status
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: updateData,
  })

  return updated
}

/**
 * Toggle or set customer archive status.
 */
export async function archiveCustomer(id, status = 'ARCHIVED') {
  const customerId = Number(id)
  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new ApiError(400, 'INVALID_ID', 'معرف العميل غير صحيح')
  }

  const targetStatus = status === 'ACTIVE' ? 'ACTIVE' : 'ARCHIVED'

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { status: targetStatus },
  })

  return customer
}

/**
 * Delete a customer record.
 * Associated orders will have customerId set to null (retaining full historical order snapshots).
 */
export async function deleteCustomer(id) {
  const customerId = Number(id)
  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new ApiError(400, 'INVALID_ID', 'معرف العميل غير صحيح')
  }

  const existing = await prisma.customer.findUnique({
    where: { id: customerId },
  })

  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'العميل غير موجود')
  }

  await prisma.customer.delete({
    where: { id: customerId },
  })

  return existing
}
