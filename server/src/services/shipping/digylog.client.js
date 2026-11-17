// Thin client for the DIGYLOG seller API v2 (https://api.digylog.com/api/v2/seller).
// Docs: https://documenter.getpostman.com/view/20928347/2sBXqNoKfH
//
// Configuration (server env only, never exposed to the browser):
//   DIGYLOG_API_KEY     Bearer token from seller.digylog.com → إعدادات API
//   DIGYLOG_NETWORK_ID  network the parcels leave from (GET /networks)
//   DIGYLOG_STORE       store name or id (GET /stores)

const BASE_URL = process.env.DIGYLOG_API_URL || 'https://api.digylog.com/api/v2/seller'
// The API rejects calls without this exact Referer.
const REFERER = 'https://apiseller.digylog.com'
const TIMEOUT_MS = 15_000

export class DigylogError extends Error {
  constructor(message, status = null) {
    super(message)
    this.status = status
  }
}

export function isDigylogConfigured() {
  return Boolean(process.env.DIGYLOG_API_KEY?.trim())
}

async function request(method, path, body) {
  if (!isDigylogConfigured()) throw new DigylogError('DIGYLOG_API_KEY غير مضبوط في الخادم')

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        Referer: REFERER,
        Authorization: `Bearer ${process.env.DIGYLOG_API_KEY.trim()}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    throw new DigylogError(`تعذر الاتصال بـ DIGYLOG: ${err.message}`)
  }

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  if (!res.ok) {
    const detail = data?.error_description || data?.message || (typeof data === 'string' ? data.slice(0, 200) : '')
    throw new DigylogError(`DIGYLOG ${res.status}: ${detail}`, res.status)
  }
  return data
}

// ── Cities (cached: the list barely changes) ────────────────────────────────

const CITY_TTL_MS = 24 * 60 * 60 * 1000
let cityCache = { at: 0, list: [] }

// [{ id, name: "FES", nameAr: "فاس" }]. Returns the last good list (or []) if
// DIGYLOG is unreachable, so the storefront keeps working.
export async function getCities() {
  if (cityCache.list.length && Date.now() - cityCache.at < CITY_TTL_MS) return cityCache.list
  if (!isDigylogConfigured()) return cityCache.list
  try {
    const list = await request('GET', '/cities')
    if (Array.isArray(list) && list.length) {
      cityCache = {
        at: Date.now(),
        list: list.map((c) => ({ id: c.id, name: c.name, nameAr: c.nameAr || null })),
      }
    }
  } catch (err) {
    console.error('[digylog] cities fetch failed:', err.message)
  }
  return cityCache.list
}

// Lower-case, no accents, Arabic letter variants folded, no spaces/punctuation:
// "Fès", "FES", " fes ", "فاس" all compare equal to their DIGYLOG entry.
export function normalizeCityName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ٰٟـ]/g, '') // Arabic diacritics, tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]/g, '')
}

// Matches free text to a DIGYLOG city, or null.
export async function resolveCity(text) {
  const key = normalizeCityName(text)
  if (!key) return null
  const cities = await getCities()
  return cities.find((c) => normalizeCityName(c.name) === key || normalizeCityName(c.nameAr) === key) || null
}

// ── Orders ───────────────────────────────────────────────────────────────────

/**
 * Registers one standard parcel in DIGYLOG's "No sent orders" list. The seller
 * books the pickup and sends it from the DIGYLOG dashboard; the webhook then
 * follows it. Returns { tracking, costCents, statusId, statusLabel }.
 * `checkDuplicate` makes DIGYLOG refuse a second parcel with the same num, so
 * a retried request can never register an order twice.
 */
export async function createParcel({ num, name, phone, address, cityId, price, note, refs }) {
  const network = Number(process.env.DIGYLOG_NETWORK_ID)
  const store = process.env.DIGYLOG_STORE?.trim()
  if (!network || !store) throw new DigylogError('DIGYLOG_NETWORK_ID / DIGYLOG_STORE غير مضبوطين في الخادم')

  const result = await request('POST', '/orders/standard', {
    network,
    store,
    sentType: 0, // create only: stays in "No sent orders" until the seller sends it
    checkDuplicate: 1,
    orders: [
      {
        num,
        name,
        phone,
        address,
        city: cityId,
        price, // cash the courier collects: the full order total
        openproduct: 1, // the customer may open the parcel before paying
        port: 2, // shipping paid by the seller, out of the collected cash
        note: note || '',
        refs,
      },
    ],
  })

  const row = Array.isArray(result) ? result[0] : null
  if (!row?.isSuccess) {
    const reason = row?.errors?.join(' — ') || 'رد غير متوقع من DIGYLOG'
    throw new DigylogError(reason)
  }
  return {
    tracking: row.traking || row.tracking,
    costCents: row.cost != null ? Math.round(Number(row.cost) * 100) : null,
    statusId: 0,
    statusLabel: 'Non envoyée',
  }
}

// Authoritative state of a parcel: status and every fee DIGYLOG charges.
export async function getParcel(tracking) {
  const info = await request('GET', `/order/${encodeURIComponent(tracking)}/infos`)
  const fees = info.fees || {}
  const feeTotal =
    Number(fees.deliveryCost ?? info.deliveryCost ?? 0) +
    Number(fees.returnFees || 0) +
    Number(fees.refusalFees || 0) +
    Number(fees.callCenter || 0) +
    Number(fees.fulfillmentShipping || 0) +
    (fees.packaging?.billed ? Number(fees.packaging.amount || 0) : 0)
  return {
    tracking: info.traking || tracking,
    num: info.num,
    statusId: info.idStatus != null ? Number(info.idStatus) : null,
    statusLabel: info.status || null,
    city: info.city || null,
    costCents: Math.round(feeTotal * 100),
  }
}

export function registerWebhook(url) {
  return request('PUT', '/webhook', { url })
}
