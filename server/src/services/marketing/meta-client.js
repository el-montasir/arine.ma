import crypto from 'crypto'

const DEFAULT_API_VERSION = 'v21.0'
const GRAPH_BASE_URL = 'https://graph.facebook.com'

/**
 * Meta Graph API HTTP Client
 * Secure wrapper around fetch with retry capability, timeout control,
 * and automatic redaction of sensitive credentials in logs and error messages.
 */
export class MetaClient {
  constructor({ apiVersion = DEFAULT_API_VERSION, accessToken = null } = {}) {
    this.apiVersion = apiVersion
    this.accessToken = accessToken
    this.baseUrl = `${GRAPH_BASE_URL}/${this.apiVersion}`
  }

  /**
   * Safe sanitization for logging / error messaging to avoid token leakage.
   */
  static sanitize(str) {
    if (!str || typeof str !== 'string') return str
    return str
      .replace(/access_token=[a-zA-Z0-9_-]+/gi, 'access_token=[REDACTED]')
      .replace(/EAAB[a-zA-Z0-9]+/g, '[REDACTED_TOKEN]')
      .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED]')
  }

  /**
   * Hashes string value with SHA-256 for Meta User Data
   */
  static hashUserData(value) {
    if (!value || typeof value !== 'string') return null
    const normalized = value.trim().toLowerCase()
    if (!normalized) return null
    return crypto.createHash('sha256').update(normalized).digest('hex')
  }

  /**
   * Normalizes and hashes phone number (+212... format or digits only)
   */
  static hashPhone(phone) {
    if (!phone || typeof phone !== 'string') return null
    // Strip all non-digit characters
    let cleaned = phone.replace(/\D/g, '')
    // If Moroccan local format (e.g. 06..., 07...), convert to international 212...
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '212' + cleaned.slice(1)
    }
    if (cleaned.length < 8) return null
    return crypto.createHash('sha256').update(cleaned).digest('hex')
  }

  /**
   * Execute Graph API request
   */
  async request(endpoint, { method = 'GET', body = null, params = {}, token = null, timeoutMs = 15000 } = {}) {
    const activeToken = token || this.accessToken
    const url = new URL(`${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`)

    // Attach query params
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        url.searchParams.set(key, typeof val === 'object' ? JSON.stringify(val) : String(val))
      }
    }

    if (activeToken && !url.searchParams.has('access_token')) {
      url.searchParams.set('access_token', activeToken)
    }

    const headers = {
      'Accept': 'application/json',
    }

    let requestBody = null
    if (body) {
      if (typeof body === 'object') {
        headers['Content-Type'] = 'application/json'
        requestBody = JSON.stringify(body)
      } else {
        requestBody = body
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: requestBody,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      let data
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        const metaError = data?.error || {}
        const sanitizedMsg = MetaClient.sanitize(metaError.message || `Meta API request failed with status ${response.status}`)
        const err = new Error(sanitizedMsg)
        err.status = response.status
        err.metaCode = metaError.code
        err.metaSubcode = metaError.error_subcode
        err.metaType = metaError.type
        err.fbtrace_id = metaError.fbtrace_id
        err.metaUserTitle = metaError.error_user_title
        err.metaUserMsg = metaError.error_user_msg
        throw err
      }

      return data
    } catch (err) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('Meta API request timed out')
        timeoutErr.status = 504
        timeoutErr.code = 'META_TIMEOUT'
        throw timeoutErr
      }
      err.message = MetaClient.sanitize(err.message)
      throw err
    }
  }

  get(endpoint, opts = {}) {
    return this.request(endpoint, { ...opts, method: 'GET' })
  }

  post(endpoint, body, opts = {}) {
    return this.request(endpoint, { ...opts, method: 'POST', body })
  }

  delete(endpoint, opts = {}) {
    return this.request(endpoint, { ...opts, method: 'DELETE' })
  }
}
