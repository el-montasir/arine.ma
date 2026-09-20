import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'
import productRoutes from './routes/products.routes.js'
import packageRoutes from './routes/packages.routes.js'
import categoryRoutes from './routes/categories.routes.js'
import orderRoutes from './routes/orders.routes.js'
import shippingRoutes from './routes/shipping.routes.js'
import bannerRoutes from './routes/banners.routes.js'
import storeConfigRoutes from './routes/store-config.routes.js'
import marketingPublicRoutes from './routes/marketing.routes.js'
import adminRoutes from './routes/admin/index.js'
import { sessionMiddleware } from './lib/session.js'
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.resolve(__dirname, '../uploads')

const app = express()

// Behind a reverse proxy in production (set TRUST_PROXY to the hop count).
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1)
}

// Security headers with cross-origin resource policy allowing image assets to be loaded
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

// CORS — explicit origins only, never '*'. Both the Store (5173) and the Admin
// Panel (5174) are allowed. credentials:true lets the admin session cookie cross
// these two localhost origins; it does not open up third-party origins.
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  process.env.ADMIN_URL || 'http://localhost:5174',
].filter(Boolean)
app.use(cors({ origin: allowedOrigins, credentials: true }))

app.use(express.json())
app.use(sessionMiddleware)

// Serve uploaded product and package media statically
app.use(
  '/uploads',
  express.static(uploadsDir, {
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      res.setHeader('Access-Control-Allow-Origin', '*')
    },
  })
)

// Health check
app.get('/api/health', (_req, res) => res.json({ success: true, message: 'ok' }))

// Public (customer-facing) API
app.use('/api/products', productRoutes)
app.use('/api/packages', packageRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/shipping', shippingRoutes)
app.use('/api/banners', bannerRoutes)
app.use('/api/store-config', storeConfigRoutes)
app.use('/api/marketing', marketingPublicRoutes)

// Admin API — the router itself forces authentication on everything but login.
app.use('/api/admin', adminRoutes)

// 404 for unknown /api routes, then centralized error handling
app.use('/api', notFoundHandler)
app.use(errorHandler)

export default app