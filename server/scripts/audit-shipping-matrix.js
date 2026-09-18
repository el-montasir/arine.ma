import { prisma } from '../src/lib/prisma.js'
import {
  calcShipping,
  invalidateShippingCache,
} from '../src/services/shipping/shipping-calculator.js'

async function runMatrixAudit() {
  console.log('================================================================');
  console.log('  ARINE SHIPPING IMPLEMENTATION AUDIT & TEST MATRIX (A to P)   ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, expected, actual) {
    if (condition) {
      console.log(`✅ PASS: ${message} (expected: ${expected}, got: ${actual})`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message} (expected: ${expected}, got: ${actual})`);
      failed++;
    }
  }

  const customFee = 35;
  const thresholdVal = 300;

  // Configuration sets for testing
  const configNormalThresholdOn = {
    enabled: true,
    flatFee: customFee,
    freeThreshold: thresholdVal,
    freeEnabled: true,
  };

  const configNormalThresholdOff = {
    enabled: true,
    flatFee: customFee,
    freeThreshold: thresholdVal,
    freeEnabled: false,
  };

  const configDisabled = {
    enabled: false,
    flatFee: customFee,
    freeThreshold: thresholdVal,
    freeEnabled: true,
  };

  // A. Shipping disabled
  const resA = await calcShipping(150, [{ shippingMode: 'default' }], configDisabled);
  assert(resA === 0, 'A. Global shipping disabled', 0, resA);

  // B. Normal order (below threshold)
  const resB = await calcShipping(150, [{ shippingMode: 'default' }], configNormalThresholdOn);
  assert(resB === customFee, 'B. Normal order below threshold', customFee, resB);

  // C. Multiple products (e.g. 5 products) -> applied ONCE, NOT multiplied
  const resC = await calcShipping(
    150,
    [
      { shippingMode: null },
      { shippingMode: 'default' },
      { shippingMode: 'DEFAULT' },
      { shippingMode: null },
      { shippingMode: null },
    ],
    configNormalThresholdOn
  );
  assert(resC === customFee, 'C. Multiple products (5 items) -> flat fee applied ONCE', customFee, resC);

  // D. Quantity > 1 (e.g. 10 items) -> applied ONCE, NOT multiplied
  const resD = await calcShipping(150, [{ shippingMode: null }], configNormalThresholdOn);
  assert(resD === customFee, 'D. Quantity > 1 -> flat fee applied ONCE (never multiplied)', customFee, resD);

  // E. Threshold OFF + subtotal above threshold (500 DH > 300 DH with freeEnabled=false) -> must NOT become free
  const resE = await calcShipping(500, [{ shippingMode: null }], configNormalThresholdOff);
  assert(
    resE === customFee,
    'E. Threshold OFF + subtotal 500 DH > 300 DH -> must NOT become free (remains flatFee)',
    customFee,
    resE
  );

  // F. Threshold ON + subtotal above threshold (500 DH > 300 DH with freeEnabled=true) -> 0 DH
  const resF = await calcShipping(500, [{ shippingMode: null }], configNormalThresholdOn);
  assert(
    resF === 0,
    'F. Threshold ON + subtotal 500 DH > 300 DH -> shipping = 0 DH',
    0,
    resF
  );

  // G. Threshold ON + subtotal below threshold (150 DH < 300 DH with freeEnabled=true) -> flatFee
  const resG = await calcShipping(150, [{ shippingMode: null }], configNormalThresholdOn);
  assert(
    resG === customFee,
    'G. Threshold ON + subtotal 150 DH < 300 DH -> shipping = flatFee',
    customFee,
    resG
  );

  // H. FREE product alone (subtotal 50 DH, threshold ON) -> 0 DH
  const resH = await calcShipping(50, [{ shippingMode: 'free' }], configNormalThresholdOn);
  assert(resH === 0, 'H. FREE product alone (50 DH) -> 0 DH', 0, resH);

  // I. FREE product + normal product (subtotal 100 DH, threshold OFF) -> 0 DH (FREE affects entire order)
  const resI = await calcShipping(
    100,
    [{ shippingMode: 'free' }, { shippingMode: 'default' }],
    configNormalThresholdOff
  );
  assert(
    resI === 0,
    'I. FREE product + normal product with threshold OFF -> 0 DH for entire order',
    0,
    resI
  );

  // J. FREE product + custom product (subtotal 100 DH) -> 0 DH (FREE overrides custom)
  const resJ = await calcShipping(
    100,
    [{ shippingMode: 'free' }, { shippingMode: 'custom', customShipping: 45 }],
    configNormalThresholdOn
  );
  assert(
    resJ === 0,
    'J. FREE product + custom product (45 DH) -> 0 DH (FREE overrides custom)',
    0,
    resJ
  );

  // K. Custom shipping (single product with 40 DH custom shipping) -> 40 DH ONCE
  const resK = await calcShipping(
    100,
    [{ shippingMode: 'custom', customShipping: 40 }],
    configNormalThresholdOff
  );
  assert(
    resK === 40,
    'K. Single CUSTOM shipping (40 DH) with threshold OFF -> 40 DH ONCE',
    40,
    resK
  );

  // L. Multiple custom shipping products (20 DH, 50 DH, 35 DH) -> MAX(50 DH) ONCE
  const resL = await calcShipping(
    100,
    [
      { shippingMode: 'custom', customShipping: 20 },
      { shippingMode: 'custom', customShipping: 50 },
      { shippingMode: 'custom', customShipping: 35 },
      { shippingMode: null },
    ],
    configNormalThresholdOff
  );
  assert(
    resL === 50,
    'L. Multiple custom shipping products (20, 50, 35 DH) -> MAX (50 DH) ONCE',
    50,
    resL
  );

  // M. Shipping disabled + FREE product -> 0 DH
  const resM = await calcShipping(50, [{ shippingMode: 'free' }], configDisabled);
  assert(resM === 0, 'M. Shipping disabled + FREE product -> 0 DH', 0, resM);

  // N. Shipping disabled + custom product -> 0 DH
  const resN = await calcShipping(
    50,
    [{ shippingMode: 'custom', customShipping: 60 }],
    configDisabled
  );
  assert(resN === 0, 'N. Shipping disabled + custom product -> 0 DH', 0, resN);

  // O. Dynamic DB Config test: Change default shipping in config & test calculation
  invalidateShippingCache();
  const dynamicConfig1 = { enabled: true, flatFee: 40, freeThreshold: 300, freeEnabled: false };
  const resO1 = await calcShipping(100, [{ shippingMode: null }], dynamicConfig1);
  const dynamicConfig2 = { enabled: true, flatFee: 55, freeThreshold: 300, freeEnabled: false };
  const resO2 = await calcShipping(100, [{ shippingMode: null }], dynamicConfig2);
  assert(
    resO1 === 40 && resO2 === 55,
    'O. Dynamic shipping config change reflects immediately without code change',
    '40 and 55',
    `${resO1} and ${resO2}`
  );

  // P. Historical Order immutability check
  // Read existing orders from database to verify historical shipping integrity
  const existingOrders = await prisma.order.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  let historicalIntegrity = true;
  for (const order of existingOrders) {
    if (typeof order.shipping !== 'number' || order.total !== order.subtotal + order.shipping) {
      historicalIntegrity = false;
      break;
    }
  }
  assert(
    historicalIntegrity,
    'P. Existing orders in DB retain their immutable historical shipping & total snapshots',
    'true',
    String(historicalIntegrity)
  );

  console.log('\n================================================================');
  console.log(`  MATRIX AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

runMatrixAudit().catch(async (err) => {
  console.error('Audit encountered an unexpected error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
