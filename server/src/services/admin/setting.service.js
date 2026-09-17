import { prisma } from '../../lib/prisma.js'

// Only non-secret settings are stored here. Anything involving credentials or
// API tokens (delivery company keys, etc.) lives in server-side env vars only.
export async function listSettings() {
  const rows = await prisma.setting.findMany({ orderBy: { key: 'asc' } })
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export async function upsertSetting(key, value) {
  return prisma.setting.upsert({
    where: { key },
    update: { value, updatedAt: new Date() },
    create: { key, value },
  })
}