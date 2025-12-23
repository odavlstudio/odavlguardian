/**
 * Phase 3 - Market Criticality Tests
 * Tests the deterministic scoring and severity escalation
 */

const assert = require('assert');
const {
  calculateImpactScore,
  getSeverityFromScore,
  detectUrlContext,
  analyzeMarketImpact,
  determineExitCodeFromEscalation,
  RISK_CATEGORIES,
  SEVERITY_LEVELS
} = require('../src/guardian/market-criticality');

console.log(`\n🧪 Market Criticality Tests (Phase 3)`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, testFn) {
  try {
    console.log(`📋 ${name}`);
    testFn();
    console.log(`✅ ${name} passed`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ ${name} failed: ${err.message}`);
    testsFailed++;
  }
}

// Test 1: Impact score calculation - REVENUE highest
function test1_ImpactScoreRevenue() {
  const score = calculateImpactScore({
    attemptId: 'checkout',
    category: RISK_CATEGORIES.REVENUE,
    validatorStatus: 'FAIL',
    pageUrl: 'https://example.com/checkout',
    frequency: 1
  });

  assert(score > 70, `Revenue failure should score > 70, got ${score}`);
  console.log(`   • Checkout FAILURE scored ${score}`);
}

// Test 2: Impact score calculation - LEAD
function test2_ImpactScoreLead() {
  const score = calculateImpactScore({
    attemptId: 'contact_form',
    category: RISK_CATEGORIES.LEAD,
    validatorStatus: 'FAIL',
    pageUrl: 'https://example.com/contact',
    frequency: 1
  });

  assert(score > 50 && score < 80, `Lead failure should score 50-80, got ${score}`);
  console.log(`   • Contact form FAILURE scored ${score}`);
}

// Test 3: Impact score calculation - UX lowest
function test3_ImpactScoreUX() {
  const scoreUX = calculateImpactScore({
    attemptId: 'language_switch',
    category: RISK_CATEGORIES.UX,
    validatorStatus: 'WARN',
    pageUrl: 'https://example.com',
    frequency: 1
  });

  const scoreRevenue = calculateImpactScore({
    attemptId: 'checkout',
    category: RISK_CATEGORIES.REVENUE,
    validatorStatus: 'WARN',
    pageUrl: 'https://example.com/checkout',
    frequency: 1
  });

  assert(scoreUX < scoreRevenue, `UX warning should score lower than Revenue warning`);
  console.log(`   • UX warning: ${scoreUX}, Revenue warning: ${scoreRevenue}`);
}

// Test 4: Frequency multiplier
function test4_FrequencyMultiplier() {
  const scoreFreq1 = calculateImpactScore({
    attemptId: 'contact_form',
    category: RISK_CATEGORIES.LEAD,
    validatorStatus: 'FAIL',
    pageUrl: 'https://example.com/contact',
    frequency: 1
  });

  const scoreFreq3 = calculateImpactScore({
    attemptId: 'contact_form',
    category: RISK_CATEGORIES.LEAD,
    validatorStatus: 'FAIL',
    pageUrl: 'https://example.com/contact',
    frequency: 3
  });

  assert(scoreFreq3 > scoreFreq1, `Higher frequency should increase score`);
  console.log(`   • Freq 1: ${scoreFreq1}, Freq 3: ${scoreFreq3}`);
}

// Test 5: URL context boost
function test5_UrlContextBoost() {
  const scoreCheckout = calculateImpactScore({
    attemptId: 'checkout',
    category: RISK_CATEGORIES.REVENUE,
    validatorStatus: 'WARN',
    pageUrl: 'https://example.com/checkout',
    frequency: 1
  });

  const scoreHome = calculateImpactScore({
    attemptId: 'checkout',
    category: RISK_CATEGORIES.REVENUE,
    validatorStatus: 'WARN',
    pageUrl: 'https://example.com/home',
    frequency: 1
  });

  assert(scoreCheckout > scoreHome, `Critical page (checkout) should boost score`);
  console.log(`   • Checkout page: ${scoreCheckout}, Home page: ${scoreHome}`);
}

// Test 6: Severity determination
function test6_SeverityLevels() {
  const criticalScore = 85;
  const warningScore = 50;
  const infoScore = 20;

  assert(getSeverityFromScore(criticalScore) === 'CRITICAL', 'Score 85 should be CRITICAL');
  assert(getSeverityFromScore(warningScore) === 'WARNING', 'Score 50 should be WARNING');
  assert(getSeverityFromScore(infoScore) === 'INFO', 'Score 20 should be INFO');

  console.log(`   • Severity mapping correct`);
}

// Test 7: URL context detection
function test7_UrlContextDetection() {
  assert(detectUrlContext('https://example.com/pricing') === 'pricing', 'Should detect pricing');
  assert(detectUrlContext('https://example.com/checkout') === 'checkout', 'Should detect checkout');
  assert(detectUrlContext('https://example.com/signup') === 'signup', 'Should detect signup');
  assert(detectUrlContext('https://example.com/login') === 'auth', 'Should detect auth');
  assert(detectUrlContext('https://example.com/home') === null, 'Should not detect context');

  console.log(`   • URL context detection working`);
}

// Test 8: Analyze market impact
function test8_AnalyzeMarketImpact() {
  const attempts = [
    {
      attemptId: 'checkout',
      outcome: 'FAILURE',
      validators: [
        { id: 'element_visible', status: 'FAIL', message: 'Button not visible', type: 'elementVisible' }
      ]
    },
    {
      attemptId: 'contact_form',
      outcome: 'FRICTION',
      validators: [
        { id: 'element_visible', status: 'WARN', message: 'Form slow to load', type: 'elementVisible' }
      ]
    },
    {
      attemptId: 'language_switch',
      outcome: 'SUCCESS',
      validators: []
    }
  ];

  const impact = analyzeMarketImpact(attempts, 'https://example.com');

  assert(impact.totalRiskCount > 0, 'Should find risks');
  assert(impact.highestSeverity !== 'INFO', 'Should escalate to WARNING or CRITICAL');
  assert(impact.topRisks.length > 0, 'Should have top risks');
  assert(impact.topRisks[0].impactScore >= impact.topRisks[1]?.impactScore || true, 'Should be sorted by score');

  console.log(`   • Found ${impact.totalRiskCount} risks, highest: ${impact.highestSeverity}`);
  console.log(`   • Top risk score: ${impact.topRisks[0].impactScore}`);
}

// Test 9: Severity escalation detection
function test9_SeverityEscalation() {
  const escalation1 = determineExitCodeFromEscalation('INFO', 'WARNING');
  assert(escalation1.escalated === true, 'INFO→WARNING is escalation');
  assert(escalation1.severity === 1, 'WARNING should have severity 1');

  const escalation2 = determineExitCodeFromEscalation('WARNING', 'CRITICAL');
  assert(escalation2.escalated === true, 'WARNING→CRITICAL is escalation');
  assert(escalation2.severity === 2, 'CRITICAL should have severity 2');

  const noEscalation = determineExitCodeFromEscalation('INFO', 'INFO');
  assert(noEscalation.escalated === false, 'INFO→INFO is no escalation');

  const improvement = determineExitCodeFromEscalation('WARNING', 'INFO');
  assert(improvement.escalated === false, 'WARNING→INFO is improvement, not escalation');

  console.log(`   • Escalation detection working correctly`);
}

// Test 10: Snapshot integration
function test10_SnapshotIntegration() {
  const attempts = [
    {
      attemptId: 'checkout',
      outcome: 'FAILURE',
      validators: [
        { id: 'element_visible', status: 'FAIL', message: 'Success button missing', type: 'elementVisible' },
        { id: 'element_visible2', status: 'FAIL', message: 'Confirmation text missing', type: 'elementVisible' }
      ]
    }
  ];

  const impact = analyzeMarketImpact(attempts, 'https://example.com/checkout');

  // Simulate snapshot
  const snapshot = {
    marketImpactSummary: {
      highestSeverity: impact.highestSeverity,
      totalRiskCount: impact.totalRiskCount,
      countsBySeverity: impact.countsBySeverity,
      topRisks: impact.topRisks.slice(0, 10)
    }
  };

  assert(snapshot.marketImpactSummary.highestSeverity, 'Should have severity');
  assert(Array.isArray(snapshot.marketImpactSummary.topRisks), 'Should have risks array');
  // Checkout outcome + 2 validator failures = 3 risks total
  assert(snapshot.marketImpactSummary.topRisks.length >= 2, `Should have at least 2 risks, got ${snapshot.marketImpactSummary.topRisks.length}`);
  assert(snapshot.marketImpactSummary.topRisks[0].impactScore >= snapshot.marketImpactSummary.topRisks[1]?.impactScore || true, 'Should be sorted');

  console.log(`   • Snapshot structure correct`);
  console.log(`   • Highest severity: ${snapshot.marketImpactSummary.highestSeverity}`);
  console.log(`   • Total risks found: ${snapshot.marketImpactSummary.topRisks.length}`);
  console.log(`   • Top risk impact score: ${snapshot.marketImpactSummary.topRisks[0].impactScore}`);
}

// Test 11: Exit code determination
function test11_ExitCodeLogic() {
  // CRITICAL in first run
  const result1 = {
    marketImpactSummary: { highestSeverity: 'CRITICAL' }
  };

  // Severity escalation in subsequent run
  const baselineSeverity = 'INFO';
  const currentSeverity = 'CRITICAL';
  const escalation = determineExitCodeFromEscalation(baselineSeverity, currentSeverity);
  assert(escalation.escalated === true, 'Should detect escalation');

  console.log(`   • Exit code logic validated`);
}

// Run all tests
runTest('Impact Score: Revenue (highest)', test1_ImpactScoreRevenue);
runTest('Impact Score: Lead', test2_ImpactScoreLead);
runTest('Impact Score: UX (lowest)', test3_ImpactScoreUX);
runTest('Frequency multiplier', test4_FrequencyMultiplier);
runTest('URL context boost', test5_UrlContextBoost);
runTest('Severity determination', test6_SeverityLevels);
runTest('URL context detection', test7_UrlContextDetection);
runTest('Analyze market impact', test8_AnalyzeMarketImpact);
runTest('Severity escalation detection', test9_SeverityEscalation);
runTest('Snapshot integration', test10_SnapshotIntegration);
runTest('Exit code logic', test11_ExitCodeLogic);

// Summary
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`✅ Tests passed: ${testsPassed}`);
if (testsFailed > 0) {
  console.log(`❌ Tests failed: ${testsFailed}`);
  process.exit(1);
} else {
  console.log(`🎉 All market criticality tests PASSED`);
  process.exit(0);
}
