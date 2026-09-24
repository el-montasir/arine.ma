/**
 * Normalizes an image path or URL for display in the Admin panel.
 * Resolves relative `/uploads/...` paths to the backend API server origin,
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

  // Derive API server origin from VITE_API_URL or fallback to backend default
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/admin'
  let serverOrigin = 'http://localhost:4000'
  try {
    const parsed = new URL(apiUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000')
    serverOrigin = parsed.origin
  } catch {
    serverOrigin = 'http://localhost:4000'
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${serverOrigin}${cleanPath}`
}

export default getImageUrl
