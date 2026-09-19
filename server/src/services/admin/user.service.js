import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../utils/password.js'

const SAFE_ADMIN_SELECT = {
  id: true,
  username: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  status: true,
  permissions: true,
  isActive: true,
  lastLoginAt: true,
  notes: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
}

export async function revokeAdminSessions(adminId) {
  try {
    const id = parseInt(adminId, 10)
    await prisma.$executeRawUnsafe(
      `DELETE FROM session WHERE (sess->>'adminId')::int = $1`,
      id
    )
    return true
  } catch (err) {
    console.error(`[SESSION_REVOCATION_ERROR] Failed to revoke sessions for admin ${adminId}:`, err.message)
    return false
  }
}

export async function listUsers({
  page = 1,
  limit = 20,
  search = null,
  status = null,
  role = null,
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
  const skip = (pageNum - 1) * limitNum

  const where = {}

  if (status) {
    where.status = status
  }

  if (role) {
    where.role = role
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim()
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { username: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term, mode: 'insensitive' } },
    ]
  }

  const [total, users, totalActive, totalInactive, totalSuspended] = await Promise.all([
    prisma.admin.count({ where }),
    prisma.admin.findMany({
      where,
      select: SAFE_ADMIN_SELECT,
      orderBy: [{ role: 'asc' }, { id: 'asc' }],
      skip,
      take: limitNum,
    }),
    prisma.admin.count({ where: { status: 'ACTIVE', isActive: true } }),
    prisma.admin.count({ where: { status: 'INACTIVE' } }),
    prisma.admin.count({ where: { status: 'SUSPENDED' } }),
  ])

  return {
    users,
    stats: {
      total: totalActive + totalInactive + totalSuspended,
      active: totalActive,
      inactive: totalInactive,
      suspended: totalSuspended,
    },
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  }
}

export async function getUserById(id) {
  const adminId = parseInt(id, 10)
  return prisma.admin.findUnique({
    where: { id: adminId },
    select: SAFE_ADMIN_SELECT,
  })
}

export async function createUser(data, creatorAdmin) {
  const normalizedEmail = data.email.toLowerCase().trim()
  const username = data.username?.trim() || normalizedEmail

  // Check unique constraints
  const existingEmail = await prisma.admin.findUnique({
    where: { email: normalizedEmail },
  })
  if (existingEmail) {
    const err = new Error('البريد الإلكتروني مستخدم بالفعل')
    err.code = 'EMAIL_EXISTS'
    err.status = 409
    throw err
  }

  const existingUsername = await prisma.admin.findUnique({
    where: { username },
  })
  if (existingUsername) {
    const err = new Error('اسم المستخدم موجود بالفعل')
    err.code = 'USERNAME_EXISTS'
    err.status = 409
    throw err
  }

  const passwordHash = await hashPassword(data.password)
  const status = data.status || 'ACTIVE'
  const isActive = status === 'ACTIVE'

  return prisma.admin.create({
    data: {
      name: data.name.trim(),
      email: normalizedEmail,
      username,
      phone: data.phone?.trim() || null,
      passwordHash,
      role: data.role,
      status,
      permissions: data.role === 'SUPER_ADMIN' ? [] : (data.permissions || []),
      isActive,
      notes: data.notes?.trim() || null,
      createdBy: creatorAdmin?.id || null,
    },
    select: SAFE_ADMIN_SELECT,
  })
}

