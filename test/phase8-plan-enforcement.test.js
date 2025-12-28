/**
 * Phase 8: Plan Enforcement Tests
 * Tests for pricing, usage tracking, and limit enforcement
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PLANS, getPlan, planAllows, isWithinLimit, getLimitExceededMessage } = require('../src/plans/plan-definitions');
const { recordScan, getUsageStats, canPerformScan, canAddSite, resetUsage } = require('../src/plans/usage-tracker');
const { getCurrentPlan, setCurrentPlan, checkFeatureAllowed, checkCanScan, performScan, getPlanSummary } = require('../src/plans/plan-manager');
const { getCheckoutUrl } = require('../src/payments/stripe-checkout');

// Clean up helper
function cleanupTestData() {
  const usageDir = path.join(os.homedir(), '.odavl-guardian', 'usage');
  const planDir = path.join(os.homedir(), '.odavl-guardian', 'plan');
  
  if (fs.existsSync(usageDir)) {
    fs.rmSync(usageDir, { recursive: true, force: true });
  }
  if (fs.existsSync(planDir)) {
    fs.rmSync(planDir, { recursive: true, force: true });
  }
}

console.log('\n🧪 Phase 8: Plan Enforcement Tests');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    cleanupTestData();
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${err.message}`);
    testsFailed++;
  }
}

// Test Plan Definitions
console.log('📋 Testing Plan Definitions\n');

test('Should have three plan tiers', () => {
  assert.strictEqual(Object.keys(PLANS).length, 3);
  assert.ok(PLANS.FREE);
  assert.ok(PLANS.PRO);
  assert.ok(PLANS.BUSINESS);
});

test('FREE plan has correct limits', () => {
  const free = PLANS.FREE;
  assert.strictEqual(free.id, 'free');
  assert.strictEqual(free.maxScansPerMonth, 10);
  assert.strictEqual(free.maxSites, 1);
  assert.strictEqual(free.liveGuardianAllowed, false);
  assert.strictEqual(free.ciModeAllowed, false);
});

test('PRO plan has correct limits', () => {
  const pro = PLANS.PRO;
  assert.strictEqual(pro.id, 'pro');
  assert.strictEqual(pro.price, 29);
  assert.strictEqual(pro.maxScansPerMonth, 200);
  assert.strictEqual(pro.maxSites, 3);
  assert.strictEqual(pro.liveGuardianAllowed, true);
});

test('BUSINESS plan has unlimited limits', () => {
  const business = PLANS.BUSINESS;
  assert.strictEqual(business.maxScansPerMonth, -1);
  assert.strictEqual(business.maxSites, -1);
});

test('Can retrieve plan by ID', () => {
  const free = getPlan('free');
  assert.strictEqual(free.id, 'free');
});

test('Can check feature availability', () => {
  assert.strictEqual(planAllows('free', 'liveGuardian'), false);
  assert.strictEqual(planAllows('pro', 'liveGuardian'), true);
});

test('Can validate usage limits', () => {
  assert.strictEqual(isWithinLimit('free', 5, 'scans'), true);
  assert.strictEqual(isWithinLimit('free', 10, 'scans'), false);
  assert.strictEqual(isWithinLimit('business', 1000, 'scans'), true);
});

// Test Usage Tracking
console.log('\n📊 Testing Usage Tracking\n');

test('Can track scan usage', () => {
  resetUsage();
  recordScan('https://example.com');
  const stats = getUsageStats();
  assert.strictEqual(stats.scansThisMonth, 1);
  assert.strictEqual(stats.totalScans, 1);
});

test('Can track multiple scans and sites', () => {
  resetUsage();
  recordScan('https://example.com');
  recordScan('https://example.com/page1');
  recordScan('https://test.com');
  
  const stats = getUsageStats();
  assert.strictEqual(stats.scansThisMonth, 3);
  assert.strictEqual(stats.sites.length, 2);
});

test('Can enforce scan limits', () => {
  resetUsage();
  for (let i = 0; i < 10; i++) {
    recordScan(`https://example.com/page${i}`);
  }
  assert.strictEqual(canPerformScan(10), false);
  assert.strictEqual(canPerformScan(200), true);
});

test('Can enforce site limits', () => {
  resetUsage();
  recordScan('https://site1.com');
  assert.strictEqual(canAddSite('https://site2.com', 1), false);
  assert.strictEqual(canAddSite('https://site1.com/page2', 1), true);
});

test('Can reset usage', () => {
  resetUsage();
  recordScan('https://example.com');
  const statsBeforeReset = getUsageStats();
  assert.strictEqual(statsBeforeReset.scansThisMonth, 1);
  
  // Manual reset (simulates monthly reset)
  resetUsage();
  const statsAfter = getUsageStats();
  assert.strictEqual(statsAfter.scansThisMonth, 0);
  assert.strictEqual(statsAfter.totalScans, 0); // Total also resets with full reset
});

// Test Plan Manager
console.log('\n🛡️  Testing Plan Manager\n');

test('Defaults to FREE plan', () => {
  const plan = getCurrentPlan();
  assert.strictEqual(plan.planId, 'free');
});

test('Can set plan', () => {
  setCurrentPlan('pro', { customerId: 'cus_test' });
  const plan = getCurrentPlan();
  assert.strictEqual(plan.planId, 'pro');
});

test('Can check feature availability in manager', () => {
  setCurrentPlan('free');
  const check = checkFeatureAllowed('liveGuardian');
  assert.strictEqual(check.allowed, false);
  assert.ok(check.message.includes('not available'));
  
  setCurrentPlan('pro');
  const proCheck = checkFeatureAllowed('liveGuardian');
  assert.strictEqual(proCheck.allowed, true);
});

test('Enforces scan limits before scan', () => {
  resetUsage();
  setCurrentPlan('free');
  
  for (let i = 0; i < 10; i++) {
    performScan(`https://example.com/page${i}`);
  }
  
  // 11th scan should be blocked by checkCanScan
  const check = checkCanScan('https://example.com/page11');
  assert.strictEqual(check.allowed, false);
  assert.ok(check.message.includes('limit'));
  
  // performScan should throw
  try {
    performScan('https://example.com/page11');
    throw new Error('Should have thrown');
  } catch (err) {
    assert.ok(err.message.includes('limit'));
  }
});

test('Enforces site limits', () => {
  resetUsage();
  setCurrentPlan('free');
  performScan('https://site1.com');
  
  // Adding a second site should be blocked
  const check = checkCanScan('https://site2.com');
  assert.strictEqual(check.allowed, false);
  assert.ok(check.message.includes('site'));
  
  // performScan should throw
  try {
    performScan('https://site2.com');
    throw new Error('Should have thrown');
  } catch (err) {
    assert.ok(err.message.includes('site'));
  }
});

test('Allows unlimited scans for BUSINESS', () => {
  resetUsage();
  setCurrentPlan('business');
  
  for (let i = 0; i < 100; i++) {
    const check = checkCanScan(`https://example.com/page${i}`);
    assert.strictEqual(check.allowed, true);
  }
  // Should not throw or return false
});

test('Provides plan summary', () => {
  resetUsage();
  setCurrentPlan('free');
  performScan('https://example.com');
  
  const summary = getPlanSummary();
  assert.strictEqual(summary.plan.id, 'free');
  assert.strictEqual(summary.limits.scans.used, 1);
  assert.strictEqual(summary.limits.scans.max, 10);
});

// Test Error Messages
console.log('\n💬 Testing Error Messages\n');

test('Provides human-readable scan limit message', () => {
  const msg = getLimitExceededMessage('free', 'scans');
  assert.ok(msg.includes('10 scans'));
  assert.ok(msg.includes('Upgrade'));
});

test('Provides human-readable site limit message', () => {
  const msg = getLimitExceededMessage('free', 'sites');
  assert.ok(msg.includes('1 site'));
});

test('Provides human-readable feature limit message', () => {
  const msg = getLimitExceededMessage('free', 'liveGuardian');
  assert.ok(msg.includes('Live Guardian'));
});

// Test Stripe Integration
console.log('\n💳 Testing Stripe Integration\n');

test('Generates checkout URL for PRO', () => {
  const url = getCheckoutUrl('pro');
  assert.ok(url.includes('http'));
});

test('Generates checkout URL for BUSINESS', () => {
  const url = getCheckoutUrl('business');
  assert.ok(url.includes('http'));
});

// Integration Tests
console.log('\n🔗 Testing Full Workflow Integration\n');

test('Full FREE plan workflow', () => {
  resetUsage();
  setCurrentPlan('free');
  
  // Can perform 10 scans
  for (let i = 0; i < 10; i++) {
    const check = checkCanScan(`https://example.com/page${i}`);
    assert.strictEqual(check.allowed, true);
    performScan(`https://example.com/page${i}`);
  }
  
  // 11th scan fails
  const check = checkCanScan('https://example.com/page11');
  assert.strictEqual(check.allowed, false);
  assert.ok(check.message.includes('limit'));
  
  try {
    performScan('https://example.com/page11');
    throw new Error('Should have thrown');
  } catch (err) {
    assert.ok(err.message.includes('limit'));
  }
  
  // Can't use live guardian
  const featureCheck = checkFeatureAllowed('liveGuardian');
  assert.strictEqual(featureCheck.allowed, false);
  assert.ok(featureCheck.message.includes('not available'));
});

test('Full PRO plan workflow', () => {
  resetUsage();
  setCurrentPlan('pro');
  
  // Can perform many scans
  for (let i = 0; i < 50; i++) {
    const check = checkCanScan(`https://example.com/page${i}`);
    assert.strictEqual(check.allowed, true);
    performScan(`https://example.com/page${i}`);
  }
  
  // Can use live guardian
  const featureCheck = checkFeatureAllowed('liveGuardian');
  assert.strictEqual(featureCheck.allowed, true);
  
  // Can use multiple sites
  const check2 = checkCanScan('https://site2.com');
  assert.strictEqual(check2.allowed, true);
  
  const check3 = checkCanScan('https://site3.com');
  assert.strictEqual(check3.allowed, true);
});

test('Full BUSINESS plan workflow', () => {
  resetUsage();
  setCurrentPlan('business');
  
  // Can perform unlimited scans
  for (let i = 0; i < 300; i++) {
    const check = checkCanScan(`https://site${i}.com`);
    assert.strictEqual(check.allowed, true);
    performScan(`https://site${i}.com`);
  }
  
  // Can use all features
  const liveCheck = checkFeatureAllowed('liveGuardian');
  assert.strictEqual(liveCheck.allowed, true);
  
  const ciCheck = checkFeatureAllowed('ciMode');
  assert.strictEqual(ciCheck.allowed, true);
  
  const alertCheck = checkFeatureAllowed('alerts');
  assert.strictEqual(alertCheck.allowed, true);
});

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (testsFailed === 0) {
  console.log(`✅ All ${testsPassed} tests PASSED`);
} else {
  console.log(`❌ ${testsFailed} tests FAILED (${testsPassed} passed)`);
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Clean up
cleanupTestData();

process.exit(testsFailed > 0 ? 1 : 0);
