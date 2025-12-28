const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const { generateCliSummary } = require('../src/guardian/cli-summary');
const { generateEnhancedHtml } = require('../src/guardian/enhanced-html-reporter');

function writeRun(artifactsDir, siteSlug, dateStr, snapshot) {
  const dirName = `${dateStr}_${siteSlug}_default_PASSED`;
  const runDir = path.join(artifactsDir, dirName);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'META.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    url: 'http://demo.com',
    siteSlug,
    policy: 'default',
    result: 'PASSED',
    durationMs: 1000
  }, null, 2));
  fs.writeFileSync(path.join(runDir, 'snapshot.json'), JSON.stringify(snapshot, null, 2));
}

function baseSnapshot(attempts, verdictScore) {
  return {
    meta: { url: 'http://demo.com', runId: 'run-action', createdAt: new Date().toISOString() },
    attempts,
    verdict: { verdict: 'FRICTION', confidence: { level: verdictScore >= 0.66 ? 'high' : 'medium', score: verdictScore } },
    discovery: { pagesVisitedCount: 1, interactionsDiscovered: 2, interactionsExecuted: 2 },
    evidence: {},
    marketImpactSummary: { countsBySeverity: { CRITICAL: 0, WARNING: 1, INFO: 0 }, topRisks: [] }
  };
}

(function run() {
  console.log('\n🧪 Pattern Action Focus Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const tmpArtifacts = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-pattern-focus-'));
  const siteSlug = 'demo-site';

  // Create 3 runs to trigger all patterns
  // Run 1: SKIPPED signup, FAILURE payment
  writeRun(tmpArtifacts, siteSlug, '2025-12-24_00-00-00', baseSnapshot([
    { attemptId: 'signup', outcome: 'SKIPPED' },
    { attemptId: 'checkout', outcome: 'SUCCESS' },
    { attemptId: 'payment', outcome: 'FAILURE' }
  ], 0.8));

  // Run 2: SKIPPED signup, FRICTION checkout, FAILURE payment
  writeRun(tmpArtifacts, siteSlug, '2025-12-25_00-00-00', baseSnapshot([
    { attemptId: 'signup', outcome: 'SKIPPED' },
    { attemptId: 'checkout', outcome: 'FRICTION', totalDurationMs: 1200 },
    { attemptId: 'payment', outcome: 'FAILURE' }
  ], 0.6));

  // Run 3: SUCCESS signup, FRICTION checkout, FAILURE payment
  writeRun(tmpArtifacts, siteSlug, '2025-12-26_00-00-00', baseSnapshot([
    { attemptId: 'signup', outcome: 'SUCCESS' },
    { attemptId: 'checkout', outcome: 'FRICTION', totalDurationMs: 1500 },
    { attemptId: 'payment', outcome: 'FAILURE' },
    { attemptId: 'search', outcome: 'SUCCESS' }
  ], 0.5));

  // Run 4: Ensure single point failure has executedCount >= 4
  writeRun(tmpArtifacts, siteSlug, '2025-12-27_00-00-00', baseSnapshot([
    { attemptId: 'signup', outcome: 'SUCCESS' },
    { attemptId: 'checkout', outcome: 'SUCCESS' },
    { attemptId: 'payment', outcome: 'FAILURE' }
  ], 0.4));

  const snapshotCurrent = {
    meta: { url: 'http://demo.com', runId: 'run-current', createdAt: new Date().toISOString() },
    verdict: { verdict: 'FRICTION', confidence: { level: 'medium', score: 0.5 } },
    attempts: [],
    discovery: { pagesVisitedCount: 0, interactionsDiscovered: 0, interactionsExecuted: 0 },
    evidence: {},
    marketImpactSummary: { countsBySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0 }, topRisks: [] }
  };

  const cli = generateCliSummary(snapshotCurrent, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  const html = generateEnhancedHtml(snapshotCurrent, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });

  const focusSkipped = 'Coverage gap detected; this path has not been exercised.';
  const focusFriction = 'User experience may be degrading on this path.';
  const focusConfidence = 'Overall quality signals are trending down across runs.';
  const focusSinglePoint = 'This path is a bottleneck and blocks user progress.';

  // Assert presence in CLI for top-3 displayed patterns (confidence degradation, single point failure, repeated skipped)
  assert.ok(cli.includes(focusConfidence), 'CLI should include action focus for confidence degradation');
  assert.ok(cli.includes(focusSinglePoint), 'CLI should include action focus for single point of failure');
  assert.ok(cli.includes(focusSkipped), 'CLI should include action focus for repeated skipped attempts');

  // Assert presence in HTML
  assert.ok(html.includes(focusSkipped), 'HTML should include action focus for repeated skipped attempts');
  assert.ok(html.includes(focusFriction), 'HTML should include action focus for recurring friction');
  assert.ok(html.includes(focusConfidence), 'HTML should include action focus for confidence degradation');
  assert.ok(html.includes(focusSinglePoint), 'HTML should include action focus for single point of failure');

  console.log('✅ Action focus appears for displayed CLI patterns and all HTML patterns');

  // Case: No patterns (less than 2 runs) → no focus lines
  const tmpNoPatterns = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-pattern-none-'));
  writeRun(tmpNoPatterns, siteSlug, '2025-12-27_00-00-00', baseSnapshot([
    { attemptId: 'signup', outcome: 'SUCCESS' }
  ], 0.9));

  const cliNo = generateCliSummary(snapshotCurrent, null, null, { artifactsDir: tmpNoPatterns, siteSlug });
  const htmlNo = generateEnhancedHtml(snapshotCurrent, tmpNoPatterns, { artifactsDir: tmpNoPatterns, siteSlug });

  [focusSkipped, focusFriction, focusConfidence, focusSinglePoint].forEach(focus => {
    assert.ok(!cliNo.includes(focus), 'CLI should not include action focus when no patterns exist');
    assert.ok(!htmlNo.includes(focus), 'HTML should not include action focus when no patterns exist');
  });

  console.log('✅ No action focus when patterns do not exist');
  console.log('\nAll pattern action focus tests passed.');
})();
