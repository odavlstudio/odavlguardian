/**
 * Golden Path Tests
 * 
 * Verify first-run behavior:
 * - Environment guard
 * - First-run profile applied
 * - CLI output tightened
 * - Artifacts guaranteed
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { startFixtureServer } = require('./fixture-server');
const { executeReality } = require('../src/guardian/reality');
const { isFirstRun, applyFirstRunProfile } = require('../src/guardian/first-run-profile');
const { checkEnvironment } = require('../src/guardian/env-guard');
const { loadSnapshot } = require('../src/guardian/snapshot');

async function runTests() {
  console.log('\n🚀 Golden Path Tests (Stage II)\n');

  // Test 1: Env guard
  console.log('📋 Test 1: Environment guard checks');
  try {
    const envCheck = checkEnvironment();
    assert.strictEqual(envCheck.allOk, true, 'Environment should be ready');
    console.log('✅ Test 1 passed: Environment ready\n');
  } catch (e) {
    console.error('❌ Test 1 failed:', e.message, '\n');
    process.exit(1);
  }

  // Test 2: First-run profile application
  console.log('📋 Test 2: First-run profile defaults');
  try {
    const userConfig = {
      baseUrl: 'https://example.com',
      attempts: ['test']
    };
    const profiled = applyFirstRunProfile(userConfig);
    assert.ok(profiled.timeout !== undefined, 'Profile should set timeout');
    assert.strictEqual(profiled.parallel, 1, 'Profile should disable parallelism');
    assert.strictEqual(profiled.enableDiscovery, false, 'Profile should disable discovery');
    console.log('✅ Test 2 passed: Profile applied correctly\n');
  } catch (e) {
    console.error('❌ Test 2 failed:', e.message, '\n');
    process.exit(1);
  }

  // Test 3: Golden path real scan
  console.log('📋 Test 3: Golden path execution (real scan)');
  const fixture = await startFixtureServer();
  const baseUrl = `${fixture.baseUrl}?mode=ok`;
  const tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-golden-'));
  const tempArtifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-artifacts-'));

  try {
    const result = await executeReality({
      baseUrl,
      artifactsDir: path.join(tempArtifactsDir, 'golden'),
      storageDir: tempStorageDir,
      enableCrawl: false,
      headful: false,
      enableTrace: false,
      enableScreenshots: true
    });

    // Assert artifacts produced
    assert.ok(fs.existsSync(result.snapshotPath), 'snapshot.json must exist');
    assert.ok(fs.existsSync(result.runDir), 'run directory must exist');

    const snap = loadSnapshot(result.snapshotPath);

    // Assert verdict present
    assert.ok(snap.verdict, 'snapshot must include verdict');
    assert.ok(['READY', 'DO_NOT_LAUNCH', 'FRICTION'].includes(snap.verdict.verdict), 'verdict must be valid');

    // Assert metadata with verdict
    assert.ok(snap.meta.verdict, 'meta should include verdict summary');

    // Check for HTML report
    const htmlPath = path.join(result.runDir, 'report.html');
    assert.ok(fs.existsSync(htmlPath), 'HTML report must exist');

    // Check for market report
    const marketPath = path.join(result.runDir, 'market-report.json');
    assert.ok(fs.existsSync(marketPath), 'Market report JSON must exist');

    console.log('✅ Test 3 passed: Golden path produces all artifacts\n');

    console.log('📊 Golden Path Results:');
    console.log(`   Run ID: ${snap.meta.runId}`);
    console.log(`   Verdict: ${snap.verdict.verdict}`);
    console.log(`   Confidence: ${snap.verdict.confidence.level}`);
    console.log(`   Artifacts at: ${result.runDir}`);

  } catch (e) {
    console.error('❌ Test 3 failed:', e.message);
    if (process.env.GUARDIAN_DEBUG) console.error(e.stack);
    process.exit(1);
  } finally {
    try { await fixture.server.close(); } catch {}
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All golden path tests passed!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

runTests().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
