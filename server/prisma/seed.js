// Seed — loads the existing Arine frontend catalog (src/data/books.js + categories.js)
// into PostgreSQL. Deterministic and safe to run more than once:
// it resets the catalog data and preserves the original numeric product IDs (1..18)
// so the frontend cart/favorites (keyed by numeric id) keep working.
import { PrismaClient } from '@prisma/client'
import books from '../../src/data/books.js'
import categories from '../../src/data/categories.js'

const prisma = new PrismaClient()

async function main() {
  await prisma.$transaction(async (tx) => {
    // Wipe in dependency-safe order (orders reference products, items reference orders)
    await tx.orderItem.deleteMany()
    await tx.order.deleteMany()
    await tx.product.deleteMany()
    await tx.category.deleteMany()

    // Categories (preserve original ids)
    for (const cat of categories) {
      await tx.category.create({
        data: { id: cat.id, name: cat.name, slug: cat.slug },
      })
    }

    // Products (preserve original ids)
    for (const book of books) {
      const category = categories.find((c) => c.name === book.category)
      if (!category) {
        throw new Error(`Unknown category "${book.category}" for book "${book.title}"`)
      }
      await tx.product.create({
        data: {
          id: book.id,
          title: book.title,
          author: book.author,
          categoryId: category.id,
          price: book.price,
          oldPrice: book.oldPrice ?? null,
          discount: book.discount ?? 0,
          image: book.image ?? null,
          availability: book.availability ?? 'in-stock',
          description: book.description ?? null,
          rating: book.rating ?? 5,
          isNew: book.isNew ?? false,
          isPopular: book.isPopular ?? false,
          pages: book.pages ?? null,
          publisher: book.publisher ?? null,
          year: book.year != null ? String(book.year) : null,
        },
      })
    }
  })

  // Explicit-id inserts above don't advance the id sequences; realign each
  // sequence to its current max so future app inserts never collide with a
  // preserved id (would otherwise surface as a P2002 unique violation).
  await Promise.all(
    ['products', 'categories', 'orders', 'order_items', 'admins'].map((t) =>
      prisma.$executeRawUnsafe(
        `SELECT setval('${t}_id_seq', (SELECT COALESCE(MAX(id),1) FROM ${t}))`,
      ),
    ),
  )

  const [p, c] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
  ])
  console.log(`✅ Seeded ${p} products in ${c} categories`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())