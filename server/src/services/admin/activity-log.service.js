import { prisma } from '../../lib/prisma.js'

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'secret',
  'cookie',
  'sessionsecret',
  'authorization',
])

function sanitizeDetails(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sanitizeDetails)

  const clean = {}
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      continue
    }
    if (v && typeof v === 'object') {
      clean[k] = sanitizeDetails(v)
    } else {
      clean[k] = v
    }
  }
  return clean
}

/**
 * Creates an immutable activity audit log record.
 * Never throws an unhandled exception that disrupts the main business transaction.
 */
export async function logActivity({
  actor,
  action,
  resourceType,
  resourceId = null,
  details = null,
  req = null,
}) {
  try {
    let actorId = actor?.id ?? null
    let actorName = actor?.name || actor?.username || 'System'
    let actorEmail = actor?.email || (actor?.username?.includes('@') ? actor.username : null)

    let ipAddress = null
    let userAgent = null

    if (req) {
      ipAddress = req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || null
      userAgent = req.headers?.['user-agent'] || null
    }

    const sanitized = sanitizeDetails(details)

    return await prisma.activityLog.create({
      data: {
        actorId,
        actorName,
        actorEmail,
        action,
        resourceType,
        resourceId: resourceId ? String(resourceId) : null,
        details: sanitized,
        ipAddress: ipAddress ? String(ipAddress).slice(0, 100) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
      },
    })
  } catch (err) {
    // Audit log failure must not crash business logic, but log to stderr for monitoring
    console.error('[ACTIVITY_LOG_ERROR] Failed to record audit log:', err.message)
    return null
  }
}

/**
 * Lists activity logs with server-side pagination and filters.
 */
export async function listActivityLogs({
  page = 1,
  limit = 20,
  actorId = null,
  action = null,
  resourceType = null,
  startDate = null,
  endDate = null,
  search = null,
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
  const skip = (pageNum - 1) * limitNum

  const where = {}

  if (actorId) {
    where.actorId = parseInt(actorId, 10)
  }

  if (action) {
    where.action = String(action)
  }

  if (resourceType) {
    where.resourceType = String(resourceType)
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      const s = new Date(startDate)
      if (!isNaN(s.getTime())) where.createdAt.gte = s
    }
    if (endDate) {
      const e = new Date(endDate)
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999)
        where.createdAt.lte = e
      }
    }
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim()
    where.OR = [
      { actorName: { contains: term, mode: 'insensitive' } },
      { actorEmail: { contains: term, mode: 'insensitive' } },
      { action: { contains: term, mode: 'insensitive' } },
      { resourceType: { contains: term, mode: 'insensitive' } },
      { resourceId: { contains: term, mode: 'insensitive' } },
    ]
  }

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
  ])

  return {
    logs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  }
}
