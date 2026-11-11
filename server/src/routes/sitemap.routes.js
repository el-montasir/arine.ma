import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

// GET /sitemap.xml — every public storefront page, for search engines.
// The storefront is a static SPA, so the dynamic book/package URLs are listed
// here and the storefront's robots.txt points crawlers to this file.
const SITE_URL = (process.env.STOREFRONT_PUBLIC_URL || 'https://www.arine.ma').replace(/\/+$/, '')

const STATIC_PATHS = ['/', '/shop', '/packages', '/about', '/contact', '/track-order']

function urlEntry(path, lastmod) {
  const loc = `<loc>${SITE_URL}${path}</loc>`
  const mod = lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''
  return `  <url>${loc}${mod}</url>`
}

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const [products, packages] = await Promise.all([
      prisma.product.findMany({ select: { id: true, updatedAt: true }, orderBy: { id: 'asc' } }),
      prisma.package.findMany({ select: { id: true, updatedAt: true }, orderBy: { id: 'asc' } }),
    ])

    const entries = [
      ...STATIC_PATHS.map((p) => urlEntry(p)),
      ...products.map((p) => urlEntry(`/book/${p.id}`, p.updatedAt)),
      ...packages.map((p) => urlEntry(`/package/${p.id}`, p.updatedAt)),
    ]

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`
    )
  } catch (err) {
    next(err)
  }
})

export default router
