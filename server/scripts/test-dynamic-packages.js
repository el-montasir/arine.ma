import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = 'http://localhost:4000'

async function runDynamicPackageTests() {
  console.log('🚀 Starting Comprehensive Dynamic Package Test Suite...\n')

  // Step 1: Admin Login
  console.log('1️⃣ Authenticating as Admin...')
  let loginRes = await fetch(`${BASE}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin@arine.ma',
      password: 'admin123',
    }),
  })

  if (!loginRes.ok) {
    loginRes = await fetch(`${BASE}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
      }),
    })
  }

  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status} ${await loginRes.text()}`)
  }

  const cookieHeader = loginRes.headers.get('set-cookie')
  const sessionCookie = cookieHeader.split(';')[0]
  console.log('   ✅ Admin session obtained.')

  // Step 2: Ensure we have at least 15 books in the database to test dynamic sizes
  console.log('\n2️⃣ Fetching existing catalog books...')
  const existingProducts = await prisma.product.findMany({
    orderBy: { id: 'asc' },
    take: 20,
  })

  console.log(`   Found ${existingProducts.length} books in DB.`)

  let allProducts = [...existingProducts]
  if (allProducts.length < 15) {
    console.log('   Creating additional sample books for testing up to 15+ items...')
    const category = await prisma.category.findFirst()
    const catId = category ? category.id : 1

    for (let i = allProducts.length + 1; i <= 15; i++) {
      const newBook = await prisma.product.create({
        data: {
          title: `كتاب علمي اختباري رقم ${i}`,
          author: `المؤلف التجريبي ${i}`,
          categoryId: catId,
          price: 50 + i * 5,
          costPrice: 30 + i * 3,
          oldPrice: 70 + i * 5,
          discount: 10,
          availability: 'in-stock',
          description: `وصف الكتاب التجريبي رقم ${i}`,
          rating: 5,
        },
      })
      allProducts.push(newBook)
    }
    console.log(`   ✅ DB now has ${allProducts.length} books.`)
  }

  const bookIds = allProducts.map((p) => p.id)

  // Step 3: Test cases for different package book counts: 1, 2, 3, 5, 12
  const testCases = [
    { count: 1, title: 'باقة الفرد الواحد (كتاب واحد فقط)' },
    { count: 2, title: 'باقة الثنائي العلمي (كتابان اثنان)' },
    { count: 3, title: 'باقة الثلاثي المتميز (3 كتب)' },
    { count: 5, title: 'باقة الخماسي المعرفي (5 كتب)' },
    { count: 12, title: 'مكتبة الباحث الشاملة الكبرى (12 كتاباً)' },
  ]

  const createdPackages = []

  console.log('\n3️⃣ Testing Package Creation via Admin API for Various Counts...')
  for (const tc of testCases) {
    const selectedIds = bookIds.slice(0, tc.count)
    console.log(`\n   📦 Creating Package: "${tc.title}" with exactly ${tc.count} books...`)

    const payload = {
      title: tc.title,
      description: `باقة اختبارية تم إنشاؤها للتحقق من دعم السيرفر وقاعدة البيانات والواجهة لعدد ${tc.count} كتب بدون أي قيود.`,
      price: tc.count * 45,
      costPrice: tc.count * 25,
      oldPrice: tc.count * 60,
      discount: 25,
      availability: 'in-stock',
      image: null,
      images: [],
      isNew: true,
      isPopular: tc.count >= 5,
      bookIds: selectedIds,
    }

    const createRes = await fetch(`${BASE}/api/admin/packages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify(payload),
    })

    const createJson = await createRes.json()
    if (!createRes.ok || !createJson.success) {
      throw new Error(`Failed to create package with ${tc.count} books: ${JSON.stringify(createJson)}`)
    }

    const pkgData = createJson.data
    createdPackages.push(pkgData)
    console.log(`      ✅ Package Created with ID: ${pkgData.id}`)
    console.log(`      - Returned books array length: ${pkgData.books?.length}`)
    console.log(`      - Returned booksCount: ${pkgData.booksCount}`)

    if (pkgData.books?.length !== tc.count) {
      throw new Error(`Expected ${tc.count} books in response, got ${pkgData.books?.length}`)
    }
  }

  // Step 4: Verify Database Records (Prisma Junction Records)
  console.log('\n4️⃣ Verifying Prisma Database Junction Tables (PackageItem)...')
  for (const pkg of createdPackages) {
    const dbItems = await prisma.packageItem.findMany({
      where: { packageId: pkg.id },
      orderBy: { sortOrder: 'asc' },
      include: { product: true },
    })

    const expectedCount = pkg.books.length
    console.log(`   - Package ID ${pkg.id} ("${pkg.title}"): DB has ${dbItems.length} PackageItem records.`)

    if (dbItems.length !== expectedCount) {
      throw new Error(`DB mismatch: expected ${expectedCount} items for pkg ${pkg.id}, got ${dbItems.length}`)
    }

    // Verify sortOrder is sequential from 0 to expectedCount - 1
    for (let i = 0; i < dbItems.length; i++) {
      if (dbItems[i].sortOrder !== i) {
        throw new Error(`Sort order mismatch at index ${i}: got ${dbItems[i].sortOrder}`)
      }
    }
    console.log(`     ✅ Sort order verified strictly (0 to ${dbItems.length - 1}).`)
  }

  // Step 5: Verify Public Storefront GET /api/packages/:id Endpoint
  console.log('\n5️⃣ Verifying Public Storefront GET /api/packages/:id endpoint...')
  for (const pkg of createdPackages) {
    const publicRes = await fetch(`${BASE}/api/packages/${pkg.id}`)
    const publicJson = await publicRes.json()

    if (!publicRes.ok || !publicJson.success) {
      throw new Error(`Public fetch failed for package ${pkg.id}: ${JSON.stringify(publicJson)}`)
    }

    const publicPkg = publicJson.data
    console.log(`   - Public Package ID ${publicPkg.id}: returned ${publicPkg.books?.length} books, booksCount = ${publicPkg.booksCount}`)

    if (publicPkg.books?.length !== pkg.books.length) {
      throw new Error(`Public API returned ${publicPkg.books?.length} books, expected ${pkg.books.length}`)
    }

    // Verify all book details are serialized completely
    for (const book of publicPkg.books) {
      if (!book.id || !book.title || typeof book.price !== 'number') {
        throw new Error(`Incomplete book object in public package: ${JSON.stringify(book)}`)
      }
    }
    console.log(`     ✅ All ${publicPkg.books.length} book objects serialized completely without slicing.`)
  }

  // Step 6: Verify Package Update / Reordering / Changing Book Counts
  console.log('\n6️⃣ Testing Dynamic Modification (Changing a 12-book package to 7 books)...')
  const largePkg = createdPackages[createdPackages.length - 1]
  const newBookIds = bookIds.slice(2, 9) // 7 books

  const updateRes = await fetch(`${BASE}/api/admin/packages/${largePkg.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      title: 'مكتبة الباحث المعدلة (7 كتب مختارة)',
      description: 'تم تحديث عدد الكتب ديناميكياً إلى 7 كتب.',
      price: 290,
      costPrice: 170,
      oldPrice: 380,
      discount: 24,
      availability: 'in-stock',
      image: null,
      images: [],
      isNew: true,
      isPopular: true,
      bookIds: newBookIds,
    }),
  })

  const updateJson = await updateRes.json()
  if (!updateRes.ok || !updateJson.success) {
    throw new Error(`Update failed: ${JSON.stringify(updateJson)}`)
  }

  const updatedPkg = updateJson.data
  console.log(`   ✅ Package updated: new books count = ${updatedPkg.books?.length}`)
  if (updatedPkg.books?.length !== 7) {
    throw new Error(`Expected 7 books after update, got ${updatedPkg.books?.length}`)
  }

  console.log('\n🎉 ALL DYNAMIC PACKAGE TESTS (1, 2, 3, 5, 12 BOOKS) PASSED WITH 100% SUCCESS!')
}

runDynamicPackageTests()
  .catch((err) => {
    console.error('\n❌ Dynamic Package Tests Failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
