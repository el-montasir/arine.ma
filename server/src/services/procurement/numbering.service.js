/**
 * Generates sequential, padded document numbers for Purchases and Returns.
 * Combined with Prisma unique constraints and transaction retries, this guarantees
 * race-safe, collision-free numbers like PUR-000001 and RET-000001.
 */

export async function generatePurchaseNumber(tx) {
  const latest = await tx.purchase.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true, purchaseNumber: true },
  })
  let nextNum = (latest?.id ?? 0) + 1
  if (latest?.purchaseNumber?.startsWith('PUR-')) {
    const parsed = parseInt(latest.purchaseNumber.replace('PUR-', ''), 10)
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1
    }
  }
  return `PUR-${String(nextNum).padStart(6, '0')}`
}

export async function generateReturnNumber(tx) {
  const latest = await tx.purchaseReturn.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true, returnNumber: true },
  })
  let nextNum = (latest?.id ?? 0) + 1
  if (latest?.returnNumber?.startsWith('RET-')) {
    const parsed = parseInt(latest.returnNumber.replace('RET-', ''), 10)
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1
    }
  }
  return `RET-${String(nextNum).padStart(6, '0')}`
}