export async function updateUser(id, data, currentAdmin) {
  const adminId = parseInt(id, 10)
  const target = await prisma.admin.findUnique({ where: { id: adminId } })
  if (!target) {
    const err = new Error('المستخدم غير موجود')
    err.code = 'USER_NOT_FOUND'
    err.status = 404
    throw err
  }

  // Privilege escalation check: Non-SUPER_ADMIN cannot change role to SUPER_ADMIN
  if (currentAdmin.role !== 'SUPER_ADMIN' && data.role === 'SUPER_ADMIN') {
    const err = new Error('لا تملك صلاحية ترقية المستخدم لمدير رئيسي')
    err.code = 'FORBIDDEN'
    err.status = 403
    throw err
  }

  // Last owner protection: Cannot demote or disable the last active SUPER_ADMIN
  if (target.role === 'SUPER_ADMIN' && (data.role === 'ADMIN' || (data.status && data.status !== 'ACTIVE'))) {
    const activeSuperAdmins = await prisma.admin.count({
      where: { role: 'SUPER_ADMIN', status: 'ACTIVE', isActive: true },
    })
    if (activeSuperAdmins <= 1 && target.status === 'ACTIVE') {
      const err = new Error('لا يمكن تعديل أو تعطيل المدير الرئيسي الوحيد في النظام')
      err.code = 'LAST_OWNER_PROTECTION'
      err.status = 400
      throw err
    }
  }

  const updateData = {}

  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null
  if (data.role !== undefined) updateData.role = data.role
  if (data.permissions !== undefined) {
    updateData.permissions = data.role === 'SUPER_ADMIN' ? [] : data.permissions
  }

  if (data.email) {
    const normalizedEmail = data.email.toLowerCase().trim()
    if (normalizedEmail !== target.email) {
      const emailConflict = await prisma.admin.findUnique({
        where: { email: normalizedEmail },
      })
      if (emailConflict && emailConflict.id !== adminId) {
        const err = new Error('البريد الإلكتروني مستخدم بالفعل')
        err.code = 'EMAIL_EXISTS'
        err.status = 409
        throw err
      }
      updateData.email = normalizedEmail
    }
  }

  if (data.status) {
    updateData.status = data.status
    updateData.isActive = data.status === 'ACTIVE'
    if (data.status !== 'ACTIVE') {
      await revokeAdminSessions(adminId)
    }
  }

  return prisma.admin.update({
    where: { id: adminId },
    data: updateData,
    select: SAFE_ADMIN_SELECT,
  })
}

export async function updateUserStatus(id, status, currentAdmin) {
  const adminId = parseInt(id, 10)
  const target = await prisma.admin.findUnique({ where: { id: adminId } })
  if (!target) {
    const err = new Error('المستخدم غير موجود')
    err.code = 'USER_NOT_FOUND'
    err.status = 404
    throw err
  }

  // Last owner protection
  if (target.role === 'SUPER_ADMIN' && status !== 'ACTIVE') {
    const activeSuperAdmins = await prisma.admin.count({
      where: { role: 'SUPER_ADMIN', status: 'ACTIVE', isActive: true },
    })
    if (activeSuperAdmins <= 1) {
      const err = new Error('لا يمكن تعطيل المدير الرئيسي الوحيد في النظام')
      err.code = 'LAST_OWNER_PROTECTION'
      err.status = 400
      throw err
    }
  }

  const isActive = status === 'ACTIVE'
  const updated = await prisma.admin.update({
    where: { id: adminId },
    data: { status, isActive },
    select: SAFE_ADMIN_SELECT,
  })

  if (!isActive) {
    await revokeAdminSessions(adminId)
  }

  return updated
}

export async function resetUserPassword(id, newPassword, revokeSessions = true) {
  const adminId = parseInt(id, 10)
  const target = await prisma.admin.findUnique({ where: { id: adminId } })
  if (!target) {
    const err = new Error('المستخدم غير موجود')
    err.code = 'USER_NOT_FOUND'
    err.status = 404
    throw err
  }

  const passwordHash = await hashPassword(newPassword)
  const updated = await prisma.admin.update({
    where: { id: adminId },
    data: { passwordHash },
    select: SAFE_ADMIN_SELECT,
  })

  if (revokeSessions) {
    await revokeAdminSessions(adminId)
  }

  return updated
}

export async function deleteUser(id, currentAdmin) {
  const adminId = parseInt(id, 10)
  const target = await prisma.admin.findUnique({ where: { id: adminId } })
  if (!target) {
    const err = new Error('المستخدم غير موجود')
    err.code = 'USER_NOT_FOUND'
    err.status = 404
    throw err
  }

  if (target.role === 'SUPER_ADMIN') {
    const activeSuperAdmins = await prisma.admin.count({
      where: { role: 'SUPER_ADMIN' },
    })
    if (activeSuperAdmins <= 1) {
      const err = new Error('لا يمكن حذف المدير الرئيسي الوحيد في النظام')
      err.code = 'LAST_OWNER_PROTECTION'
      err.status = 400
      throw err
    }
  }

  // Revoke sessions first
  await revokeAdminSessions(adminId)

  // Soft/Hard delete: delete record
  return prisma.admin.delete({
    where: { id: adminId },
    select: SAFE_ADMIN_SELECT,
  })
}
