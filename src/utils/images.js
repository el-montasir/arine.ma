/**
 * Normalizes an image path or URL for public display on the Storefront.
 * Resolves relative `/uploads/...` paths to the storefront origin (edge-cached
 * proxy to the API; see vercel.json), and other relative paths to the API origin,
 * while leaving external URLs, base64 data URIs, and blobs untouched.
 */
export function getImageUrl(path) {
  if (!path || typeof path !== 'string') return ''
  const trimmed = path.trim()
  if (!trimmed) return ''

  // Absolute URLs or data/blob URIs remain as-is
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`

  // Uploaded media is served by the storefront's own origin: vercel.json
  // rewrites /uploads/* to the API and caches it at the edge, and the Vite dev
  // server proxies it. Same origin also saves a second connection per visit.
  if (cleanPath.startsWith('/uploads/') && typeof window !== 'undefined') {
    return `${window.location.origin}${cleanPath}`
  }

  // Derive API server origin from VITE_API_URL or fallback to backend default
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
  let serverOrigin = 'http://localhost:4000'
  try {
    const parsed = new URL(apiUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000')
    serverOrigin = parsed.origin
  } catch {
    serverOrigin = 'http://localhost:4000'
  }

  return `${serverOrigin}${cleanPath}`
}

export default getImageUrl
