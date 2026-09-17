// Admin-only profit math. All money is whole Moroccan dirhams (integers),
// consistent with the store's pricing and the OrderItem unitPrice snapshot.
//
// Honesty rule for legacy orders: orders created before cost tracking have
// unitCostPrice = NULL. We never fabricate a cost for them. Aggregations keep
// using all revenue, report the known cost, and expose `costUnknownItems` so
// the UI can flag the profit as an estimate instead of presenting it as exact.

export function itemFinance(item) {
  const revenue = item.unitPrice * item.quantity
  const hasCost = item.unitCostPrice != null
  const cost = hasCost ? item.unitCostPrice * item.quantity : null
  return {
    revenue,
    cost,
    lineProfit: hasCost ? revenue - cost : null,
    hasCost,
  }
}

// Returns the order's items enriched with per-line finance plus order totals.
export function orderFinance(order) {
  let revenue = 0
  let cost = 0
  let costUnknownItems = 0

  const items = order.items.map((item) => {
    const f = itemFinance(item)
    revenue += f.revenue
    if (f.hasCost) {
      cost += f.cost
    } else {
      costUnknownItems += 1
    }
    return { ...item, ...f }
  })

  return {
    items,
    revenue, // goods revenue (sum of selling-price sold)
    cost, // known purchase cost
    costUnknownItems,
    profit: costUnknownItems === 0 ? revenue - cost : null, // null = incomplete
  }
}