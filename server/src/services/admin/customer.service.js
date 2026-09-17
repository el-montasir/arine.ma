import { prisma } from '../../lib/prisma.js'

const FINANCIAL = ['CONFIRMED', 'SHIPPING', 'DELIVERED']

// Customers are derived from existing orders — there is no customer table and
// no customer data is exposed publicly. One row per phone number (the
// de-facto customer identity for COD), with the latest known name/city.
export async function listCustomers() {
  const orders = await prisma.order.findMany({
    where: { status: { in: FINANCIAL } },
    select: { fullName: true, phone: true, city: true, total: true, createdAt: true },
  })

  const byPhone = new Map()
  orders.forEach((o) => {
    const row = byPhone.get(o.phone)
    if (row) {
      row.orderCount += 1
      row.totalSpent += o.total
      if (o.createdAt > row.lastOrderAt) row.lastOrderAt = o.createdAt
    } else {
      byPhone.set(o.phone, {
        name: o.fullName,
        phone: o.phone,
        city: o.city,
        orderCount: 1,
        totalSpent: o.total,
        lastOrderAt: o.createdAt,
      })
    }
  })

  return [...byPhone.values()].sort((a, b) => b.totalSpent - a.totalSpent)
}