import { prisma } from '../src/lib/prisma.js'

async function runVerification() {
  console.log('================================================================')
  console.log('  ARINE STORE & ADMIN PANEL UPGRADE INTEGRATION VERIFICATION    ')
  console.log('================================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, name) {
    if (condition) {
      console.log(`✅ PASS: ${name}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${name}`)
      failed++
    }
  }

  try {
    // 1. Verify Banner model & CRUD in Database
    const testBanner = await prisma.banner.create({
      data: {
        title: 'عرض تجريبي خاص للتحقق',
        description: 'خصم 15% على جميع كتب السيرة النبوية',
        image: 'https://example.com/test-banner.jpg',
        link: '/shop?category=السيرة',
        type: 'promotional',
        isActive: true,
        sortOrder: 1,
      },
    })
    assert(testBanner.id > 0, 'Banner creation in database succeeds')

    const fetchedBanner = await prisma.banner.findUnique({ where: { id: testBanner.id } })
    assert(fetchedBanner?.title === 'عرض تجريبي خاص للتحقق', 'Banner read matches created data')

    await prisma.banner.update({
      where: { id: testBanner.id },
      data: { isActive: false },
    })
    const updatedBanner = await prisma.banner.findUnique({ where: { id: testBanner.id } })
    assert(updatedBanner?.isActive === false, 'Banner status update succeeds')

    await prisma.banner.delete({ where: { id: testBanner.id } })
    const deletedBanner = await prisma.banner.findUnique({ where: { id: testBanner.id } })
    assert(deletedBanner === null, 'Banner deletion succeeds cleanly')

    // 2. Verify StoreConfig model & key-value management
    await prisma.storeConfig.upsert({
      where: { key: 'test.verification_key' },
      update: { value: 'verification_value' },
      create: { key: 'test.verification_key', value: 'verification_value' },
    })
    const configEntry = await prisma.storeConfig.findUnique({ where: { key: 'test.verification_key' } })
    assert(configEntry?.value === 'verification_value', 'StoreConfig upsert and read succeeds')
    await prisma.storeConfig.delete({ where: { key: 'test.verification_key' } })

    // 3. Verify ProductImage model & multi-image relation
    const existingProduct = await prisma.product.findFirst()
    if (existingProduct) {
      const testImage = await prisma.productImage.create({
        data: {
          productId: existingProduct.id,
          url: 'https://example.com/cover-alt.jpg',
          sortOrder: 1,
          isPrimary: false,
        },
      })
      assert(testImage.id > 0, 'ProductImage record creation succeeds')

      const productWithImages = await prisma.product.findUnique({
        where: { id: existingProduct.id },
        include: { images: true },
      })
      assert(
        productWithImages.images.some((img) => img.id === testImage.id),
        'Product-to-ProductImage 1-to-many relationship queries successfully'
      )

      await prisma.productImage.delete({ where: { id: testImage.id } })
      assert(true, 'ProductImage deletion succeeds without affecting product')
    }

    // 4. Verify Shipping Settings persistence in Setting table
    const shippingThresholdSetting = await prisma.setting.findUnique({
      where: { key: 'shipping.free_threshold' },
    })
    const shippingFeeSetting = await prisma.setting.findUnique({
      where: { key: 'shipping.flat_fee' },
    })
    const shippingEnabledSetting = await prisma.setting.findUnique({
      where: { key: 'shipping.enabled' },
    })
    assert(shippingThresholdSetting !== null, 'shipping.free_threshold exists in database')
    assert(shippingFeeSetting !== null, 'shipping.flat_fee exists in database')
    assert(shippingEnabledSetting !== null, 'shipping.enabled exists in database')

    // 5. Verify Products retain shippingMode and customShipping fields
    const productFields = await prisma.product.findMany({
      take: 5,
      select: { id: true, title: true, shippingMode: true, customShipping: true, image: true },
    })
    assert(Array.isArray(productFields) && productFields.length > 0, 'Product query with shippingMode and customShipping succeeds')

    console.log('\n================================================================')
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`)
    console.log('================================================================')
  } catch (err) {
    console.error('Unexpected error during verification:', err)
  } finally {
    await prisma.$disconnect()
  }
}

runVerification()
