import { prisma } from '../../lib/prisma.js'
import { hashPassword, verifyPassword } from '../../utils/password.js'

// The passwordHash must never leave the server. This is the only representation
// of an admin that any API may return.
export function serializeAdmin(admin) {
  if (!admin) return null
  return {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    name: admin.name,
    phone: admin.phone,
    role: admin.role,
    status: admin.status || 'ACTIVE',
    permissions: Array.isArray(admin.permissions) ? admin.permissions : [],
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
  }
}

// Returns {admin} on success, {disabled:true} for a locked account,
// {locked:true, lockoutUntil} for brute-force lockout, or null on bad credentials.
// Supports lookup by username OR email (case-insensitive).
export async function authenticate(identifier, password) {
  const trimmed = identifier.trim()
  const normalizedEmail = trimmed.toLowerCase()

  const admin = await prisma.admin.findFirst({
    where: {
      OR: [
        { username: trimmed },
        { email: normalizedEmail },
      ],
    },
  })

  if (!admin) return null

  // Check if account is locked due to too many failed attempts
  if (admin.lockoutUntil && admin.lockoutUntil > new Date()) {
    return { locked: true, lockoutUntil: admin.lockoutUntil, admin }
  }

  const valid = await verifyPassword(password, admin.passwordHash)

  if (!valid) {
    // Increment failed attempts
    const newAttempts = (admin.failedLoginAttempts || 0) + 1
    const updateData = { failedLoginAttempts: newAttempts }

    // Lock account for 15 minutes after 5 failed attempts
    if (newAttempts >= 5) {
      updateData.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: updateData,
    })

    return null
  }

  if (!admin.isActive || (admin.status && admin.status !== 'ACTIVE')) {
    return { disabled: true, admin }
  }

  // Successful login: reset failed attempts and update lastLoginAt & lastLogin
  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      lastLoginAt: new Date(),
      lastLogin: new Date(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
    },
  })

  return { admin }
}

export async function updateAdminPassword(adminId, newPassword) {
  const passwordHash = await hashPassword(newPassword)
  return prisma.admin.update({ where: { id: adminId }, data: { passwordHash } })
}

export async function getAdminPasswordHash(adminId) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { passwordHash: true },
  })
  return admin?.passwordHash || null
}

export async function getAdminActiveSessionsCount(adminId) {
  try {
    const id = parseInt(adminId, 10)
    const count = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM session WHERE (sess->>'adminId')::int = $1`,
      id
    )
    return count[0]?.count || 1
  } catch {
    return 1
  }
}

export async function revokeOtherSessions(adminId, currentSessionId) {
  try {
    const id = parseInt(adminId, 10)
    if (currentSessionId) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM session WHERE (sess->>'adminId')::int = $1 AND sid != $2`,
        id,
        currentSessionId
      )
    } else {
      await prisma.$executeRawUnsafe(
        `DELETE FROM session WHERE (sess->>'adminId')::int = $1`,
        id
      )
    }
    return true
  } catch (err) {
    console.error('[SESSION_REVOKE_ERROR]', err.message)
    return false
  }
}

export async function updateAdminProfile(adminId, { username, email, currentPassword }) {
  // Verify current password first
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { passwordHash: true, username: true, email: true },
  })

  if (!admin) {
    throw new Error('USER_NOT_FOUND')
  }

  const valid = await verifyPassword(currentPassword, admin.passwordHash)
  if (!valid) {
    throw new Error('INVALID_PASSWORD')
  }

  // Check if username is taken by another user
  if (username && username !== admin.username) {
    const existing = await prisma.admin.findUnique({
      where: { username },
      select: { id: true },
    })
    if (existing && existing.id !== adminId) {
      throw new Error('USERNAME_TAKEN')
    }
  }

  // Check if email is taken by another user
  if (email && email !== admin.email) {
    const existing = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    })
    if (existing && existing.id !== adminId) {
      throw new Error('EMAIL_TAKEN')
    }
  }

  // Update the admin profile
  const updated = await prisma.admin.update({
    where: { id: adminId },
    data: {
      username: username || admin.username,
      email: email ? email.toLowerCase() : admin.email,
    },
  })

  return updated
}
