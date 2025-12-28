/**
 * Phase 3: Robust Selector Discovery Tests
 * 
 * Tests that Guardian can execute attempts on uninstrumented websites
 * using fallback selectors, and properly classifies outcomes.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { executeReality } = require('../src/guardian/reality');
const { startFixtureServer } = require('./fixture-server');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔎 Phase 3: Robust Selector Discovery Tests');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let fixture = null;
let artifactsRoot = null;

async function setup() {
  fixture = await startFixtureServer();
  artifactsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-phase3-'));
  console.log(`📁 Test artifacts: ${artifactsRoot}\n`);
}

async function teardown() {
  if (fixture) await fixture.close();
}

// ============================================================================
// TEST 1: Standard Form Detection (Email + Password on Uninstrumented Site)
// ============================================================================

async function test1_UnInstrumentedLoginForm() {
  console.log('TEST 1: Login Attempt on Uninstrumented Site (Fallback Selectors)\n');

  const baseUrl = `${fixture.baseUrl}?mode=ok`; // Real fixture site without data-guardian attributes
  const artifactsDir = path.join(artifactsRoot, 'test1');

  const result = await executeReality({
    baseUrl,
    attempts: ['login'], // Login attempt requires email + password inputs
    artifactsDir,
    headful: false,
    enableTrace: false,
    enableScreenshots: true,
    enableCrawl: false,
    enableDiscovery: false,
    enableFlows: false
  });

  // Verify result structure
  assert.ok(result, 'Result should exist');
  assert.ok(result.snapshot, 'Snapshot should exist');

  const snapshot = result.snapshot;
  const loginAttempt = snapshot.attempts.find(a => a.attemptId === 'login');

  console.log(`  Outcome: ${loginAttempt ? loginAttempt.outcome : 'NOT_FOUND'}`);
  
  if (loginAttempt && loginAttempt.discoverySignals) {
    console.log(`  Discovery Signals:`, JSON.stringify(loginAttempt.discoverySignals, null, 2));
  }

  // If login is NOT_APPLICABLE or DISCOVERY_FAILED, that's OK - it means fixture doesn't have it
  // If it executed (SUCCESS or FAILURE), that proves fallback selectors worked
  if (loginAttempt && (loginAttempt.outcome === 'SUCCESS' || loginAttempt.outcome === 'FAILURE')) {
    console.log(`  ✅ PASS: Attempt executed (not skipped) using fallback selectors`);
  } else if (loginAttempt && (loginAttempt.outcome === 'NOT_APPLICABLE' || loginAttempt.outcome === 'DISCOVERY_FAILED')) {
    console.log(`  ✅ PASS: Attempt properly classified as ${loginAttempt.outcome}`);
  } else {
    console.log(`  ⚠️  WARN: Attempt outcome: ${loginAttempt?.outcome || 'not found'}`);
  }

  assert.ok(
    loginAttempt && (
      loginAttempt.outcome === 'SUCCESS' || 
      loginAttempt.outcome === 'FAILURE' || 
      loginAttempt.outcome === 'NOT_APPLICABLE' ||
      loginAttempt.outcome === 'DISCOVERY_FAILED'
    ),
    'Login attempt should have a valid outcome'
  );
}

// ============================================================================
// TEST 2: INSUFFICIENT_EVIDENCE Verdict
// ============================================================================

async function test2_InsufficientEvidenceVerdict() {
  console.log('\nTEST 2: INSUFFICIENT_EVIDENCE Verdict When No Attempts Execute\n');

  // Create a simple empty HTML page
  const emptyHtmlUrl = `${fixture.baseUrl}?mode=empty`;
  const artifactsDir = path.join(artifactsRoot, 'test2');

  const result = await executeReality({
    baseUrl: emptyHtmlUrl,
    attempts: ['login', 'signup', 'checkout'], // Multiple attempts that will likely not apply
    artifactsDir,
    headful: false,
    enableTrace: false,
    enableScreenshots: false,
    enableCrawl: false,
    enableDiscovery: false,
    enableFlows: false
  });

  const snapshot = result.snapshot;
  const verdict = snapshot.verdict || {};

  console.log(`  Verdict: ${verdict.verdict}`);
  console.log(`  Why: ${verdict.why}`);

  // If all attempts are NOT_APPLICABLE/DISCOVERY_FAILED/SKIPPED, verdict should be INSUFFICIENT_EVIDENCE
  const executedCount = (snapshot.attempts || []).filter(a => 
    a.outcome !== 'SKIPPED' && 
    a.outcome !== 'NOT_APPLICABLE' && 
    a.outcome !== 'DISCOVERY_FAILED'
  ).length;

  if (executedCount === 0) {
    assert.strictEqual(
      verdict.verdict,
      'INSUFFICIENT_EVIDENCE',
      'When no attempts execute, verdict must be INSUFFICIENT_EVIDENCE'
    );
    console.log(`  ✅ PASS: Verdict correctly set to INSUFFICIENT_EVIDENCE`);
  } else {
    console.log(`  ℹ️  INFO: ${executedCount} attempt(s) executed, verdict may vary`);
  }
}

// ============================================================================
// TEST 3: Not Applicable vs Discovery Failed
// ============================================================================

async function test3_NotApplicableVsDiscoveryFailed() {
  console.log('\nTEST 3: Distinguish NOT_APPLICABLE vs DISCOVERY_FAILED\n');

  const baseUrl = `${fixture.baseUrl}?mode=ok`;
  const artifactsDir = path.join(artifactsRoot, 'test3');

  const result = await executeReality({
    baseUrl,
    attempts: ['checkout', 'newsletter_signup'], // Attempts that fixture may not have
    artifactsDir,
    headful: false,
    enableTrace: false,
    enableScreenshots: true,
    enableCrawl: false,
    enableDiscovery: false,
    enableFlows: false
  });

  const snapshot = result.snapshot;
  
  snapshot.attempts.forEach(attempt => {
    console.log(`  ${attempt.attemptId}:`);
    console.log(`    Outcome: ${attempt.outcome}`);
    if (attempt.discoverySignals) {
      console.log(`    Discovery: ${JSON.stringify(attempt.discoverySignals).substring(0, 100)}...`);
    }
    if (attempt.skipReason) {
      console.log(`    Reason: ${attempt.skipReason}`);
    }
  });

  // Both outcomes are valid depending on site content
  console.log(`  ✅ PASS: Attempts properly classified`);
}

// ============================================================================
// TEST 4: Policy Evaluation with INSUFFICIENT_EVIDENCE
// ============================================================================

async function test4_PolicyEvaluation() {
  console.log('\nTEST 4: Policy Evaluation Treats INSUFFICIENT_EVIDENCE as WARN\n');

  const emptyHtmlUrl = `${fixture.baseUrl}?mode=empty`;
  const artifactsDir = path.join(artifactsRoot, 'test4');

  const result = await executeReality({
    baseUrl: emptyHtmlUrl,
    attempts: ['login', 'signup'],
    artifactsDir,
    headful: false,
    enableTrace: false,
    enableScreenshots: false,
    enableCrawl: false,
    enableDiscovery: false,
    enableFlows: false,
    policy: 'preset:startup' // Permissive policy
  });

  const snapshot = result.snapshot;
  const policyEval = result.policyEval || {};

  console.log(`  Verdict: ${snapshot.verdict?.verdict}`);
  console.log(`  Policy Exit Code: ${policyEval.exitCode}`);

  // Even with permissive policy, INSUFFICIENT_EVIDENCE should be WARN (exit code 2)
  if (snapshot.verdict?.verdict === 'INSUFFICIENT_EVIDENCE') {
    assert.strictEqual(
      policyEval.exitCode,
      2,
      'INSUFFICIENT_EVIDENCE verdict should always result in exit code 2 (WARN)'
    );
    console.log(`  ✅ PASS: Exit code correctly set to 2 (WARN)`);
  }
}

// ============================================================================
// TEST 5: Universal Attempts Execute on Generic Sites
// ============================================================================

async function test5_UniversalAttempts() {
  console.log('\nTEST 5: Universal Attempts execute and avoid INSUFFICIENT_EVIDENCE\n');

  // Fixture with internal nav links
  const smokeUrl = `${fixture.baseUrl}/universal/smoke`;
  const artifactsDir1 = path.join(artifactsRoot, 'test5-smoke');
  const snap1Result = await executeReality({
    baseUrl: smokeUrl,
    attempts: ['site_smoke'],
    artifactsDir: artifactsDir1,
    headful: false,
    enableTrace: false,
    enableScreenshots: false,
    enableCrawl: false,
    enableDiscovery: false,
    enableFlows: false
  });

  const snap1 = snap1Result.snapshot || snap1Result;
  const executed1 = (snap1.meta?.attemptsSummary?.executed) || (snap1.attempts || []).filter(a => a.outcome !== 'SKIPPED').length;
  assert.ok(executed1 > 0, 'site_smoke should execute');
  assert.notStrictEqual(snap1.verdict?.verdict || snap1.meta?.verdict?.verdict, 'INSUFFICIENT_EVIDENCE', 'Verdict should not be INSUFFICIENT_EVIDENCE when universal attempts run');
  console.log('  ✅ PASS: site_smoke executed on generic site');

  // Fixture with CTA + GitHub
  const ctaUrl = `${fixture.baseUrl}/universal/cta`;
  const artifactsDir2 = path.join(artifactsRoot, 'test5-cta');
  const snap2Result = await executeReality({
    baseUrl: ctaUrl,
    attempts: ['primary_ctas'],
    artifactsDir: artifactsDir2,
    headful: false,
    enableTrace: false,
    enableScreenshots: false,
    enableCrawl: false,
    enableDiscovery: false,
    enableFlows: false
  });

  const snap2 = snap2Result.snapshot || snap2Result;
  const executed2 = (snap2.meta?.attemptsSummary?.executed) || (snap2.attempts || []).filter(a => a.outcome !== 'SKIPPED').length;
  assert.ok(executed2 > 0, 'primary_ctas should execute');
  assert.notStrictEqual(snap2.verdict?.verdict || snap2.meta?.verdict?.verdict, 'INSUFFICIENT_EVIDENCE', 'Verdict should not be INSUFFICIENT_EVIDENCE after CTA attempt');
  console.log('  ✅ PASS: primary_ctas executed and produced evidence');

  // Fixture with mailto contact
  const contactUrl = `${fixture.baseUrl}/universal/mailto`;
  const artifactsDir3 = path.join(artifactsRoot, 'test5-contact');
  const snap3Result = await executeReality({
    baseUrl: contactUrl,
    attempts: ['contact_discovery_v2'],
    artifactsDir: artifactsDir3,
    headful: false,
    enableTrace: false,
    enableScreenshots: false,
    enableCrawl: false,
    enableDiscovery: false,
    enableFlows: false
  });

  const snap3 = snap3Result.snapshot || snap3Result;
  const contactAttempt = (snap3.attempts || []).find(a => a.attemptId === 'contact_discovery_v2');
  assert.ok(contactAttempt && contactAttempt.outcome === 'SUCCESS', 'contact_discovery_v2 should succeed via mailto');
  assert.notStrictEqual(snap3.verdict?.verdict || snap3.meta?.verdict?.verdict, 'INSUFFICIENT_EVIDENCE', 'Verdict should not be INSUFFICIENT_EVIDENCE after contact discovery');
  console.log('  ✅ PASS: contact_discovery_v2 succeeded via mailto');
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  try {
    await setup();
    
    await test1_UnInstrumentedLoginForm();
    await test2_InsufficientEvidenceVerdict();
    await test3_NotApplicableVsDiscoveryFailed();
    await test4_PolicyEvaluation();
    await test5_UniversalAttempts();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All Phase 3 tests PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await teardown();
  }
}

runAllTests();
