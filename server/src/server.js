import 'dotenv/config'
import app from './app.js'
import { isDigylogConfigured } from './services/shipping/digylog.client.js'
import { startShipmentSyncLoop } from './services/shipping/shipment.service.js'

const PORT = Number(process.env.PORT || 4000)
const HOST = process.env.HOST || '0.0.0.0'

app.listen(PORT, HOST, () => {
  console.log(`✅ Arine API running on port ${PORT} (bound to ${HOST})`)
})

// Catches courier status changes whose webhook never arrived.
if (isDigylogConfigured()) startShipmentSyncLoop()
