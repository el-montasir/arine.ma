import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tables = [
    'products',
    'categories',
    'orders',
    'order_items',
    'admins',
    'packages',
    'package_items',
    'package_images',
    'product_images',
    'banners',
  ]

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`
        SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM "${table}"), 1), true);
      `)
      console.log(`✅ Reset sequence for ${table}_id_seq`)
    } catch (err) {
      console.warn(`⚠️ Could not reset sequence for ${table}:`, err.message)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
