/**
 * Phase 10: First 100 Users Tests
 * Tests for founder tracking, feedback system, and usage signals
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { 
  registerUser, 
  isFoundingUser, 
  getFounderStatus, 
  getFounderMessage, 
  getFounderBadgeHTML,
  getTotalUsers,
  resetFounderData 
} = require('../src/founder/founder-tracker');
const { 
  saveFeedback, 
  getAllFeedback, 
  getFeedbackCount, 
  clearFeedback 
} = require('../src/founder/feedback-system');
const { 
  recordFirstScan, 
  recordFirstLive, 
  recordFirstUpgrade, 
  getSignals, 
  getUsageSummary,
  resetSignals 
} = require('../src/founder/usage-signals');

console.log('\n🧪 Phase 10: First 100 Users Tests');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    // Clean up before each test
    resetFounderData();
    clearFeedback();
    resetSignals();
    
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${err.message}`);
    testsFailed++;
  }
}

// ============================================================
// FOUNDER TRACKING TESTS
// ============================================================

console.log('🌟 Testing Founder Tracking\n');

test('Should register first user as founder', () => {
  const status = registerUser();
  assert.strictEqual(status.isFounder, true);
  assert.strictEqual(status.founderNumber, 1);
  assert.ok(status.registeredAt);
  assert.ok(status.machineId);
});

test('Should detect founding user status', () => {
  registerUser();
  assert.strictEqual(isFoundingUser(), true);
});

test('Should persist founder status across calls', () => {
  const status1 = registerUser();
  const status2 = getFounderStatus();
  
  assert.strictEqual(status1.founderNumber, status2.founderNumber);
  assert.strictEqual(status1.machineId, status2.machineId);
});

test('Should track total registered users', () => {
  registerUser();
  assert.strictEqual(getTotalUsers(), 1);
});

test('Should generate founder message for founding users', () => {
  registerUser();
  const message = getFounderMessage();
  
  assert.ok(message);
  assert.ok(message.includes('Founding User #1'));
  assert.ok(message.includes('thank you'));
});

test('Should not generate message for non-founders', () => {
  // Simulate user #101 (non-founder)
  resetFounderData();
  
  // Manually create a non-founder status
  const FOUNDER_DIR = path.join(os.homedir(), '.odavl-guardian', 'founder');
  const FOUNDER_FILE = path.join(FOUNDER_DIR, 'status.json');
  
  if (!fs.existsSync(FOUNDER_DIR)) {
    fs.mkdirSync(FOUNDER_DIR, { recursive: true });
  }
  
  const nonFounderStatus = {
    isFounder: false,
    registeredAt: new Date().toISOString(),
    founderNumber: null,
    machineId: 'test-machine-id',
  };
  
  fs.writeFileSync(FOUNDER_FILE, JSON.stringify(nonFounderStatus, null, 2));
  
  const message = getFounderMessage();
  assert.strictEqual(message, null);
});

test('Should generate HTML badge for founding users', () => {
  registerUser();
  const badge = getFounderBadgeHTML();
  
  assert.ok(badge);
  assert.ok(badge.includes('Founding User #1'));
  assert.ok(badge.includes('🌟'));
  assert.ok(badge.includes('style='));
});

test('Should not generate HTML badge for non-founders', () => {
  const badge = getFounderBadgeHTML();
  assert.strictEqual(badge, '');
});

test('Should handle multiple registrations with same machine ID', () => {
  const status1 = registerUser();
  const status2 = registerUser();
  
  assert.strictEqual(status1.founderNumber, status2.founderNumber);
  assert.strictEqual(status1.machineId, status2.machineId);
  assert.strictEqual(getTotalUsers(), 1); // Should not increment
});

// ============================================================
// FEEDBACK SYSTEM TESTS
// ============================================================

console.log('\n💬 Testing Feedback System\n');

test('Should save feedback to file', () => {
  const feedback = {
    timestamp: new Date().toISOString(),
    responses: {
      whatWorked: 'Easy setup',
      whatBlocked: 'Documentation unclear',
      wouldRecommend: 'yes',
    },
    email: 'test@example.com',
  };
  
  const filepath = saveFeedback(feedback);
  assert.ok(fs.existsSync(filepath));
  
  const saved = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  assert.strictEqual(saved.responses.whatWorked, 'Easy setup');
  assert.strictEqual(saved.email, 'test@example.com');
});

test('Should retrieve all feedback', () => {
  const feedback1 = {
    timestamp: new Date().toISOString(),
    responses: {
      whatWorked: 'Test 1',
      whatBlocked: 'Nothing',
      wouldRecommend: 'yes',
    },
  };
  
  saveFeedback(feedback1);
  
  // Small delay to ensure different filenames
  const start = Date.now();
  while (Date.now() - start < 10) {} // 10ms delay
  
  const feedback2 = {
    timestamp: new Date().toISOString(),
    responses: {
      whatWorked: 'Test 2',
      whatBlocked: 'Something',
      wouldRecommend: 'no',
    },
  };
  
  saveFeedback(feedback2);
  
  const all = getAllFeedback();
  assert.strictEqual(all.length, 2);
});

test('Should count feedback submissions', () => {
  saveFeedback({
    timestamp: new Date().toISOString(),
    responses: { whatWorked: 'A', whatBlocked: 'B', wouldRecommend: 'yes' },
  });
  
  // Small delay to ensure different filenames
  const start = Date.now();
  while (Date.now() - start < 10) {} // 10ms delay
  
  saveFeedback({
    timestamp: new Date().toISOString(),
    responses: { whatWorked: 'C', whatBlocked: 'D', wouldRecommend: 'no' },
  });
  
  assert.strictEqual(getFeedbackCount(), 2);
});

test('Should clear all feedback', () => {
  saveFeedback({
    timestamp: new Date().toISOString(),
    responses: { whatWorked: 'Test', whatBlocked: 'Test', wouldRecommend: 'yes' },
  });
  
  assert.strictEqual(getFeedbackCount(), 1);
  
  clearFeedback();
  assert.strictEqual(getFeedbackCount(), 0);
});

test('Should handle feedback without email', () => {
  const feedback = {
    timestamp: new Date().toISOString(),
    responses: {
      whatWorked: 'Great tool',
      whatBlocked: 'None',
      wouldRecommend: 'yes',
    },
  };
  
  const filepath = saveFeedback(feedback);
  const saved = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  
  assert.strictEqual(saved.email, undefined);
});

// ============================================================
// USAGE SIGNALS TESTS
// ============================================================

console.log('\n📊 Testing Usage Signals\n');

test('Should record first scan signal', () => {
  const signals = recordFirstScan();
  
  assert.ok(signals.firstScanAt);
  assert.strictEqual(signals.totalScans, 1);
});

test('Should only record first scan timestamp once', () => {
  const signals1 = recordFirstScan();
  const timestamp1 = signals1.firstScanAt;
  
  // Wait a tiny bit
  const signals2 = recordFirstScan();
  const timestamp2 = signals2.firstScanAt;
  
  assert.strictEqual(timestamp1, timestamp2);
  assert.strictEqual(signals2.totalScans, 2); // But count increments
});

test('Should record first live session signal', () => {
  const signals = recordFirstLive();
  
  assert.ok(signals.firstLiveAt);
  assert.strictEqual(signals.totalLiveSessions, 1);
});

test('Should only record first live timestamp once', () => {
  const signals1 = recordFirstLive();
  const timestamp1 = signals1.firstLiveAt;
  
  const signals2 = recordFirstLive();
  const timestamp2 = signals2.firstLiveAt;
  
  assert.strictEqual(timestamp1, timestamp2);
  assert.strictEqual(signals2.totalLiveSessions, 2);
});

test('Should record first upgrade signal', () => {
  const signals = recordFirstUpgrade('pro');
  
  assert.ok(signals.firstUpgradeAt);
  assert.strictEqual(signals.firstUpgradePlan, 'pro');
});

test('Should only record first upgrade once', () => {
  recordFirstUpgrade('pro');
  const signals = recordFirstUpgrade('business');
  
  // Should still be 'pro' from first upgrade
  assert.strictEqual(signals.firstUpgradePlan, 'pro');
});

test('Should get all signals', () => {
  recordFirstScan();
  recordFirstLive();
  recordFirstUpgrade('pro');
  
  const signals = getSignals();
  
  assert.ok(signals.firstScanAt);
  assert.ok(signals.firstLiveAt);
  assert.ok(signals.firstUpgradeAt);
  assert.strictEqual(signals.totalScans, 1);
  assert.strictEqual(signals.totalLiveSessions, 1);
});

test('Should generate usage summary', () => {
  recordFirstScan();
  recordFirstLive();
  
  const summary = getUsageSummary();
  
  assert.strictEqual(summary.hasScanned, true);
  assert.strictEqual(summary.hasUsedLive, true);
  assert.strictEqual(summary.hasUpgraded, false);
  assert.strictEqual(summary.totalScans, 1);
  assert.strictEqual(summary.totalLiveSessions, 1);
  assert.strictEqual(summary.daysSinceFirstScan, 0); // Same day
});

test('Should handle no signals gracefully', () => {
  const signals = getSignals();
  
  assert.strictEqual(signals.firstScanAt, null);
  assert.strictEqual(signals.firstLiveAt, null);
  assert.strictEqual(signals.firstUpgradeAt, null);
  assert.strictEqual(signals.totalScans, 0);
  assert.strictEqual(signals.totalLiveSessions, 0);
});

test('Should reset signals', () => {
  recordFirstScan();
  recordFirstLive();
  
  resetSignals();
  
  const signals = getSignals();
  assert.strictEqual(signals.firstScanAt, null);
  assert.strictEqual(signals.totalScans, 0);
});

// ============================================================
// INTEGRATION TESTS
// ============================================================

console.log('\n🔗 Testing Integration\n');

test('Full workflow: New user scans, gives feedback, upgrades', () => {
  // Register as founder
  const founderStatus = registerUser();
  assert.strictEqual(founderStatus.isFounder, true);
  
  // Record scan
  recordFirstScan();
  recordFirstScan(); // Second scan
  
  const signals = getSignals();
  assert.strictEqual(signals.totalScans, 2);
  
  // Give feedback
  const feedback = {
    timestamp: new Date().toISOString(),
    responses: {
      whatWorked: 'Fast and reliable',
      whatBlocked: 'Nothing major',
      wouldRecommend: 'yes',
    },
    email: 'founder@example.com',
  };
  saveFeedback(feedback);
  
  assert.strictEqual(getFeedbackCount(), 1);
  
  // Upgrade
  recordFirstUpgrade('pro');
  
  const summary = getUsageSummary();
  assert.strictEqual(summary.hasScanned, true);
  assert.strictEqual(summary.hasUpgraded, true);
  
  // Verify founder status persists
  assert.strictEqual(isFoundingUser(), true);
  const message = getFounderMessage();
  assert.ok(message.includes('Founding User #1'));
});

test('User journey: Multiple scans, live sessions, feedback', () => {
  registerUser();
  
  // Multiple scans
  for (let i = 0; i < 5; i++) {
    recordFirstScan();
  }
  
  // Multiple live sessions
  for (let i = 0; i < 3; i++) {
    recordFirstLive();
  }
  
  const summary = getUsageSummary();
  assert.strictEqual(summary.totalScans, 5);
  assert.strictEqual(summary.totalLiveSessions, 3);
  
  // Provide feedback
  saveFeedback({
    timestamp: new Date().toISOString(),
    responses: {
      whatWorked: 'Comprehensive checks',
      whatBlocked: 'Slow on large sites',
      wouldRecommend: 'yes',
    },
  });
  
  assert.strictEqual(getFeedbackCount(), 1);
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
resetFounderData();
clearFeedback();
resetSignals();

process.exit(testsFailed > 0 ? 1 : 0);
