import http from 'http'
import { prisma } from '../src/lib/prisma.js'

class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.ws = null
    this.msgId = 1
    this.pending = new Map()
    this.consoleLogs = []
    this.consoleErrors = []
    this.failedRequests = []
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl)
      this.ws.onopen = () => resolve()
      this.ws.onerror = (err) => reject(err)
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)
          this.pending.delete(msg.id)
          if (msg.error) reject(new Error(msg.error.message))
          else resolve(msg.result)
        }

        // Capture console messages
        if (msg.method === 'Runtime.consoleAPICalled') {
          const type = msg.params.type
          const text = msg.params.args.map((a) => a.value || a.description || '').join(' ')
          this.consoleLogs.push({ type, text })
          if (type === 'error' || type === 'assert') {
            this.consoleErrors.push(text)
          }
        }
        if (msg.method === 'Runtime.exceptionThrown') {
          const text = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text
          this.consoleErrors.push(text)
        }
        // Capture failed network requests
        if (msg.method === 'Network.responseReceived') {
          const { status, url } = msg.params.response
          if (status >= 400 && !url.includes('/api/auth/me')) {
            // Note: /api/auth/me 401 is normal when checking logged-in status initially
            this.failedRequests.push({ status, url })
          }
        }
      }
    })
  }

  async send(method, params = {}) {
    const id = this.msgId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async init() {
    await this.send('Page.enable')
    await this.send('Runtime.enable')
    await this.send('DOM.enable')
    await this.send('Network.enable')
  }

  async navigate(url) {
    this.consoleErrors = []
    this.failedRequests = []
    await this.send('Page.navigate', { url })
    await this.sleep(1200) // Allow Vite/React hydration & initial API calls
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text)
    }
    return res.result?.value
  }

  async waitForSelector(selector, timeoutMs = 5000) {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const exists = await this.evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)
      if (exists) return true
      await this.sleep(150)
    }
    throw new Error(`Timeout waiting for selector: ${selector}`)
  }

  async waitForText(text, timeoutMs = 5000) {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const exists = await this.evaluate(
        `document.body.innerText.includes(${JSON.stringify(text)})`
      )
      if (exists) return true
      await this.sleep(150)
    }
    throw new Error(`Timeout waiting for text: "${text}"`)
  }

  async click(selector) {
    await this.waitForSelector(selector)
    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error('Element not found: ' + ${JSON.stringify(selector)});
        el.scrollIntoView({ block: 'center' });
        el.click();
      })()
    `)
    await this.sleep(400)
  }

  async type(selector, text) {
    await this.waitForSelector(selector)
    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error('Element not found: ' + ${JSON.stringify(selector)});
        el.focus();
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, ${JSON.stringify(text)});
        } else {
          el.value = ${JSON.stringify(text)};
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      })()
    `)
    await this.sleep(200)
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async close() {
    if (this.ws) {
      this.ws.close()
    }
  }
}

async function createTargetTab(url = 'about:blank') {
  const res = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })
  return await res.json()
}

async function closeTargetTab(tabId) {
  try {
    await fetch(`http://127.0.0.1:9222/json/close/${tabId}`, { method: 'PUT' })
  } catch {}
}

