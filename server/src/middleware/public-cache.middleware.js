// Short-lived in-memory cache for the public catalog GET endpoints.
//
// Every storefront visit fires the same handful of read-only requests
// (products, packages, categories, banners, store/shipping/marketing config),
// and each one costs a database round trip. Their responses are identical for
// every visitor, so we keep the JSON for a few seconds and serve it from memory.
//
// Freshness: any successful admin write (POST/PUT/PATCH/DELETE under
// /api/admin) clears the whole cache, so an admin edit — product, price, stock
// confirmation, banner, settings — is visible on the next storefront request.
// The TTL only bounds staleness for changes made outside the admin API
// (scripts, a second instance, time-based banner windows).

const DEFAULT_TTL_MS = Number(process.env.PUBLIC_CACHE_TTL_MS || 30_000)
const MAX_ENTRIES = 500

const store = new Map()

export function clearPublicCache() {
  store.clear()
}

export function publicCache(ttlMs = DEFAULT_TTL_MS) {
  return (req, res, next) => {
    if (req.method !== 'GET' || ttlMs <= 0) return next()

    const key = req.originalUrl
    const hit = store.get(key)
    if (hit && hit.expiresAt > Date.now()) {
      res.setHeader('X-Cache', 'HIT')
      return res.status(200).json(hit.body)
    }

    const originalJson = res.json.bind(res)
    res.json = (body) => {
      if (res.statusCode === 200 && body?.success !== false) {
        if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value)
        store.set(key, { body, expiresAt: Date.now() + ttlMs })
      }
      res.setHeader('X-Cache', 'MISS')
      return originalJson(body)
    }
    next()
  }
}

// Mount before the admin router: clears the cache once a write has succeeded.
export function invalidatePublicCacheOnWrite(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
  res.on('finish', () => {
    if (res.statusCode < 400) clearPublicCache()
  })
  next()
}
