import { ApiError } from './api-error.js'

/**
 * Standard legitimate Web Push service provider hostname patterns.
 * All major browser push services (Google Chrome/Chromium, Mozilla Firefox,
 * Apple Safari on iOS/macOS, and Microsoft Edge/Windows WNS) route exclusively
 * through these vendor-operated HTTPS push gateway domains.
 */
const ALLOWED_PUSH_PROVIDER_PATTERNS = [
  // Google FCM & Legacy GCM (Chrome, Chromium, Brave, Opera, Vivaldi, Android browsers)
  /^([a-z0-9-]+\.)*(fcm|android)\.googleapis\.com$/i,
  // Mozilla Autopush (Firefox desktop and mobile)
  /^([a-z0-9-]+\.)*push\.services\.mozilla\.com$/i,
  // Apple Push Notification Service (Safari macOS & iOS 16.4+ Web Push)
  /^([a-z0-9-]+\.)*push\.apple\.com$/i,
  // Microsoft Windows Push Notification Services (WNS / Edge)
  /^([a-z0-9-]+\.)*notify\.windows\.com$/i,
]

/**
 * Check if an IPv4 address is in a private, loopback, link-local (cloud metadata), or reserved range.
 */
function isPrivateIPv4(ip) {
  const parts = ip.split('.').map((p) => parseInt(p, 10))
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true
  }

  const [a, b, c] = parts

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true
  // 10.0.0.0/8 (Private network)
  if (a === 10) return true
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true
  // 100.64.0.0/10 (Shared Address Space / CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true
  // 169.254.0.0/16 (Link-local & Cloud Metadata e.g. 169.254.169.254)
  if (a === 169 && b === 254) return true
  // 172.16.0.0/12 (Private network)
  if (a === 172 && b >= 16 && b <= 31) return true
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true
  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true
  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true
  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true
  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true
  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true
  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true

  return false
}

/**
 * Check if a hostname resolves to a forbidden/internal host or IP (SSRF prevention).
 */
export function isPrivateOrReservedHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return true

  const host = hostname.toLowerCase().trim()

  // Forbidden local / internal hostnames & domain suffixes
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan') ||
    host.endsWith('.home') ||
    host.endsWith('.test') ||
    host.endsWith('.example') ||
    host.endsWith('.invalid')
  ) {
    return true
  }

  // Bracketed IPv6 checks
  if (host.startsWith('[') && host.endsWith(']')) {
    const ipv6 = host.slice(1, -1).toLowerCase()
    if (
      ipv6 === '::1' ||
      ipv6 === '::' ||
      ipv6.startsWith('fe80:') ||
      ipv6.startsWith('fc') ||
      ipv6.startsWith('fd')
    ) {
      return true
    }
    if (ipv6.includes('::ffff:')) {
      const parts = ipv6.split('::ffff:')
      const ipv4Part = parts[parts.length - 1]
      if (isPrivateIPv4(ipv4Part)) return true
    }
    return false
  }

  // Plain IPv4 check
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return isPrivateIPv4(host)
  }

  // Valid domain hostname check: must contain at least one dot and valid domain characters
  if (!host.includes('.') || !/^[a-z0-9.-]+$/.test(host) || host.startsWith('.') || host.endsWith('.')) {
    return true
  }

  return false
}

/**
 * Verify if a hostname belongs to an authorized browser push gateway provider.
 */
export function isAllowedPushProviderHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false
  const host = hostname.toLowerCase().trim()

  // Ensure host does not match private or reserved host patterns
  if (isPrivateOrReservedHost(host)) return false

  return ALLOWED_PUSH_PROVIDER_PATTERNS.some((pattern) => pattern.test(host))
}

/**
 * Validate base64 / base64url encoded cryptographic key buffer length.
 */
export function isValidBase64Key(str, minBytes, maxBytes) {
  if (!str || typeof str !== 'string') return false
  const trimmed = str.trim()
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(trimmed)) return false

  try {
    const base64Standard = trimmed.replace(/-/g, '+').replace(/_/g, '/')
    const buf = Buffer.from(base64Standard, 'base64')
    if (buf.length < minBytes || buf.length > maxBytes) return false
    return true
  } catch {
    return false
  }
}

/**
 * Validate and sanitize complete push subscription payload.
 * Enforces strict HTTPS protocol, default HTTPS port, no credentials,
 * verified browser push gateway allowlist, and cryptographic key buffer lengths.
 */
export function validateSubscriptionInput({ endpoint, keys, userAgent }) {
  if (!endpoint || typeof endpoint !== 'string' || endpoint.length < 10 || endpoint.length > 2048) {
    throw new ApiError(400, 'INVALID_ENDPOINT', 'معرف اشتراك الإشعارات غير صحيح أو يتجاوز الحد المسموح')
  }

  let parsedUrl
  try {
    parsedUrl = new URL(endpoint.trim())
  } catch {
    throw new ApiError(400, 'INVALID_ENDPOINT', 'معرف اشتراك الإشعارات ليس رابطاً صحيحاً')
  }

  // Enforce HTTPS protocol
  if (parsedUrl.protocol !== 'https:') {
    throw new ApiError(400, 'INVALID_ENDPOINT_PROTOCOL', 'يجب أن يكون رابط الاشتراك عبر بروتوكول HTTPS الآمن')
  }

  // Reject embedded URL credentials
  if (parsedUrl.username || parsedUrl.password) {
    throw new ApiError(400, 'INVALID_ENDPOINT_CREDENTIALS', 'رابط الاشتراك لا يمكن أن يحتوي على بيانات اعتماد')
  }

  // Enforce default HTTPS port only (reject custom ports e.g. :8080, :22, :3000)
  if (parsedUrl.port && parsedUrl.port !== '443') {
    throw new ApiError(400, 'INVALID_ENDPOINT_PORT', 'منفذ اشتراك الإشعارات غير مسموح به')
  }

  // Verify hostname belongs to verified browser push service provider allowlist (SSRF prevention)
  if (!isAllowedPushProviderHost(parsedUrl.hostname)) {
    throw new ApiError(400, 'INVALID_ENDPOINT_HOST', 'نطاق مزود الإشعارات غير معتمد أو غير مسموح به')
  }

  if (!keys || typeof keys !== 'object') {
    throw new ApiError(400, 'INVALID_KEYS', 'مفاتيح التشفير مطلوبة')
  }

  // P-256 EC public key is 65 octets (uncompressed point format)
  if (!isValidBase64Key(keys.p256dh, 65, 65)) {
    throw new ApiError(400, 'INVALID_P256DH_KEY', 'مفتاح p256dh غير صحيح')
  }

  // Web Push auth secret is 16 octets (allow up to 32 octets)
  if (!isValidBase64Key(keys.auth, 16, 32)) {
    throw new ApiError(400, 'INVALID_AUTH_KEY', 'مفتاح auth غير صحيح')
  }

  let sanitizedUserAgent = null
  if (userAgent && typeof userAgent === 'string') {
    sanitizedUserAgent = userAgent.slice(0, 500).replace(/[\x00-\x1F\x7F]/g, '').trim() || null
  }

  return {
    endpoint: endpoint.trim(),
    keys: {
      p256dh: keys.p256dh.trim(),
      auth: keys.auth.trim(),
    },
    userAgent: sanitizedUserAgent,
  }
}
