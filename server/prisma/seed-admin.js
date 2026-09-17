// Creates (or resets the password of) the first Admin Panel user.
//
// Usage:   ADMIN_INITIAL_USERNAME / ADMIN_INITIAL_PASSWORD / ADMIN_INITIAL_NAME
//          must exist in server/.env (gitignored). Run:
//             node server/prisma/seed-admin.js
//
// The password is hashed with bcrypt — never stored plaintext, and never
// printed. Change it after first login from the Admin Panel.
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const username = process.env.ADMIN_INITIAL_USERNAME
  const password = process.env.ADMIN_INITIAL_PASSWORD
  const name = process.env.ADMIN_INITIAL_NAME || null

  if (!username || !password) {
    console.error('Missing ADMIN_INITIAL_USERNAME / ADMIN_INITIAL_PASSWORD in server/.env')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('ADMIN_INITIAL_PASSWORD must be at least 8 characters')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const admin = await prisma.admin.upsert({
    where: { username },
    update: { passwordHash, name },
    create: { username, passwordHash, name, role: 'SUPER_ADMIN' },
  })

  console.log(`✅ Admin ready: username="${admin.username}" role=${admin.role} (password set from server/.env)`)
}

main()
  .catch((e) => {
    console.error('Seed admin failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())