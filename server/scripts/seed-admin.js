import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/utils/password.js'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await hashPassword('admin123')

  // Seed default admin accounts
  const admin1 = await prisma.admin.upsert({
    where: { username: 'admin@arine.ma' },
    update: {
      passwordHash,
      isActive: true,
      role: 'SUPER_ADMIN',
    },
    create: {
      username: 'admin@arine.ma',
      name: 'مدير النظام الرئيسي',
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })

  const admin2 = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      isActive: true,
      role: 'SUPER_ADMIN',
    },
    create: {
      username: 'admin',
      name: 'مدير النظام',
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })

  console.log('✅ Admin accounts ensured:', admin1.username, admin2.username)
}

main()
  .catch((e) => {
    console.error('Failed to seed admin:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
