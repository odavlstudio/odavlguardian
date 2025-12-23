const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { executeReality } = require('../src/guardian/reality');
const { startFixtureServer } = require('./fixture-server');

async function runReality(baseUrl, attempts) {
  const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-reality-'));
  return executeReality({ baseUrl, attempts, artifactsDir, headful: false, enableTrace: false, enableScreenshots: false });
}

async function withFixture(fn) {
  const fixture = await startFixtureServer();
  try {
    await fn(fixture);
  } finally {
    await fixture.close();
  }
}

async function testOkMode() {
  await withFixture(async (fixture) => {
    const baseUrl = `${fixture.baseUrl}?mode=ok`;
    const result = await runReality(baseUrl);

    assert.strictEqual(result.report.summary.overallVerdict, 'SUCCESS');
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.report.summary.failureCount, 0);
    assert.strictEqual(result.report.summary.frictionCount, 0);
    assert.strictEqual(result.attemptResults.length, 3);
    result.attemptResults.forEach(r => assert.strictEqual(r.outcome, 'SUCCESS'));

    // Reports exist
    assert.ok(fs.existsSync(result.marketJsonPath));
    assert.ok(fs.existsSync(result.marketHtmlPath));
  });
}

async function testFailMode() {
  await withFixture(async (fixture) => {
    const baseUrl = `${fixture.baseUrl}?mode=fail`;
    const result = await runReality(baseUrl);

    assert.strictEqual(result.report.summary.overallVerdict, 'FAILURE');
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.report.summary.failureCount > 0);
    assert.strictEqual(result.attemptResults.length, 3);

    // At least one attempt failure
    assert.ok(result.attemptResults.some(r => r.outcome === 'FAILURE'));
  });
}

async function testFrictionMode() {
  await withFixture(async (fixture) => {
    const baseUrl = `${fixture.baseUrl}?mode=friction`;
    const result = await runReality(baseUrl);

    assert.strictEqual(result.report.summary.overallVerdict, 'FRICTION');
    assert.strictEqual(result.exitCode, 2);
    assert.ok(result.report.summary.frictionCount > 0);
    assert.strictEqual(result.report.summary.failureCount, 0, 'No failures expected in friction mode');

    // Ensure friction signals present in at least one attempt
    const hasSignals = result.report.results.some(r => (r.friction && r.friction.signals && r.friction.signals.length > 0));
    assert.ok(hasSignals, 'At least one attempt should surface friction signals');
  });
}

async function main() {
  console.log('\n🧪 Reality Tests');
  await testOkMode();
  console.log('✅ OK mode reality test passed');
  await testFailMode();
  console.log('✅ FAIL mode reality test passed');
  await testFrictionMode();
  console.log('✅ FRICTION mode reality test passed');
  console.log('All reality tests passed.');
}

main().catch(err => {
  console.error('❌ Reality tests failed:', err);
  process.exit(1);
});