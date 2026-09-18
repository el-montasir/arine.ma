import { calcShipping } from '../src/services/shipping/shipping-calculator.js'

async function runTests() {
  console.log('Running shipping calculation test suite...\n')

  let passed = 0
  let failed = 0

  function assertEqual(actual, expected, testName) {
    if (actual === expected) {
      console.log(`✅ PASS: ${testName} (expected ${expected}, got ${actual})`)
      passed++
    } else {
      console.error(`❌ FAIL: ${testName} (expected ${expected}, got ${actual})`)
      failed++
    }
  }

  const baseConfig = {
    enabled: true,
    freeThreshold: 300,
    flatFee: 25,
    freeEnabled: true,
  }

  // Test 1: Empty cart / 0 subtotal
  assertEqual(await calcShipping(0, [], baseConfig), 0, 'Test 1: Subtotal 0 should return 0')

  // Test 2: Standard subtotal below threshold
  assertEqual(await calcShipping(150, [{ shippingMode: null }], baseConfig), 25, 'Test 2: Standard subtotal 150 < 300 should return flatFee 25')

  // Test 3: Subtotal at free threshold
  assertEqual(await calcShipping(300, [{ shippingMode: null }], baseConfig), 0, 'Test 3: Subtotal 300 >= 300 should return 0')

  // Test 4: Subtotal above free threshold
  assertEqual(await calcShipping(450, [{ shippingMode: null }], baseConfig), 0, 'Test 4: Subtotal 450 > 300 should return 0')

  // Test 5: Global shipping disabled
  assertEqual(await calcShipping(150, [{ shippingMode: null }], { ...baseConfig, enabled: false }), 0, 'Test 5: Global shipping disabled should return 0')

  // Test 6: Free shipping threshold rule disabled
  assertEqual(await calcShipping(500, [{ shippingMode: null }], { ...baseConfig, freeEnabled: false }), 25, 'Test 6: Free shipping disabled should always return flatFee 25')

  // Test 7: Single product with FREE shipping (subtotal < 300)
  assertEqual(await calcShipping(100, [{ shippingMode: 'free' }], baseConfig), 0, 'Test 7: Single FREE item should return 0')

  // Test 8: Mixed cart: 1 FREE item + 2 DEFAULT items (subtotal < 300)
  assertEqual(await calcShipping(120, [{ shippingMode: 'free' }, { shippingMode: null }, { shippingMode: 'default' }], baseConfig), 0, 'Test 8: Mixed cart with at least 1 FREE item should return 0')

  // Test 9: Single product with CUSTOM shipping 40 DH (subtotal < 300)
  assertEqual(await calcShipping(100, [{ shippingMode: 'custom', customShipping: 40 }], baseConfig), 40, 'Test 9: Single CUSTOM item (40 DH) should return 40')

  // Test 10: Multiple CUSTOM items (20 DH and 50 DH) - should pick max(50) ONCE
  assertEqual(await calcShipping(100, [
    { shippingMode: 'custom', customShipping: 20 },
    { shippingMode: 'custom', customShipping: 50 },
    { shippingMode: null }
  ], baseConfig), 50, 'Test 10: Multiple CUSTOM items should return highest custom price (50 DH) ONCE')

  // Test 11: Case-insensitivity (FREE uppercase, CUSTOM uppercase)
  assertEqual(await calcShipping(100, [{ shippingMode: 'FREE' }], baseConfig), 0, 'Test 11a: Uppercase FREE should return 0')
  assertEqual(await calcShipping(100, [{ shippingMode: 'CUSTOM', customShipping: 35 }], baseConfig), 35, 'Test 11b: Uppercase CUSTOM should return 35')

  // Test 12: Priority: Subtotal >= threshold triggers Rule 2 before Rule 4
  assertEqual(await calcShipping(350, [{ shippingMode: 'custom', customShipping: 40 }], baseConfig), 0, 'Test 12: Subtotal >= 300 with CUSTOM item triggers Rule 2 (Free over 300) -> 0')

  console.log(`\nResults: ${passed} passed, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

runTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
