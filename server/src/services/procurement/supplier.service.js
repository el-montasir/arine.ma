import { prisma } from '../../lib/prisma.js'
import { logActivity } from '../admin/activity-log.service.js'

/**
 * Calculate outstanding balance and totals for a single supplier.
 * Eligible purchases = non-CANCELLED purchases.
 * Balance = sum(grandTotal of non-cancelled purchases) - sum(payments) - sum(confirmed returns).
 */
export async function getSupplierFinancials(supplierId, client = prisma) {
  const [purchasesAgg, paymentsAgg, returnsAgg] = await Promise.all([
    client.purchase.aggregate({
      where: {
        supplierId,
        status: { not: 'CANCELLED' },
      },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
    client.purchasePayment.aggregate({
      where: { supplierId },
      _sum: { amount: true },
    }),
    client.purchaseReturn.aggregate({
      where: {
        supplierId,
        status: 'CONFIRMED',
      },
      _sum: { refundAmount: true },
    }),
  ])

  const totalPurchasesAmount = Number(purchasesAgg._sum.grandTotal ?? 0)
  const totalPaid = Number(paymentsAgg._sum.amount ?? 0)
  const totalRefunded = Number(returnsAgg._sum.refundAmount ?? 0)
  const totalPurchasesCount = purchasesAgg._count.id ?? 0

  const balance = Math.max(0, totalPurchasesAmount - totalPaid - totalRefunded)

  return {
    totalPurchasesAmount,
    totalPurchasesCount,
    totalPaid,
    totalRefunded,
    balance: Number(balance.toFixed(2)),
  }
}

/**
 * List suppliers with search, filters, pagination, and financial aggregates.
 */
export async function listSuppliers({
  search = '',
  isActive = undefined,
  city = '',
  sortBy = 'recent',
  page = 1,
  limit = 20,
}) {
  const skip = (page - 1) * limit
  const where = {}

  if (isActive !== undefined) {
    where.isActive = isActive
  }

  if (city && city.trim()) {
    where.city = { contains: city.trim(), mode: 'insensitive' }
  }

  if (search && search.trim()) {
    const q = search.trim()
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { contactPerson: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { whatsapp: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
  }

  let orderBy = { createdAt: 'desc' }
  if (sortBy === 'name') {
    orderBy = { name: 'asc' }
  } else if (sortBy === 'oldest') {
    orderBy = { createdAt: 'asc' }
  }

  const [suppliers, total, allSuppliersStats] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        _count: {
          select: {
            products: true,
            purchases: true,
          },
        },
        purchases: {
          take: 1,
          orderBy: { purchaseDate: 'desc' },
          select: { purchaseDate: true },
        },
      },
    }),
    prisma.supplier.count({ where }),
    getSuppliersGlobalSummary(),
  ])

  // Attach dynamic financial calculation for the returned page of suppliers
  const supplierIds = suppliers.map((s) => s.id)
  const financialsMap = new Map()

  if (supplierIds.length > 0) {
    const [purchasesBySupplier, paymentsBySupplier, returnsBySupplier] = await Promise.all([
      prisma.purchase.groupBy({
        by: ['supplierId'],
        where: {
          supplierId: { in: supplierIds },
          status: { not: 'CANCELLED' },
        },
        _sum: { grandTotal: true },
        _count: { id: true },
      }),
      prisma.purchasePayment.groupBy({
        by: ['supplierId'],
        where: { supplierId: { in: supplierIds } },
        _sum: { amount: true },
      }),
      prisma.purchaseReturn.groupBy({
        by: ['supplierId'],
        where: {
          supplierId: { in: supplierIds },
          status: 'CONFIRMED',
        },
        _sum: { refundAmount: true },
      }),
    ])

    const pMap = new Map(purchasesBySupplier.map((p) => [p.supplierId, Number(p._sum.grandTotal ?? 0)]))
    const payMap = new Map(paymentsBySupplier.map((p) => [p.supplierId, Number(p._sum.amount ?? 0)]))
    const retMap = new Map(returnsBySupplier.map((r) => [r.supplierId, Number(r._sum.refundAmount ?? 0)]))

    for (const id of supplierIds) {
      const totPurchases = pMap.get(id) || 0
      const totPaid = payMap.get(id) || 0
      const totRet = retMap.get(id) || 0
      const balance = Math.max(0, totPurchases - totPaid - totRet)
      financialsMap.set(id, {
        totalPurchasesAmount: totPurchases,
        totalPaid: totPaid,
        totalRefunded: totRet,
        balance: Number(balance.toFixed(2)),
      })
    }
  }

  const items = suppliers.map((s) => {
    const fin = financialsMap.get(s.id) || {
      totalPurchasesAmount: 0,
      totalPaid: 0,
      totalRefunded: 0,
      balance: 0,
    }
    return {
      id: s.id,
      name: s.name,
      contactPerson: s.contactPerson,
      phone: s.phone,
      whatsapp: s.whatsapp,
      email: s.email,
      city: s.city,
      address: s.address,
      notes: s.notes,
      isActive: s.isActive,
      productsCount: s._count.products,
      purchasesCount: s._count.purchases,
      lastPurchaseDate: s.purchases[0]?.purchaseDate || null,
      totalPurchases: fin.totalPurchasesAmount,
      totalPaid: fin.totalPaid,
      balance: fin.balance,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }
  })

  // In-memory sort for aggregate computed columns if requested
  if (sortBy === 'purchase_value') {
    items.sort((a, b) => b.totalPurchases - a.totalPurchases)
  } else if (sortBy === 'balance') {
    items.sort((a, b) => b.balance - a.balance)
  }

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary: allSuppliersStats,
  }
}

