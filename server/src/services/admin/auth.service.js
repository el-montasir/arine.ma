import { prisma } from '../../lib/prisma.js'
import { hashPassword, verifyPassword } from '../../utils/password.js'

// The passwordHash must never leave the server. This is the only representation
// of an admin that any API may return.
export function serializeAdmin(admin) {
  return { id: admin.id, username: admin.username, name: admin.name, role: admin.role }
}

// Returns {admin} on success, {disabled:true} for a locked account, or null on
// bad credentials. Cost of a failed lookup is paid for both paths (no account
// enumeration via timing).
export async function authenticate(username, password) {
  const admin = await prisma.admin.findUnique({ where: { username } })
  const valid = admin && (await verifyPassword(password, admin.passwordHash))
  if (!valid) return null
  if (!admin.isActive) return { disabled: true }
  return { admin }
}

export async function updateAdminPassword(adminId, newPassword) {
  const passwordHash = await hashPassword(newPassword)
  return prisma.admin.update({ where: { id: adminId }, data: { passwordHash } })
}