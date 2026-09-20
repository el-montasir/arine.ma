// Marketing & Meta Pixel Storefront Tracking Engine
import api from './api'

const FIRST_TOUCH_KEY = 'arine_first_touch'
const LAST_TOUCH_KEY = 'arine_last_touch'
const FBP_COOKIE_KEY = '_fbp'
const FBC_COOKIE_KEY = '_fbc'

let pixelInitialized = false
let currentPixelId = null

/**
 * Read a cookie by name
 */
function getCookie(name) {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return null
}

/**
 * Set a cookie with expiration (days)
 */
function setCookie(name, value, days = 90) {
  if (typeof document === 'undefined') return
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  const expires = `; expires=${date.toUTCString()}`
  document.cookie = `${name}=${value || ''}${expires}; path=/; SameSite=Lax`
}

/**
 * Detect client device category
 */
export function getDeviceType() {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet'
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

/**
 * Generate unique, collision-safe Event ID for Pixel ↔ CAPI deduplication
 */
export function generateClientEventId(prefix = 'evt') {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}_${random}`
}

/**
 * Capture UTM, Click IDs (fbclid), and Cookies from URL & session
 */
export function captureAttribution() {
  if (typeof window === 'undefined') return {}

  try {
    const urlParams = new URLSearchParams(window.location.search)
    const utmSource = urlParams.get('utm_source')
    const utmMedium = urlParams.get('utm_medium')
    const utmCampaign = urlParams.get('utm_campaign')
    const utmContent = urlParams.get('utm_content')
    const utmTerm = urlParams.get('utm_term')
    const fbclid = urlParams.get('fbclid')
    const metaCampaignId = urlParams.get('meta_campaign_id') || urlParams.get('campaign_id')
    const metaCampaignName = urlParams.get('meta_campaign_name')

    // 1. Manage Meta _fbc (click ID)
    let fbc = getCookie(FBC_COOKIE_KEY)
    if (fbclid) {
      // Standard Meta format: fb.1.{creationTime}.{fbclid}
      fbc = `fb.1.${Date.now()}.${fbclid}`
      setCookie(FBC_COOKIE_KEY, fbc, 90)
    }

    // 2. Manage Meta _fbp (browser ID)
    let fbp = getCookie(FBP_COOKIE_KEY)
    if (!fbp) {
      try {
        fbp = localStorage.getItem('arine_fbp')
      } catch {
        /* storage unavailable */
      }
      if (!fbp) {
        // Standard Meta format: fb.1.{creationTime}.{randomNumber}
        fbp = `fb.1.${Date.now()}.${Math.floor(1000000000 + Math.random() * 9000000000)}`
      }
      setCookie(FBP_COOKIE_KEY, fbp, 90)
      try {
        localStorage.setItem('arine_fbp', fbp)
      } catch {
        /* storage unavailable */
      }
    }

    const hasNewParams = Boolean(utmSource || utmCampaign || fbclid || metaCampaignId)
    const nowIso = new Date().toISOString()

    const currentTouch = {
      utmSource: utmSource || (fbclid ? 'facebook' : null),
      utmMedium: utmMedium || (fbclid ? 'paid_social' : null),
      utmCampaign: utmCampaign || metaCampaignName || null,
      utmContent: utmContent || null,
      utmTerm: utmTerm || null,
      fbclid: fbclid || null,
      fbp: fbp || null,
      fbc: fbc || null,
      metaCampaignId: metaCampaignId || null,
      metaCampaignName: metaCampaignName || null,
      timestamp: nowIso,
      landingPage: window.location.href,
      referrer: document.referrer || null,
      deviceType: getDeviceType(),
    }

    // 3. Record First Touch if not already recorded
    let firstTouch = null
    try {
      const storedFirst = localStorage.getItem(FIRST_TOUCH_KEY)
      if (storedFirst) {
        firstTouch = JSON.parse(storedFirst)
      } else if (hasNewParams || document.referrer) {
        firstTouch = {
          source: currentTouch.utmSource || (document.referrer ? 'referral' : 'direct'),
          medium: currentTouch.utmMedium || (document.referrer ? 'referral' : 'none'),
          campaign: currentTouch.utmCampaign || 'organic',
          timestamp: nowIso,
          landingPage: window.location.href,
          referrer: document.referrer || null,
        }
        localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(firstTouch))
      }
    } catch {
      /* storage unavailable */
    }

    // 4. Update Last Touch if new campaign parameters exist
    if (hasNewParams) {
      try {
        localStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(currentTouch))
      } catch {
        /* storage unavailable */
      }
    }

    return currentTouch
  } catch {
    return {}
  }
}

/**
 * Retrieve comprehensive attribution object for order submission
 */
export function getAttributionData() {
  if (typeof window === 'undefined') return null

  try {
    let firstTouch = null
    let lastTouch = null

    try {
      const ft = localStorage.getItem(FIRST_TOUCH_KEY)
      if (ft) firstTouch = JSON.parse(ft)
    } catch {
      /* ignore */
    }

    try {
      const lt = localStorage.getItem(LAST_TOUCH_KEY)
      if (lt) lastTouch = JSON.parse(lt)
    } catch {
      /* ignore */
    }

    const currentParams = captureAttribution()
    const fbp = getCookie(FBP_COOKIE_KEY) || currentParams.fbp || null
    const fbc = getCookie(FBC_COOKIE_KEY) || currentParams.fbc || null

    return {
      utmSource: currentParams.utmSource || lastTouch?.utmSource || firstTouch?.source || null,
      utmMedium: currentParams.utmMedium || lastTouch?.utmMedium || firstTouch?.medium || null,
      utmCampaign: currentParams.utmCampaign || lastTouch?.utmCampaign || firstTouch?.campaign || null,
      utmContent: currentParams.utmContent || lastTouch?.utmContent || null,
      utmTerm: currentParams.utmTerm || lastTouch?.utmTerm || null,
      fbclid: currentParams.fbclid || lastTouch?.fbclid || null,
      fbp,
      fbc,
      metaCampaignId: currentParams.metaCampaignId || lastTouch?.metaCampaignId || null,
      metaCampaignName: currentParams.metaCampaignName || lastTouch?.metaCampaignName || null,
      firstTouch,
      lastTouch,
      landingPage: firstTouch?.landingPage || window.location.href,
      referrer: document.referrer || null,
      deviceType: getDeviceType(),
    }
  } catch {
    return null
  }
}

/**
 * Initialize Meta Pixel dynamically from Backend Configuration
 */
export async function initMetaPixel() {
  if (typeof window === 'undefined') return

  try {
    const res = await api.get('/marketing/config')
    const config = res?.data || res || {}

    if (!config.pixelEnabled || !config.pixelId) {
      return
    }

    if (pixelInitialized && currentPixelId === config.pixelId) {
      return
    }

    currentPixelId = config.pixelId

    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }
      if (!f._fbq) f._fbq = n
      n.push = n
      n.loaded = !0
      n.version = '2.0'
      n.queue = []
      t = b.createElement(e)
      t.async = !0
      t.src = v
      s = b.getElementsByTagName(e)[0]
      s.parentNode.insertBefore(t, s)
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
    /* eslint-enable */

    window.fbq('init', config.pixelId)
    pixelInitialized = true

    // Capture attribution on startup
    captureAttribution()

    // Track initial page view
    window.fbq('track', 'PageView')
  } catch {
    // Non-blocking: Marketing failure must not break storefront
  }
}

/**
 * Track standard PageView event
 */
export function trackPageView() {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('track', 'PageView')
  }
}

/**
 * Track ViewContent (Product / Package details page)
 */
export function trackViewContent(item) {
  if (!item || typeof window === 'undefined') return
  if (typeof window.fbq !== 'function') return

  const itemId = item.id ? (item.isPackage ? `pkg-${item.id}` : `book-${item.id}`) : 'item'
  const title = item.title || item.name || 'Product'
  const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0

  window.fbq('track', 'ViewContent', {
    content_name: title,
    content_ids: [itemId],
    content_type: 'product',
    value: price,
    currency: 'MAD',
  })
}

/**
 * Track AddToCart event
 */
export function trackAddToCart(item, quantity = 1) {
  if (!item || typeof window === 'undefined') return
  if (typeof window.fbq !== 'function') return

  const itemId = item.id ? (item.isPackage ? `pkg-${item.id}` : `book-${item.id}`) : 'item'
  const title = item.title || item.name || 'Product'
  const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0

  window.fbq('track', 'AddToCart', {
    content_name: title,
    content_ids: [itemId],
    content_type: 'product',
    value: price * quantity,
    currency: 'MAD',
  })
}

/**
 * Track InitiateCheckout event
 */
export function trackInitiateCheckout(items = [], total = 0) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return

  const contentIds = items.map((i) => (i.isPackage ? `pkg-${i.packageId || i.id}` : `book-${i.id}`))

  window.fbq('track', 'InitiateCheckout', {
    content_ids: contentIds,
    content_type: 'product',
    num_items: items.reduce((sum, i) => sum + (i.quantity || 1), 0),
    value: typeof total === 'number' ? total : parseFloat(total) || 0,
    currency: 'MAD',
  })
}

/**
 * Track Purchase event with deduplication EventID
 */
export function trackPurchase({ orderNumber, total, items = [], eventId = null }) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return

  const contentIds = items.map((i) =>
    i.isPackage || i.packageId ? `pkg-${i.packageId || i.id}` : `book-${i.productId || i.id}`
  )

  const payload = {
    content_ids: contentIds.length > 0 ? contentIds : undefined,
    content_type: 'product',
    num_items: items.length > 0 ? items.reduce((sum, i) => sum + (i.quantity || 1), 0) : 1,
    value: typeof total === 'number' ? total : parseFloat(total) || 0,
    currency: 'MAD',
    order_id: orderNumber,
  }

  // Deduplication options: match eventID with CAPI Purchase event
  const options = eventId ? { eventID: eventId } : undefined

  window.fbq('track', 'Purchase', payload, options)
}
