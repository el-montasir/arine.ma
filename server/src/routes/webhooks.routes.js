import { Router } from 'express'
import { timingSafeEqual } from 'node:crypto'
import { syncShipment } from '../services/shipping/shipment.service.js'

const router = Router()

// The URL carries a secret (DIGYLOG_WEBHOOK_SECRET) so random callers are
// turned away; even so, a valid call only names a parcel — its new status is
// re-read from DIGYLOG with our own token before anything changes.
function secretMatches(given) {
  const expected = process.env.DIGYLOG_WEBHOOK_SECRET || ''
  if (!expected || typeof given !== 'string' || given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

async function digylogWebhook(req, res) {
  if (!secretMatches(req.params.secret)) return res.status(404).json({ success: false })

  const body = req.body || {}

  // Registration handshake: echo the key back.
  if (body.type === 'subscribe' && typeof body.key === 'string') {
    return res.json({ key: body.key })
  }

  // Answer at once: DIGYLOG drops the call after ~0.2 s (HTTP 499), and
  // re-reading the parcel takes longer. The sync runs after the reply.
  res.json({ success: true })

  if (body.eventType === 'order-status-changed' && body.payload?.traking) {
    const tracking = String(body.payload.traking)
    syncShipment(tracking, { motif: body.payload.motif, driverPhone: body.payload.driverPhone }).catch((err) => {
      // The periodic sync (syncOpenShipments) picks it up later.
      console.error('[digylog webhook] sync failed:', tracking, err.message)
    })
  }
}

router.put('/digylog/:secret', digylogWebhook)
router.post('/digylog/:secret', digylogWebhook)

export default router
