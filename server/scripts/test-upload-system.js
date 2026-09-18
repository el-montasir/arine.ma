import fs from 'fs'
import path from 'path'
import http from 'http'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runTests() {
  console.log('🚀 Starting Comprehensive Real Upload System Tests...\n')

  const BASE = 'http://localhost:4000'

  // Step 1: Admin Login to get session cookie
  console.log('1️⃣ Testing Admin Authentication...')
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
    throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`)
  }

  const cookieHeader = loginRes.headers.get('set-cookie')
  if (!cookieHeader) {
    throw new Error('No set-cookie header received from admin login')
  }
  const sessionCookie = cookieHeader.split(';')[0]
  console.log('   ✅ Admin login successful, session cookie obtained.')

  // Step 2: Create temporary test image files (JPG, PNG, WEBP, TXT, Oversized)
  const testTmpDir = path.resolve(__dirname, '../tmp_test_files')
  if (!fs.existsSync(testTmpDir)) {
    fs.mkdirSync(testTmpDir, { recursive: true })
  }

  // 1x1 8-bit PNG
  const validPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  )
  const pngPath = path.join(testTmpDir, 'test-cover.png')
  fs.writeFileSync(pngPath, validPngBuffer)

  // 1x1 JPEG
  const validJpgBuffer = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    'base64'
  )
  const jpgPath = path.join(testTmpDir, 'test-book.jpg')
  fs.writeFileSync(jpgPath, validJpgBuffer)

  // 1x1 WEBP
  const validWebpBuffer = Buffer.from(
    'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
    'base64'
  )
  const webpPath = path.join(testTmpDir, 'test-package.webp')
  fs.writeFileSync(webpPath, validWebpBuffer)

  // Invalid TXT
  const invalidTxtPath = path.join(testTmpDir, 'bad-file.txt')
  fs.writeFileSync(invalidTxtPath, 'This is not an image file')

  // Oversized 6MB dummy file
  const oversizedPath = path.join(testTmpDir, 'oversized.jpg')
  const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 0xff)
  fs.writeFileSync(oversizedPath, largeBuffer)

  // Step 3: Test Uploading Valid Product Images (Multipart FormData)
  console.log('\n2️⃣ Testing Valid Product Image Upload (JPG & PNG)...')
  const productFormData = new FormData()
  productFormData.append(
    'images',
    new Blob([fs.readFileSync(jpgPath)], { type: 'image/jpeg' }),
    'test-book.jpg'
  )
  productFormData.append(
    'images',
    new Blob([fs.readFileSync(pngPath)], { type: 'image/png' }),
    'test-cover.png'
  )

  const uploadProductRes = await fetch(`${BASE}/api/admin/uploads/products`, {
    method: 'POST',
    headers: {
      Cookie: sessionCookie,
    },
    body: productFormData,
  })

  const uploadProductJson = await uploadProductRes.json()
  if (!uploadProductRes.ok || !uploadProductJson.success) {
    throw new Error(`Product upload failed: ${JSON.stringify(uploadProductJson)}`)
  }

  const uploadedProductImages = uploadProductJson.files || uploadProductJson.data
  console.log('   ✅ Uploaded', uploadedProductImages.length, 'product images successfully:')
  uploadedProductImages.forEach((img) => console.log('      - URL:', img.url))

  // Step 4: Test Uploading Valid Package Image (WEBP)
  console.log('\n3️⃣ Testing Valid Package Image Upload (WEBP)...')
  const packageFormData = new FormData()
  packageFormData.append(
    'images',
    new Blob([fs.readFileSync(webpPath)], { type: 'image/webp' }),
    'test-package.webp'
  )

  const uploadPackageRes = await fetch(`${BASE}/api/admin/uploads/packages`, {
    method: 'POST',
    headers: {
      Cookie: sessionCookie,
    },
    body: packageFormData,
  })

  const uploadPackageJson = await uploadPackageRes.json()
  if (!uploadPackageRes.ok || !uploadPackageJson.success) {
    throw new Error(`Package upload failed: ${JSON.stringify(uploadPackageJson)}`)
  }

  const uploadedPackageImages = uploadPackageJson.files || [uploadPackageJson.data]
  console.log('   ✅ Uploaded package image successfully:', uploadedPackageImages[0].url)

  // Step 5: Test Rejecting Invalid File Type (.txt)
  console.log('\n4️⃣ Testing Invalid File Type Rejection (.txt)...')
  const badTypeFormData = new FormData()
  badTypeFormData.append(
    'images',
    new Blob([fs.readFileSync(invalidTxtPath)], { type: 'text/plain' }),
    'bad-file.txt'
  )

  const badTypeRes = await fetch(`${BASE}/api/admin/uploads/products`, {
    method: 'POST',
    headers: { Cookie: sessionCookie },
    body: badTypeFormData,
  })
  const badTypeJson = await badTypeRes.json()

  if (badTypeRes.status === 400 && badTypeJson.error?.code === 'INVALID_FILE_TYPE') {
    console.log('   ✅ Correctly rejected invalid file type (400 INVALID_FILE_TYPE):', badTypeJson.error.message)
  } else {
    throw new Error(`Expected 400 INVALID_FILE_TYPE but got: ${badTypeRes.status} ${JSON.stringify(badTypeJson)}`)
  }

  // Step 6: Test Rejecting Oversized File (>5MB)
  console.log('\n5️⃣ Testing Oversized File Rejection (>5MB)...')
  const oversizedFormData = new FormData()
  oversizedFormData.append(
    'images',
    new Blob([fs.readFileSync(oversizedPath)], { type: 'image/jpeg' }),
    'oversized.jpg'
  )

  const oversizedRes = await fetch(`${BASE}/api/admin/uploads/products`, {
    method: 'POST',
    headers: { Cookie: sessionCookie },
    body: oversizedFormData,
  })
  const oversizedJson = await oversizedRes.json()

  if (oversizedRes.status === 400 && oversizedJson.error?.code === 'FILE_TOO_LARGE') {
    console.log('   ✅ Correctly rejected oversized file (400 FILE_TOO_LARGE):', oversizedJson.error.message)
  } else {
    throw new Error(`Expected 400 FILE_TOO_LARGE but got: ${oversizedRes.status} ${JSON.stringify(oversizedJson)}`)
  }

  // Step 7: Test Creating a Book Product with the uploaded image URLs
  console.log('\n6️⃣ Testing Product Creation with Uploaded Image URLs...')
  const primaryProductImageUrl = uploadedProductImages[0].url
  const allProductImageUrls = uploadedProductImages.map((img) => img.url)

  const createProductRes = await fetch(`${BASE}/api/admin/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      title: 'كتاب الاختبار التجريبي مع الصور المرفوعة',
      author: 'الشيخ الفاضل',
      categoryId: 1,
      price: 180,
      costPrice: 110,
      oldPrice: 220,
      discount: 18,
      availability: 'in-stock',
      image: primaryProductImageUrl,
      images: allProductImageUrls,
      description: 'كتاب تم إنشاؤه لاختبار نظام رفع الصور الفعلي والتخزين المحلي على السيرفر.',
      rating: 5,
      isNew: true,
      isPopular: true,
      pages: 350,
      publisher: 'دار العلم والنور',
      year: '2026',
    }),
  })

  const createProductJson = await createProductRes.json()
  if (!createProductRes.ok || !createProductJson.success) {
    throw new Error(`Product creation failed: ${JSON.stringify(createProductJson)}`)
  }

  const createdBook = createProductJson.data
  console.log('   ✅ Book created in DB with ID:', createdBook.id)
  console.log('      - Primary Image:', createdBook.image)
  console.log('      - ProductImage rows:', createdBook.images?.length)

  // Step 8: Test Creating a Package with the uploaded package image URL
  console.log('\n7️⃣ Testing Package Creation with Uploaded Image URL...')
  const packageImageUrl = uploadedPackageImages[0].url

  const createPackageRes = await fetch(`${BASE}/api/admin/packages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      title: 'باقة الاختبار التجريبية الشاملة',
      description: 'باقة مجمعة تضم كتباً مختارة مع صور مرفوعة فعلياً على السيرفر.',
      price: 320,
      costPrice: 200,
      oldPrice: 400,
      discount: 20,
      availability: 'in-stock',
      image: packageImageUrl,
      images: [packageImageUrl],
      isNew: true,
      isPopular: true,
      bookIds: [createdBook.id, 1],
    }),
  })

  const createPackageJson = await createPackageRes.json()
  if (!createPackageRes.ok || !createPackageJson.success) {
    throw new Error(`Package creation failed: ${JSON.stringify(createPackageJson)}`)
  }

  const createdPackage = createPackageJson.data
  console.log('   ✅ Package created in DB with ID:', createdPackage.id)
  console.log('      - Primary Image:', createdPackage.image)
  console.log('      - Included Books:', createdPackage.books?.length)

  // Step 9: Test Public Storefront Fetch for Book and Package
  console.log('\n8️⃣ Testing Public Storefront Catalog APIs...')
  const publicBookRes = await fetch(`${BASE}/api/products/${createdBook.id}`)
  const publicBookJson = await publicBookRes.json()
  if (!publicBookRes.ok || !publicBookJson.success) {
    throw new Error(`Public book fetch failed: ${JSON.stringify(publicBookJson)}`)
  }
  console.log('   ✅ Storefront Book retrieved:', publicBookJson.data.title)
  console.log('      - Image URL on storefront:', publicBookJson.data.image)

  const publicPackageRes = await fetch(`${BASE}/api/packages/${createdPackage.id}`)
  const publicPackageJson = await publicPackageRes.json()
  if (!publicPackageRes.ok || !publicPackageJson.success) {
    throw new Error(`Public package fetch failed: ${JSON.stringify(publicPackageJson)}`)
  }
  console.log('   ✅ Storefront Package retrieved:', publicPackageJson.data.title)
  console.log('      - Image URL on storefront:', publicPackageJson.data.image)

  // Step 10: Test Static File Serving & CORP / Headers
  console.log('\n9️⃣ Testing Static File Serving via HTTP GET on /uploads/...')
  const staticFileRes = await fetch(`${BASE}${primaryProductImageUrl}`)
  if (!staticFileRes.ok) {
    throw new Error(`Static file serving failed with status ${staticFileRes.status}`)
  }
  const corpHeader = staticFileRes.headers.get('cross-origin-resource-policy')
  console.log('   ✅ Static image served with HTTP', staticFileRes.status)
  console.log('      - Content-Type:', staticFileRes.headers.get('content-type'))
  console.log('      - Cross-Origin-Resource-Policy:', corpHeader)
  console.log('      - Content-Length:', staticFileRes.headers.get('content-length'), 'bytes')

  // Clean up test files
  fs.rmSync(testTmpDir, { recursive: true, force: true })

  console.log('\n🎉 ALL 9 TEST SUITES PASSED FLAWLESSLY WITH 100% SUCCESS!')
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err)
  process.exit(1)
})
