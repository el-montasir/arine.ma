/**
 * Pure aggregation logic for stock calculations.
 * No database access — all functions are deterministic given their inputs.
 */

/**
 * Calculate how many package units can be fulfilled given current stock levels.
 * For each component, capacity = floor(currentStock / requiredQty).
 * Package capacity = min of all component capacities.
 *
 * @param {Array<{productId, quantity, currentStock, trackStock}>} components
 * @returns {number} max fulfillable package units (Infinity if no tracked components)
 */
export function packageCapacity(components) {
  const tracked = components.filter((c) => c.trackStock)
  if (tracked.length === 0) return Infinity
  return Math.min(...tracked.map((c) => Math.floor(c.currentStock / c.quantity)))
}

/**
 * Given a product or package, compute the derived storefront stock status.
 * @param {object} opts
 * @param {boolean} opts.trackStock
 * @param {number}  opts.currentStock
 * @param {number}  opts.lowStockThreshold
 * @param {string}  opts.availability - existing availability string ('in-stock', 'out-of-stock', 'pre-order')
 * @param {boolean} opts.stockManagementEnabled - global feature flag
 * @returns {{ stockStatus: string, canPurchase: boolean }}
 */
export function deriveStockStatus({ trackStock, currentStock, lowStockThreshold, availability, stockManagementEnabled }) {
  if (!stockManagementEnabled || !trackStock) {
    return {
      stockStatus: availability,
      canPurchase: availability !== 'out-of-stock',
    }
  }

  if (currentStock <= 0) {
    return { stockStatus: 'out-of-stock', canPurchase: false }
  }
  if (currentStock <= lowStockThreshold) {
    return { stockStatus: 'low-stock', canPurchase: true }
  }
  return { stockStatus: 'in-stock', canPurchase: true }
}

/**
 * Build the list of stock deductions required to confirm an order.
 * For book items: deduct quantity per orderItem.
 * For package items: deduct quantity * componentQty per tracked component product.
 * Prefers packageOrderItem.itemsSnapshot (immutable snapshot at order creation)
 * over live package relations.
 *
 * Returns an array of { productId, delta (negative) }.
 * Multiple entries for the same productId are merged into one deduction.
 *
 * @param {Array} orderItems - [{ productId, quantity, product?: { trackStock } }]
 * @param {Array} packageItems - [{ quantity, itemsSnapshot?, package?: { items: [{ productId, quantity, product? }] } }]
 * @param {Map<number, object>|null} [productMap] - Optional map of productId -> { trackStock }
 * @returns {Array<{ productId: number, delta: number }>}
 */
export function buildDeductions(orderItems = [], packageItems = [], productMap = null) {
  const map = new Map()

  const addDeduction = (productId, qty) => {
    if (!productId || !qty || qty <= 0) return
    map.set(productId, (map.get(productId) ?? 0) - qty)
  }

  for (const item of orderItems || []) {
    const isTracked = item.product?.trackStock ?? productMap?.get(item.productId)?.trackStock
    if (isTracked && item.productId) {
      addDeduction(item.productId, item.quantity)
    }
  }

  for (const pkgItem of packageItems || []) {
    const snapshot = Array.isArray(pkgItem.itemsSnapshot) && pkgItem.itemsSnapshot.length > 0
      ? pkgItem.itemsSnapshot
      : null

    if (snapshot) {
      for (const comp of snapshot) {
        if (!comp.productId) continue
        const isTracked = comp.product?.trackStock ?? productMap?.get(comp.productId)?.trackStock
        if (isTracked) {
          const compQty = comp.componentQuantity ?? comp.quantity ?? 1
          addDeduction(comp.productId, pkgItem.quantity * compQty)
        }
      }
    } else {
      const components = pkgItem.package?.items ?? []
      for (const comp of components) {
        if (!comp.productId) continue
        const isTracked = comp.product?.trackStock ?? productMap?.get(comp.productId)?.trackStock
        if (isTracked) {
          const compQty = comp.quantity ?? comp.componentQuantity ?? 1
          addDeduction(comp.productId, pkgItem.quantity * compQty)
        }
      }
    }
  }

  return Array.from(map.entries())
    .filter(([, delta]) => delta !== 0)
    .map(([productId, delta]) => ({ productId, delta }))
}

/**
 * Validate that all deductions can be applied without going below 0.
 * @param {Array<{ productId, delta }>} deductions
 * @param {Map<number, number>} stockMap - productId -> currentStock
 * @param {boolean} allowOverselling
 * @returns {{ valid: boolean, conflicts: Array<{ productId, available, requested }> }}
 */
export function validateDeductions(deductions, stockMap, allowOverselling) {
  if (allowOverselling) return { valid: true, conflicts: [] }

  const conflicts = []
  for (const { productId, delta } of deductions) {
    const available = stockMap.get(productId) ?? 0
    const requested = Math.abs(delta)
    if (available < requested) {
      conflicts.push({ productId, available, requested })
    }
  }
  return { valid: conflicts.length === 0, conflicts }
}