/**
 * Global summary stats for the suppliers top cards.
 */
export async function getSuppliersGlobalSummary() {
  const [totalSuppliers, activeSuppliers, purchasesAgg, paymentsAgg, returnsAgg] = await Promise.all([
    prisma.supplier.count(),
    prisma.supplier.count({ where: { isActive: true } }),
    prisma.purchase.aggregate({
      where: { status: { not: 'CANCELLED' } },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
    prisma.purchasePayment.aggregate({
      _sum: { amount: true },
    }),
    prisma.purchaseReturn.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { refundAmount: true },
    }),
  ])

  const totalPurchasesAmount = Number(purchasesAgg._sum.grandTotal ?? 0)
  const totalPaid = Number(paymentsAgg._sum.amount ?? 0)
  const totalRefunded = Number(returnsAgg._sum.refundAmount ?? 0)
  const outstandingBalance = Math.max(0, totalPurchasesAmount - totalPaid - totalRefunded)

  return {
    totalSuppliers,
    activeSuppliers,
    totalPurchasesCount: purchasesAgg._count.id ?? 0,
    totalPurchasesAmount: Number(totalPurchasesAmount.toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
    outstandingBalance: Number(outstandingBalance.toFixed(2)),
  }
}

/**
 * Get supplier by ID with complete relations, financial breakdown, and recent history.
 */
export async function getSupplierById(id) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              author: true,
              isbn: true,
              sku: true,
              price: true,
              currentStock: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      purchases: {
        take: 10,
        orderBy: { purchaseDate: 'desc' },
        include: {
          _count: { select: { items: true, payments: true } },
        },
      },
      payments: {
        take: 10,
        orderBy: { paymentDate: 'desc' },
        include: {
          purchase: {
            select: { id: true, purchaseNumber: true },
          },
          createdByAdmin: {
            select: { id: true, name: true, username: true },
          },
        },
      },
      returns: {
        take: 10,
        orderBy: { returnDate: 'desc' },
      },
    },
  })

  if (!supplier) return null

  const financials = await getSupplierFinancials(id)

  return {
    ...supplier,
    financials,
  }
}

/**
 * Create a new supplier.
 */
export async function createSupplier(data, actor = null, req = null) {
  const supplier = await prisma.supplier.create({
    data,
  })

  await logActivity({
    actor,
    action: 'SUPPLIER_CREATED',
    resourceType: 'SUPPLIER',
    resourceId: supplier.id,
    details: { name: supplier.name, contactPerson: supplier.contactPerson },
    req,
  })

  return supplier
}

/**
 * Update an existing supplier.
 */
export async function updateSupplier(id, data, actor = null, req = null) {
  const supplier = await prisma.supplier.update({
    where: { id },
    data,
  })

  await logActivity({
    actor,
    action: 'SUPPLIER_UPDATED',
    resourceType: 'SUPPLIER',
    resourceId: supplier.id,
    details: data,
    req,
  })

  return supplier
}

/**
 * Delete or deactivate a supplier.
 */
export async function deleteSupplier(id, actor = null, req = null) {
  const [purchasesCount, productsCount] = await Promise.all([
    prisma.purchase.count({ where: { supplierId: id } }),
    prisma.supplierProduct.count({ where: { supplierId: id } }),
  ])

  // If supplier has associated history, soft-delete by deactivating
  if (purchasesCount > 0) {
    const updated = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    })

    await logActivity({
      actor,
      action: 'SUPPLIER_UPDATED',
      resourceType: 'SUPPLIER',
      resourceId: id,
      details: { action: 'DEACTIVATED_DUE_TO_HISTORY', isActive: false },
      req,
    })

    return { deleted: false, deactivated: true, supplier: updated }
  }

  // If no purchases, we can safely delete
  await prisma.supplierProduct.deleteMany({ where: { supplierId: id } })
  const deleted = await prisma.supplier.delete({
    where: { id },
  })

  await logActivity({
    actor,
    action: 'SUPPLIER_DELETED',
    resourceType: 'SUPPLIER',
    resourceId: id,
    details: { name: deleted.name },
    req,
  })

  return { deleted: true, deactivated: false, supplier: deleted }
}

/**
 * List products linked to a specific supplier.
 */
export async function listSupplierProducts(supplierId) {
  return prisma.supplierProduct.findMany({
    where: { supplierId },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          author: true,
          sku: true,
          isbn: true,
          price: true,
          currentStock: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Link a product to a supplier or update existing price/MOQ.
 */
export async function addOrUpdateSupplierProduct(supplierId, productId, data) {
  return prisma.supplierProduct.upsert({
    where: {
      supplierId_productId: {
        supplierId,
        productId,
      },
    },
    update: {
      purchasePrice: data.purchasePrice,
      minimumOrderQuantity: data.minimumOrderQuantity ?? null,
      supplierSku: data.supplierSku ?? null,
      notes: data.notes ?? null,
      isActive: data.isActive ?? true,
    },
    create: {
      supplierId,
      productId,
      purchasePrice: data.purchasePrice,
      minimumOrderQuantity: data.minimumOrderQuantity ?? null,
      supplierSku: data.supplierSku ?? null,
      notes: data.notes ?? null,
      isActive: data.isActive ?? true,
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          author: true,
          sku: true,
          price: true,
        },
      },
    },
  })
}

/**
 * Remove a product link from a supplier.
 */
export async function removeSupplierProduct(supplierId, productId) {
  return prisma.supplierProduct.delete({
    where: {
      supplierId_productId: {
        supplierId,
        productId,
      },
    },
  })
}
