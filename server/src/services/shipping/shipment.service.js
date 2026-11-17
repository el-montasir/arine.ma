import { prisma } from '../../lib/prisma.js'
import { getParcel } from './digylog.client.js'
import { applyStockAndUpdateOrderStatus } from '../stock/stock.service.js'
import { logActivity } from '../admin/activity-log.service.js'

// DIGYLOG status ids (GET /statuses) that move the order in the panel.
// Everything else (postponed, unreachable, in a hub…) is shown, not applied.
const DELIVERED_IDS = new Set([6, 45]) // Livrée, Livrée *
const RETURNED_IDS = new Set([8]) // Retournée (back with the seller)
const CANCELLED_IDS = new Set([7, 25, 46, 52]) // Annulée (by courier / call centre / FC)
const NOT_MOVING_IDS = new Set([0, 13]) // Non envoyée, Supprimée

export function targetStatusFor(statusId) {
  if (statusId == null) return null
  if (DELIVERED_IDS.has(statusId)) return 'DELIVERED'
  if (RETURNED_IDS.has(statusId)) return 'RETURNED'
  if (CANCELLED_IDS.has(statusId)) return 'CANCELLED'
  if (NOT_MOVING_IDS.has(statusId)) return null
  return 'SHIPPING' // received, in transit, out for delivery…
}

// Which panel transitions a courier update may trigger. Never moves an order
// backwards (a late "in transit" after "delivered") and never revives a
// cancelled one.
const ALLOWED_FROM = {
  SHIPPING: ['CONFIRMED'],
  DELIVERED: ['CONFIRMED', 'SHIPPING'],
  RETURNED: ['CONFIRMED', 'SHIPPING', 'DELIVERED'],
  CANCELLED: ['CONFIRMED', 'SHIPPING'],
}

export function nextOrderStatus(current, statusId) {
  const target = targetStatusFor(statusId)
  if (!target || target === current) return null
  return ALLOWED_FROM[target].includes(current) ? target : null
}

/**
 * Hands an order to the active provider once. Called when an order becomes
 * CONFIRMED/SHIPPING. Shop sales never ship; an order that already has a
 * tracking number is never sent again.
 */
export async function dispatchOrder(orderId, provider) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, packageItems: true, shipment: true },
  })
  if (!order || order.source === 'STORE' || order.shipment?.tracking) return null

  const result = await provider.createShipment(order)
  const data = result.success
    ? {
        tracking: result.tracking,
        costCents: result.costCents,
        city: result.city,
        sentAt: new Date(),
        error: null,
      }
    : { error: result.message || 'تعذر إرسال الطلب' }

  return prisma.shipment.upsert({
    where: { orderId },
    update: data,
    create: { orderId, provider: provider.id, ...data },
  })
}

/**
 * Pulls the parcel's real state from DIGYLOG and applies it. The webhook only
 * tells us *which* parcel changed — its body is never trusted for the status.
 * `extra` carries informational webhook fields (motif, driver phone).
 */
export async function syncShipment(tracking, extra = {}) {
  const shipment = await prisma.shipment.findUnique({ where: { tracking }, include: { order: true } })
  if (!shipment) return null

  const parcel = await getParcel(tracking)
  const updated = await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      statusId: parcel.statusId,
      statusLabel: parcel.statusLabel,
      costCents: parcel.costCents,
      lastSyncAt: new Date(),
      error: null,
      ...(extra.motif !== undefined ? { motif: extra.motif || null } : {}),
      ...(extra.driverPhone !== undefined ? { driverPhone: extra.driverPhone || null } : {}),
    },
  })

  const next = nextOrderStatus(shipment.order.status, parcel.statusId)
  if (next) {
    await applyStockAndUpdateOrderStatus(shipment.orderId, next, undefined, null)
    await logActivity({
      actor: { name: 'DIGYLOG' },
      action: 'ORDER_STATUS_SYNCED',
      resourceType: 'ORDER',
      resourceId: shipment.orderId,
      details: { orderNumber: shipment.order.orderNumber, from: shipment.order.status, to: next, tracking, courierStatus: parcel.statusLabel },
    })
  }
  return { shipment: updated, orderStatus: next || shipment.order.status }
}
