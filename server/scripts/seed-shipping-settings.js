#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedShippingSettings() {
  console.log('🔄 Seeding default shipping settings...')

  try {
    const settings = [
      { key: 'shipping.free_threshold', value: '300' },
      { key: 'shipping.flat_fee', value: '25' },
      { key: 'shipping.free_enabled', value: 'true' }
    ]

    for (const setting of settings) {
      const existing = await prisma.setting.findUnique({
        where: { key: setting.key }
      })

      if (existing) {
        console.log(`  ⏭️  Setting ${setting.key} already exists (value: ${existing.value}), skipping`)
      } else {
        await prisma.setting.create({ data: setting })
        console.log(`  ✅ Created setting ${setting.key} = ${setting.value}`)
      }
    }

    console.log('\n✨ Shipping settings seeded successfully!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedShippingSettings()
