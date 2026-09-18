#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateProductImages() {
  console.log('🔄 Migrating existing product images to ProductImage table...')

  try {
    // Find all products with an image URL
    const products = await prisma.product.findMany({
      where: {
        image: { not: null }
      },
      include: {
        images: true
      }
    })

    console.log(`Found ${products.length} products with images`)

    let migrated = 0
    let skipped = 0

    for (const product of products) {
      // Skip if product already has images in ProductImage table
      if (product.images.length > 0) {
        console.log(`  ⏭️  Product ${product.id} (${product.title}) already has ${product.images.length} images, skipping`)
        skipped++
        continue
      }

      // Create ProductImage entry from legacy image field
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: product.image,
          sortOrder: 0,
          isPrimary: true
        }
      })

      console.log(`  ✅ Migrated image for product ${product.id} (${product.title})`)
      migrated++
    }

    console.log(`\n✨ Migration complete!`)
    console.log(`   Migrated: ${migrated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Total: ${products.length}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrateProductImages()