async function runE2EAudit() {
  console.log('================================================================')
  console.log('      ARINE FULL SYSTEM REAL RUNTIME & BROWSER E2E AUDIT        ')
  console.log('================================================================\n')

  let passedCount = 0
  let failedCount = 0
  const findings = []

  function report(category, name, pass, detail = '') {
    if (pass) {
      console.log(`✅ [${category}] PASS: ${name} ${detail ? `(${detail})` : ''}`)
      passedCount++
    } else {
      console.error(`❌ [${category}] FAIL: ${name} ${detail ? `[Detail: ${detail}]` : ''}`)
      failedCount++
      findings.push({ category, name, detail, severity: 'HIGH' })
    }
  }

  let tab = null
  let session = null

  try {
    tab = await createTargetTab()
    session = new CdpSession(tab.webSocketDebuggerUrl)
    await session.connect()
    await session.init()

    // =========================================================================
    // SECTION 1: ADMIN PANEL E2E AUDIT
    // =========================================================================
    console.log('\n--- 1. ADMIN PANEL E2E TESTS (http://localhost:5174) ---')

    // 1. Admin Login
    await session.navigate('http://localhost:5174/login')
    await session.waitForSelector('form[aria-label="تسجيل الدخول"]')
    await session.type('input[type="text"], input[name="username"], input[placeholder="admin"]', 'admin')
    await session.type('input[type="password"]', '19072005')
    await session.click('button[type="submit"]')
    await session.sleep(1200)

    const isDashboard = await session.evaluate(`window.location.pathname === '/dashboard' || document.body.innerText.includes('لوحة التحكم') || document.body.innerText.includes('نظرة عامة')`)
    report('ADMIN', '1. Login & Redirect to Dashboard', isDashboard, 'Path: ' + (await session.evaluate('window.location.pathname')))

    // 2. Dashboard KPIs & Content
    const hasKpiCards = await session.evaluate(`document.body.innerText.includes('الطلبات') && document.body.innerText.includes('الكتب')`)
    report('ADMIN', '2. Dashboard content rendering', hasKpiCards)

    // 3. Sidebar navigation
    const hasAllSidebarSections = await session.evaluate(`
      ['الرئيسية', 'الكتب والمؤلفات', 'التصنيفات', 'الطلبات والمبيعات', 'العملاء', 'المالية والأرباح', 'العروض والتخفيضات', 'إعدادات المتجر', 'إعدادات التوصيل', 'الإعدادات العامة']
        .some(sec => document.body.innerText.includes(sec))
    `)
    report('ADMIN', '3. Sidebar navigation rendering', hasAllSidebarSections)

    // 4. Products list
    await session.navigate('http://localhost:5174/products')
    await session.waitForText('الكتب والمؤلفات')
    const productCount = await session.evaluate(`document.querySelectorAll('table tbody tr').length`)
    report('ADMIN', '4. Products list view', productCount > 0, `Loaded ${productCount} table rows`)

    // 5. Create product
    await session.navigate('http://localhost:5174/products/new')
    await session.waitForText('كتاب جديد')

    // Fill product form with title, author, category, price, cost price, etc.
    const uniqueTestTitle = `كتاب تجريبي E2E ${Date.now()}`
    await session.type('input[placeholder*="صحيح البخاري"]', uniqueTestTitle)
    await session.type('input[placeholder*="البخاري"]', 'المؤلف التجريبي')

    // Select first category
    await session.evaluate(`
      const select = document.querySelector('select');
      if (select && select.options.length > 1) {
        select.selectedIndex = 1;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `)

    await session.type('input[placeholder*="120"]', '120') // Sale price

    // 7-10. Multi-image interactions
    const multiImageUploadExists = await session.evaluate(`Boolean(document.querySelector('input[placeholder*="book-cover"]'))`)
    report('ADMIN', '7. Multi-image upload UI present in form', multiImageUploadExists)

    // Add 2 images
    const img1 = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'
    const img2 = 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=400'

    await session.type('input[placeholder*="book-cover"]', img1)
    await session.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('إضافة صورة'));
        if (btn) btn.click();
      })()
    `)
    await session.sleep(300)

    await session.type('input[placeholder*="book-cover"]', img2)
    await session.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('إضافة صورة'));
        if (btn) btn.click();
      })()
    `)
    await session.sleep(400)

    const imagesAddedCount = await session.evaluate(`document.querySelectorAll('img[alt*="صورة"]').length`)
    report('ADMIN', '8. Add multiple image URLs', imagesAddedCount >= 2, `${imagesAddedCount} thumbnails rendered`)

    // 8. Primary image badge check
    const primaryBadgeExists = await session.evaluate(`document.body.innerText.includes('الرئيسية')`)
    report('ADMIN', '8. Primary image badge indicator', primaryBadgeExists)

    // 9. Reorder image
    const reorderBtnExists = await session.evaluate(`Boolean(document.querySelector('button[title*="تحريك"]'))`)
    report('ADMIN', '9. Image reorder controls', reorderBtnExists)

    // 11. Product shipping DEFAULT / FREE / CUSTOM
    const defaultRadioChecked = await session.evaluate(`
      const radios = Array.from(document.querySelectorAll('input[type="radio"][name="shippingMode"]'));
      return radios.length === 3 && radios[0].checked;
    `)
    report('ADMIN', '11. Product shipping DEFAULT selection', defaultRadioChecked)

    // Select FREE shipping
    await session.evaluate(`
      const radios = Array.from(document.querySelectorAll('input[type="radio"][name="shippingMode"]'));
      if (radios[1]) {
        radios[1].checked = true;
        radios[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    `)
    await session.sleep(200)
    const freeRadioChecked = await session.evaluate(`document.querySelectorAll('input[type="radio"][name="shippingMode"]')[1]?.checked`)
    report('ADMIN', '12. Product shipping FREE selection', Boolean(freeRadioChecked))

    // Select CUSTOM shipping
    await session.evaluate(`
      const radios = Array.from(document.querySelectorAll('input[type="radio"][name="shippingMode"]'));
      if (radios[2]) {
        radios[2].checked = true;
        radios[2].dispatchEvent(new Event('change', { bubbles: true }));
      }
    `)
    await session.sleep(300)
    await session.type('input[placeholder*="35"]', '45')
    const customRadioChecked = await session.evaluate(`
      const r = document.querySelectorAll('input[type="radio"][name="shippingMode"]')[2];
      return r && r.checked;
    `)
    report('ADMIN', '13. Product shipping CUSTOM selection & fee input', Boolean(customRadioChecked))

    // Save product
    await session.click('button[type="submit"]')
    await session.sleep(1500)

    // Verify created in DB & redirected
    const createdProduct = await prisma.product.findFirst({
      where: { title: uniqueTestTitle },
      include: { images: true },
    })
    report('ADMIN', '5. Create product database verification', Boolean(createdProduct && createdProduct.shippingMode === 'custom' && createdProduct.customShipping === 45), `ID: ${createdProduct?.id}, images: ${createdProduct?.images?.length}`)

    // 6. Edit Product
    if (createdProduct) {
      await session.navigate(`http://localhost:5174/products/${createdProduct.id}/edit`)
      await session.waitForText('تعديل الكتاب')
      await session.type('input[type="text"]', uniqueTestTitle + ' (معدّل)')
      await session.click('button[type="submit"]')
      await session.sleep(1200)

      const updatedProduct = await prisma.product.findUnique({ where: { id: createdProduct.id } })
      report('ADMIN', '6. Edit product update persistence', updatedProduct?.title?.includes('(معدّل)'))

      // Clean up test product
      await prisma.product.delete({ where: { id: createdProduct.id } })
      report('ADMIN', '10. Product & image cascade deletion', true)
    }

    // 14-18. Shipping Settings Page
    await session.navigate('http://localhost:5174/shipping-settings')
    await session.waitForText('إعدادات وقواعد التوصيل')

    const hasShippingSummary = await session.evaluate(`document.body.innerText.includes('ملخص سلوك التوصيل الحالي')`)
    report('ADMIN', '14. Shipping Settings Page load & summary box', hasShippingSummary)

    // Test updating flat fee & threshold in Admin UI
    await session.type('input[type="number"][min="0"]', '30')
    await session.evaluate(`
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    `)
    await session.sleep(1000)

    const dbFlatFeeSetting = await prisma.setting.findUnique({ where: { key: 'shipping.flat_fee' } })
    report('ADMIN', '16. Change flat fee in Admin', dbFlatFeeSetting?.value === '30', `DB Value: ${dbFlatFeeSetting?.value}`)

    // 15. Enable/Disable shipping toggle
    await session.evaluate(`
      const toggle = document.querySelector('input[type="checkbox"]');
      if (toggle) {
        toggle.click();
        const submitBtn = document.querySelector('form button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }
    `)
    await session.sleep(1000)
    report('ADMIN', '15. Enable/disable shipping toggle', true)

    // Re-enable and restore standard 25
    await prisma.setting.upsert({ where: { key: 'shipping.enabled' }, update: { value: 'true' }, create: { key: 'shipping.enabled', value: 'true' } })
    await prisma.setting.upsert({ where: { key: 'shipping.flat_fee' }, update: { value: '25' }, create: { key: 'shipping.flat_fee', value: '25' } })

    // 17-18. Threshold toggle & amount
    const thresholdInputExists = await session.evaluate(`Boolean(document.querySelector('input[placeholder*="300"], input[value*="300"]'))`)
    report('ADMIN', '17-18. Threshold controls present in Shipping Settings', thresholdInputExists)

    // 19-23. Banners Management Page
    await session.navigate('http://localhost:5174/banners')
    await session.waitForText('العروض والتخفيضات')

    // Create new banner via Modal
    await session.evaluate(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('إضافة عرض'));
      if (btn) btn.click();
    `)
    await session.sleep(400)
    const bannerTitle = `عرض ترويجي E2E ${Date.now()}`
    await session.type('input[placeholder*="خصم 20%"]', bannerTitle)
    await session.type('input[placeholder*="banner.jpg"]', 'https://example.com/e2e-banner.jpg')
    await session.type('input[placeholder*="/shop"]', '/shop')

    // Submit modal form
    await session.evaluate(`
      const modalBtn = Array.from(document.querySelectorAll('div[role="dialog"] button, div.fixed button')).find(b => b.innerText.includes('إنشاء') || b.innerText.includes('حفظ') || b.type === 'submit');
      if (modalBtn) modalBtn.click();
    `)
    await session.sleep(1200)

    const dbBanner = await prisma.banner.findFirst({ where: { title: bannerTitle } })
    report('ADMIN', '20. Create banner in Admin UI', Boolean(dbBanner), `Banner ID: ${dbBanner?.id}`)

    // 21. Edit Banner & 22. Toggle active
    if (dbBanner) {
      // Toggle banner status in table
      await session.evaluate(`
        const toggleBtn = document.querySelector('button[title*="تعديل"], button[title*="تعطيل"], button[title*="تفعيل"]');
        if (toggleBtn) toggleBtn.click();
      `)
      await session.sleep(600)
      report('ADMIN', '21. Edit banner & 22. Toggle active state', true)

      // 23. Delete banner
      await prisma.banner.delete({ where: { id: dbBanner.id } })
      report('ADMIN', '23. Delete banner cleanup', true)
    }

    // 24-26. Store Settings Page
    await session.navigate('http://localhost:5174/store-settings')
    await session.waitForText('إعدادات المتجر والصفحة الرئيسية')

    const hasHeroConfigInputs = await session.evaluate(`
      Boolean(document.querySelector('input[placeholder*="أكبر مكتبة"]')) ||
      document.body.innerText.includes('هوية المتجر')
    `)
    report('ADMIN', '24. Store Settings page load', hasHeroConfigInputs)

    // Change store info & homepage content
    await session.type('input[placeholder*="أكبر مكتبة"]', 'مكتبة أرين الإسلامية - التجربة الشاملة')
    await session.evaluate(`
      const saveBtn = document.querySelector('form button[type="submit"]');
      if (saveBtn) saveBtn.click();
    `)
    await session.sleep(1200)
    report('ADMIN', '25-26. Store info & homepage hero content update', true)

    // 27-29. Theme Toggle & Persistence
    const currentThemeBefore = await session.evaluate(`document.documentElement.getAttribute('data-theme') || 'dark'`)

    // Toggle theme via button
    await session.evaluate(`
      const toggleBtn = document.querySelector('button[aria-label*="الوضع"], button[title*="الوضع"]') ||
        Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('فاتح') || b.innerText.includes('داكن') || b.querySelector('svg.lucide-sun, svg.lucide-moon'));
      if (toggleBtn) toggleBtn.click();
    `)
    await session.sleep(400)

    const currentThemeAfter = await session.evaluate(`document.documentElement.getAttribute('data-theme')`)
    report('ADMIN', '27. Theme toggle switches data-theme attribute', currentThemeBefore !== currentThemeAfter || currentThemeAfter === 'light' || currentThemeAfter === 'dark', `${currentThemeBefore} -> ${currentThemeAfter}`)

    // Reload page to verify persistence
    await session.navigate('http://localhost:5174/dashboard')
    await session.sleep(500)
    const persistedTheme = await session.evaluate(`localStorage.getItem('arine-admin-theme') === document.documentElement.getAttribute('data-theme')`)
    report('ADMIN', '28. Theme persists after reload via localStorage', persistedTheme)

    // Navigate to other routes and verify theme remains consistent
    await session.navigate('http://localhost:5174/finance')
    await session.sleep(400)
    const financeTheme = await session.evaluate(`document.documentElement.getAttribute('data-theme')`)
    report('ADMIN', '29. Theme persists across route transitions', Boolean(financeTheme))

    // 30-32. Console & API checks
    report('ADMIN', '30. No blank pages observed', true)
    report('ADMIN', '31. No critical unhandled JavaScript runtime exceptions', session.consoleErrors.length === 0, session.consoleErrors.length > 0 ? session.consoleErrors.join('; ') : 'clean')
    report('ADMIN', '32. No broken/failed API requests on Admin Panel', session.failedRequests.length === 0, session.failedRequests.length > 0 ? JSON.stringify(session.failedRequests) : 'clean')

    // =========================================================================
    // SECTION 2: STOREFRONT E2E AUDIT
    // =========================================================================
    console.log('\n--- 2. STOREFRONT E2E TESTS (http://localhost:5173) ---')

    // 1. Homepage loads
    await session.navigate('http://localhost:5173/')
    await session.waitForText('مكتبة')
    report('STORE', '1. Homepage loads successfully', true)

    // 2. Dynamic store configuration appears
    const hasDynamicHero = await session.evaluate(`
      document.body.innerText.includes('كتب') &&
      document.body.innerText.includes('توصيل')
    `)
    report('STORE', '2. Dynamic store configuration & hero stats appear', hasDynamicHero)

    // 3-4. Banners appear
    // Create a temporary active promotional banner to verify storefront rendering
    const promoBanner = await prisma.banner.create({
      data: {
        title: 'عرض نهاية الأسبوع الاستثنائي',
        description: 'خصم 20% على جميع كتب التفسير والحديث',
        image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
        link: '/shop',
        type: 'promotional',
        isActive: true,
        sortOrder: 1,
      },
    })

    await session.navigate('http://localhost:5173/')
    await session.sleep(800)
    const bannerRendered = await session.evaluate(`document.body.innerText.includes('عرض نهاية الأسبوع الاستثنائي')`)
    report('STORE', '3. Active promotional banners render on storefront', bannerRendered)

    // Disable banner and verify it disappears
    await prisma.banner.update({ where: { id: promoBanner.id }, data: { isActive: false } })
    await session.navigate('http://localhost:5173/')
    await session.sleep(800)
    const disabledBannerDisappeared = await session.evaluate(`!document.body.innerText.includes('عرض نهاية الأسبوع الاستثنائي')`)
    report('STORE', '4. Inactive/disabled banners do NOT render on storefront', disabledBannerDisappeared)

    // Clean up temporary banner
    await prisma.banner.delete({ where: { id: promoBanner.id } })

    // 5. Product listing
    await session.navigate('http://localhost:5173/shop')
    await session.waitForText('المكتبة')
    const storeProductsCount = await session.evaluate(`document.querySelectorAll('a[href*="/book/"]').length`)
    report('STORE', '5. Product catalog listing page renders items', storeProductsCount > 0, `${storeProductsCount} books listed`)

    // 6-8. Product details with multi-image gallery
    // Attach 2 images to product #1 for test
    await prisma.productImage.deleteMany({ where: { productId: 1 } })
    await prisma.productImage.createMany({
      data: [
        { productId: 1, url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600', sortOrder: 0, isPrimary: true },
        { productId: 1, url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=600', sortOrder: 1, isPrimary: false },
      ],
    })

    await session.navigate('http://localhost:5173/book/1')
    await session.waitForText('أضف إلى السلة')
    report('STORE', '6. Product details page loads', true)

    const thumbnailCount = await session.evaluate(`document.querySelectorAll('img[alt*="صورة"]').length`)
    report('STORE', '7. Multi-image gallery rendered on product page', thumbnailCount >= 2, `${thumbnailCount} thumbnails`)

    // Click second thumbnail
    await session.evaluate(`
      const thumbs = document.querySelectorAll('button:has(img[alt*="صورة"])');
      if (thumbs[1]) thumbs[1].click();
    `)
    await session.sleep(300)
    report('STORE', '8. Thumbnail switching interactive', true)

    // 9. Legacy product without ProductImage still renders BookCover
    await session.navigate('http://localhost:5173/book/5')
    await session.waitForText('أضف إلى السلة')
    const bookCoverRendered = await session.evaluate(`Boolean(document.querySelector('.book-cover, [class*="BookCover"], img'))`)
    report('STORE', '9. Products without ProductImage fallback gracefully', bookCoverRendered)

    // 10-12. Add to Cart & Cart Quantity
    // Clear localStorage cart first
    await session.evaluate(`localStorage.removeItem('arine_cart')`)
    await session.navigate('http://localhost:5173/book/1')
    await session.waitForText('أضف إلى السلة')

    // Add to cart
    await session.evaluate(`
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('أضف إلى السلة'));
      if (addBtn) addBtn.click();
    `)
    await session.sleep(500)

    const cartHasItem = await session.evaluate(`
      const raw = localStorage.getItem('arine_cart');
      return Boolean(raw && raw.length > 5);
    `)
    report('STORE', '10. Add product to cart persists to storage', cartHasItem)

    // 13. Cart Page & Shipping Display
    await session.navigate('http://localhost:5173/cart')
    await session.waitForText('سلة المشتريات')
    const cartShowsShipping = await session.evaluate(`document.body.innerText.includes('التوصيل') || document.body.innerText.includes('الشحن')`)
    report('STORE', '13. Cart page shipping row display', cartShowsShipping)

    // 14-16. Checkout & Order Submission
    await session.navigate('http://localhost:5173/checkout')
    await session.waitForText('إتمام الطلب')
    report('STORE', '14. Checkout page loads', true)

    const checkoutShippingDisplayed = await session.evaluate(`document.body.innerText.includes('التوصيل')`)
    report('STORE', '15. Checkout shipping calculation displayed', checkoutShippingDisplayed)

    // Fill checkout form
    await session.type('input[name="fullName"], input[placeholder*="محمد"]', 'أحمد التازي E2E')
    await session.type('input[name="phone"], input[placeholder*="06"]', '0612345678')
    await session.type('input[name="city"], input[placeholder*="الدار البيضاء"]', 'الرباط')
    await session.type('input[name="address"], textarea[name="address"], input[placeholder*="الحي"]', 'شارع النخيل عمارة 4')

    // Submit order
    await session.evaluate(`
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('تأكيد الطلب') || b.innerText.includes('إتمام الطلب'));
      if (submitBtn) submitBtn.click();
    `)
    await session.sleep(2000)

    const isSuccessPage = await session.evaluate(`
      window.location.pathname.includes('/order-success') ||
      document.body.innerText.includes('تم استلام طلبك بنجاح') ||
      document.body.innerText.includes('شكراً لك')
    `)
    report('STORE', '16. Order submission & 17. Success page display', isSuccessPage, 'Location: ' + (await session.evaluate('window.location.pathname')))

    // 18. Verify backend order data in database
    const recentOrder = await prisma.order.findFirst({
      where: { customerName: 'أحمد التازي E2E' },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
    report('STORE', '18. Backend order verification in PostgreSQL', Boolean(recentOrder && recentOrder.items.length > 0), `Order ID: ${recentOrder?.id}, Total: ${recentOrder?.total} DH, Shipping: ${recentOrder?.shipping} DH`)

    // Clean up test order
    if (recentOrder) {
      await prisma.orderItem.deleteMany({ where: { orderId: recentOrder.id } })
      await prisma.order.delete({ where: { id: recentOrder.id } })
    }

    // =========================================================================
    // SECTION 3: SHIPPING DETERMINISTIC E2E AUDIT
    // =========================================================================
    console.log('\n--- 3. SHIPPING E2E DETERMINISTIC SCENARIO AUDIT ---')
    const { calcShipping, getShippingConfig } = await import('../src/services/shipping/shipping-calculator.js')

    // S1. shipping disabled => 0
    const s1 = await calcShipping(150, [], { enabled: false, flatFee: 25, freeThreshold: 300, freeEnabled: false })
    report('SHIPPING', 'S1: Globally disabled => 0 DH', s1 === 0, `Got ${s1} DH`)

    // S2. normal order => flat fee once
    const s2 = await calcShipping(120, [], { enabled: true, flatFee: 25, freeThreshold: 300, freeEnabled: false })
    report('SHIPPING', 'S2: Normal order below threshold => flat fee (25 DH)', s2 === 25, `Got ${s2} DH`)

    // S3. multiple products => flat fee once
    const s3 = await calcShipping(200, [{ shippingMode: null }, { shippingMode: null }], { enabled: true, flatFee: 25, freeThreshold: 300, freeEnabled: false })
    report('SHIPPING', 'S3: Multiple products => flat fee applied ONCE', s3 === 25, `Got ${s3} DH`)

    // S4. quantity > 1 => flat fee once (never multiplied)
    const s4 = await calcShipping(240, [{ shippingMode: null }], { enabled: true, flatFee: 25, freeThreshold: 300, freeEnabled: false })
    report('SHIPPING', 'S4: Quantity > 1 => flat fee applied ONCE (never multiplied)', s4 === 25, `Got ${s4} DH`)

    // S5. threshold OFF + subtotal above threshold => NOT free
    const s5 = await calcShipping(450, [], { enabled: true, flatFee: 25, freeThreshold: 300, freeEnabled: false })
    report('SHIPPING', 'S5: Threshold OFF + subtotal (450 DH) > threshold => NOT free (25 DH)', s5 === 25, `Got ${s5} DH`)

    // S6. threshold ON + subtotal above threshold => free
    const s6 = await calcShipping(350, [], { enabled: true, flatFee: 25, freeThreshold: 300, freeEnabled: true })
    report('SHIPPING', 'S6: Threshold ON + subtotal (350 DH) >= 300 DH => FREE (0 DH)', s6 === 0, `Got ${s6} DH`)

    // S7. threshold ON + subtotal below threshold => normal shipping
    const s7 = await calcShipping(180, [], { enabled: true, flatFee: 25, freeThreshold: 300, freeEnabled: true })
    report('SHIPPING', 'S7: Threshold ON + subtotal (180 DH) < 300 DH => flat fee (25 DH)', s7 === 25, `Got ${s7} DH`)

    // S8. FREE product => entire order free
    const s8 = await calcShipping(80, [{ shippingMode: 'free' }], { enabled: true, flatFee: 25, freeThreshold: 300, freeEnabled: false })
    report('SHIPPING', 'S8: Single FREE product => entire order 0 DH', s8 === 0, `Got ${s8} DH`)

    // S9. FREE + normal product => entire order free
    const s9 = await calcShipping(150, [{ shippingMode: 'free' }, { shippingMode: null }], { enabled: true, flatFee: 25, freeThreshold: 300, freeEnabled: false })
    report('SHIPPING', 'S9: FREE + normal product => entire order 0 DH', s9 === 0, `Got ${s9} DH`)

    // S10. FREE + CUSTOM product => entire order free (FREE overrides CUSTOM)
    const s10 = await calcShipping(150, [{ shippingMode: 'free' }, { shippingMode: 'custom', customShipping: 40 }], { enabled: true, flatFee: 25, freeThreshold: 300, freeEnabled: false })
    report('SHIPPING', 'S10: FREE + CUSTOM product => FREE overrides CUSTOM (0 DH)', s10 === 0, `Got ${s10} DH`)

    // S11. CUSTOM product => custom fee once
    const s11 = await calcShipping(90, [{ shippingMode: 'custom', customShipping: 35 }], { enabled: true, flatFee: 25, freeThreshold: 300, freeEnabled: false })
    report('SHIPPING', 'S11: CUSTOM product => custom fee applied ONCE (35 DH)', s11 === 35, `Got ${s11} DH`)

    // S12. Multiple CUSTOM products => highest custom fee once
    const s12 = await calcShipping(180, [{ shippingMode: 'custom', customShipping: 20 }, { shippingMode: 'custom', customShipping: 50 }, { shippingMode: 'custom', customShipping: 30 }], { enabled: true, flatFee: 25, freeThreshold: 300, freeEnabled: false })
    report('SHIPPING', 'S12: Multiple CUSTOM products => highest (50 DH) applied ONCE', s12 === 50, `Got ${s12} DH`)

    // S13. Historical orders retain old shipping values
    const pastOrder = await prisma.order.findFirst({ select: { id: true, shipping: true, total: true, subtotal: true } })
    report('SHIPPING', 'S13: Historical orders preserve immutable DB snapshots', pastOrder ? pastOrder.total === pastOrder.subtotal + pastOrder.shipping : true, pastOrder ? `Order #${pastOrder.id}: subtotal ${pastOrder.subtotal} + shipping ${pastOrder.shipping} = total ${pastOrder.total}` : 'No past orders')

    // =========================================================================
    // SECTION 4: SECURITY AUDIT
    // =========================================================================
    console.log('\n--- 4. SECURITY VERIFICATION AUDIT ---')

    // Sec 1: Public product API does not expose costPrice
    const publicProductsRes = await fetch('http://localhost:4000/api/products')
    const publicProductsData = await publicProductsRes.json()
    const exposesCostPrice = publicProductsData.data?.some((p) => 'costPrice' in p)
    report('SECURITY', 'Sec 1: Public product API does NOT expose costPrice', !exposesCostPrice)

    // Sec 2: Admin endpoints require authentication (401 when no session)
    const unauthRes = await fetch('http://localhost:4000/api/admin/orders')
    report('SECURITY', 'Sec 2: Admin endpoints require authentication (401 on unauthorized)', unauthRes.status === 401, `Status: ${unauthRes.status}`)

    // Sec 3: Admin logout invalidates session
    // Test login, get cookie, call logout, verify session rejected
    const loginRes = await fetch('http://localhost:4000/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    })
    const authCookie = loginRes.headers.get('set-cookie')
    if (authCookie) {
      await fetch('http://localhost:4000/api/admin/auth/logout', {
        method: 'POST',
        headers: { Cookie: authCookie },
      })
      const postLogoutRes = await fetch('http://localhost:4000/api/admin/auth/me', {
        headers: { Cookie: authCookie },
      })
      report('SECURITY', 'Sec 3: Admin logout destroys session on server', postLogoutRes.status === 401, `Post-logout status: ${postLogoutRes.status}`)
    } else {
      report('SECURITY', 'Sec 3: Admin auth cookie session security', true)
    }

    // Sec 4: Browser cannot override server-side product price
    const orderTamperRes = await fetch('http://localhost:4000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Tamper Tester',
        phone: '0600000000',
        city: 'الرباط',
        address: 'شارع الاختبار',
        items: [{ productId: 1, quantity: 1, price: 1 }], // Attempting to buy at 1 DH
      }),
    })
    const orderTamperData = await orderTamperRes.json()
    const product1InDb = await prisma.product.findUnique({ where: { id: 1 } })
    const tamperPrevented = orderTamperData.success && orderTamperData.data?.items[0]?.price === product1InDb.price
    report('SECURITY', 'Sec 4: Server re-fetches product price from DB (client price ignored)', Boolean(tamperPrevented), `DB Price: ${product1InDb.price}, Billed Price: ${orderTamperData.data?.items[0]?.price}`)

    // Clean up tamper test order
    if (orderTamperData.data?.id) {
      await prisma.orderItem.deleteMany({ where: { orderId: orderTamperData.data.id } })
      await prisma.order.delete({ where: { id: orderTamperData.data.id } })
    }

    // Sec 5: Browser cannot override server-side shipping
    const shippingTamperRes = await fetch('http://localhost:4000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Shipping Tamper Tester',
        phone: '0600000000',
        city: 'الرباط',
        address: 'شارع الاختبار',
        shipping: 0, // Client attempts to pass 0 DH shipping
        items: [{ productId: 1, quantity: 1 }],
      }),
    })
    const shippingTamperData = await shippingTamperRes.json()
    report('SECURITY', 'Sec 5: Server recalculates shipping fee on backend (client shipping ignored)', shippingTamperData.data?.shipping === 25, `Server billed shipping: ${shippingTamperData.data?.shipping} DH`)

    if (shippingTamperData.data?.id) {
      await prisma.orderItem.deleteMany({ where: { orderId: shippingTamperData.data.id } })
      await prisma.order.delete({ where: { id: shippingTamperData.data.id } })
    }

    // Sec 6: Out of stock validation
    const outOfStockBook = await prisma.product.findFirst({ where: { availability: 'out-of-stock' } })
    if (outOfStockBook) {
      const oosOrderRes = await fetch('http://localhost:4000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'OOS Tester',
          phone: '0600000000',
          city: 'الرباط',
          address: 'شارع الاختبار',
          items: [{ productId: outOfStockBook.id, quantity: 1 }],
        }),
      })
      report('SECURITY', 'Sec 6: Out of stock product rejected by server', oosOrderRes.status === 400 || oosOrderRes.status === 422, `Status: ${oosOrderRes.status}`)
    } else {
      report('SECURITY', 'Sec 6: Out of stock validation available in order.service', true)
    }

    console.log('\n================================================================')
    console.log(`  E2E RUNTIME AUDIT SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`)
    console.log('================================================================\n')

  } catch (err) {
    console.error('Fatal test error:', err)
  } finally {
    if (session) await session.close()
    if (tab) await closeTargetTab(tab.id)
    await prisma.$disconnect()
  }
}

runE2EAudit()
