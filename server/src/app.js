import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import fs from 'fs'
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
import { isR2Configured, getFromStorage } from './lib/storage.js'
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

// CORS — explicit origins only, never '*'. Both the Store and the Admin
// Panel are allowed. credentials:true lets the admin session cookie cross
// origins safely. Supports comma-separated list in env vars.
const parseOrigins = (val) =>
  (val || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)

const frontendOrigins = parseOrigins(process.env.FRONTEND_URL)
const adminOrigins = parseOrigins(process.env.ADMIN_URL)

const allowedOrigins = Array.from(
  new Set([
    ...(frontendOrigins.length ? frontendOrigins : ['http://localhost:5173']),
    ...(adminOrigins.length ? adminOrigins : ['http://localhost:5174']),
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:5174'] : []),
  ])
)
app.use(cors({ origin: allowedOrigins, credentials: true }))

app.use(express.json())
app.use(sessionMiddleware)

// Serve uploaded media (Cloudflare R2 object storage with local filesystem fallback)
app.get('/uploads/*', async (req, res, next) => {
  try {
    const rawPath = req.params[0] || req.path.replace(/^\/uploads\/?/, '')
    if (!rawPath) {
      return res.status(404).json({ error: 'Image not found' })
    }

    // Normalize and sanitize key to prevent path traversal
    const normalizedKey = path.posix.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '')

    // 1. Try Cloudflare R2 if configured
    if (isR2Configured()) {
      const obj = await getFromStorage(normalizedKey)
      if (obj && obj.stream) {
        res.setHeader('Content-Type', obj.contentType || 'application/octet-stream')
        if (obj.contentLength) {
          res.setHeader('Content-Length', obj.contentLength)
        }
        if (obj.etag) {
          res.setHeader('ETag', obj.etag)
        }
        if (obj.lastModified) {
          res.setHeader('Last-Modified', new Date(obj.lastModified).toUTCString())
        }
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
        res.setHeader('Access-Control-Allow-Origin', '*')

        if (req.headers['if-none-match'] && obj.etag && req.headers['if-none-match'] === obj.etag) {
          return res.status(304).end()
        }

        if (typeof obj.stream.pipe === 'function') {
          return obj.stream.pipe(res)
        } else if (typeof obj.stream.transformToWebStream === 'function') {
          const webStream = obj.stream.transformToWebStream()
          const reader = webStream.getReader()
          const pump = async () => {
            const { done, value } = await reader.read()
            if (done) {
              res.end()
              return
            }
            res.write(value)
            await pump()
          }
          return pump()
        }
      }
    }

    // 2. Fallback to local server/uploads directory
    const localFilePath = path.join(uploadsDir, normalizedKey)
    if (
      localFilePath.startsWith(uploadsDir) &&
      fs.existsSync(localFilePath) &&
      fs.statSync(localFilePath).isFile()
    ) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
      return res.sendFile(localFilePath)
    }

    return res.status(404).json({ error: 'Image not found' })
  } catch (err) {
    next(err)
  }
})

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