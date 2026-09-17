import { prisma } from '../../lib/prisma.js'
import { itemFinance } from '../../utils/admin-finance.js'

const FINANCIAL = ['CONFIRMED', 'SHIPPING', 'DELIVERED']

async function financialOrders({ from, to } = {}) {
  const where = { status: { in: FINANCIAL } }
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = from
    if (to) where.createdAt.lte = to
  }
  return prisma.order.findMany({ where, include: { items: true } })
}

export async function getProfitOverview() {
  const orders = await financialOrders()
  let revenue = 0
  let cost = 0
  let collectedShipping = 0
  let ordersCount = 0
  let costUnknownItems = 0

  orders.forEach((order) => {
    ordersCount += 1
    collectedShipping += order.shipping
    order.items.forEach((item) => {
      const f = itemFinance(item)
      revenue += f.revenue
      if (f.hasCost) cost += f.cost
      else costUnknownItems += 1
    })
  })

  const profit = costUnknownItems === 0 ? revenue - cost : null
  return {
    ordersCount,
    revenue,
    cost,
    collectedShipping,
    profit,
    profitMargin: revenue > 0 && profit != null ? Math.round((profit / revenue) * 1000) / 10 : null,
    costUnknownItems,
    profitAccurate: costUnknownItems === 0,
  }
}

export async function getProfitByProduct() {
  const orders = await financialOrders()
  const rows = new Map() // productId → { title, quantity, revenue, cost, costUnknownItems }

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const f = itemFinance(item)
      let row = rows.get(item.productId)
      if (!row) {
        row = { productId: item.productId, productTitle: item.productTitle, quantity: 0, revenue: 0, cost: 0, profit: null, costUnknownItems: 0 }
        rows.set(item.productId, row)
      }
      row.quantity += item.quantity
      row.revenue += f.revenue
      if (f.hasCost) row.cost += f.cost
      else row.costUnknownItems += 1
      // profit recomputed; null while any cost unknown
      row.profit = row.costUnknownItems === 0 ? row.revenue - row.cost : null
    })
  })

  return [...rows.values()]
    .map((r) => ({ ...r, unitProfit: r.profit != null ? Math.round((r.profit / r.quantity) * 10) / 10 : null }))
    .sort((a, b) => b.revenue - a.revenue)
}

export async function getProfitByPeriod({ from, to }) {
  const orders = await financialOrders({ from, to })
  // Group under a local day key; large spans group by month.
  const spanDays = from && to ? Math.round((to - from) / 86_400_000) : null
  const byMonth = spanDays != null && spanDays > 45

  const map = new Map()
  const toISO = (d) => d.toISOString().slice(0, 10)
  const keyOf = (d) => (byMonth ? toISO(d).slice(0, 7) : toISO(d))

  orders.forEach((order) => {
    const key = keyOf(order.createdAt)
    let row = map.get(key)
    if (!row) {
      row = { period: key, orders: 0, revenue: 0, cost: 0, profit: null, costUnknownItems: 0 }
      map.set(key, row)
    }
    row.orders += 1
    let costUnknown = 0
    order.items.forEach((item) => {
      const f = itemFinance(item)
      row.revenue += f.revenue
      if (f.hasCost) row.cost += f.cost
      else costUnknown += 1
    })
    row.costUnknownItems += costUnknown
    row.profit = row.costUnknownItems === 0 ? row.revenue - row.cost : null
  })

  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period))
}