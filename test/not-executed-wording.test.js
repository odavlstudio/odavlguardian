const assert = require('assert');
const { buildVerdict } = require('../src/guardian/verdict');
const { generateCliSummary } = require('../src/guardian/cli-summary');
const { generateEnhancedHtml } = require('../src/guardian/enhanced-html-reporter');
const fs = require('fs');
const path = require('path');
const os = require('os');

function makeSnapshotWithSkipped() {
  return {
    meta: { url: 'http://demo.com', runId: 'run-xyz', createdAt: new Date().toISOString() },
    attempts: [
      { attemptId: 'login', attemptName: 'Login', outcome: 'SUCCESS', totalDurationMs: 1200 },
      { attemptId: 'signup', attemptName: 'Signup', outcome: 'SKIPPED', skipReason: 'policy: out-of-scope' }
    ],
    marketImpactSummary: { countsBySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0 }, topRisks: [] },
    discovery: { pagesVisitedCount: 1, interactionsDiscovered: 0, interactionsExecuted: 0 },
    evidence: {}
  };
}

(function run() {
  console.log('\n🧪 Not-Executed Wording Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const snapshot = makeSnapshotWithSkipped();
  const verdict = buildVerdict(snapshot);

  // Attach verdict to snapshot as would happen in reality
  snapshot.verdict = verdict;

  // 1) Verdict semantics
  const findingsText = verdict.keyFindings.join(' | ');
  const limitsText = verdict.limits.join(' | ');
  const driversText = verdict.confidence.reasons.join(' | ');

  assert.ok(findingsText.includes('not executed'), 'Key Findings should mention "not executed"');
  assert.ok(limitsText.includes('not executed'), 'Limits should mention "not executed"');
  assert.ok(!driversText.includes('not executed'), 'Drivers should NOT include "not executed"');

  console.log('✅ Verdict semantics passed');

  // 2) CLI normalization
  const tmpArtifacts = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-wording-'));
  const siteSlug = 'demo-site';
  const cli = generateCliSummary(snapshot, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(cli.includes('not executed'), 'CLI should use "not executed" wording');
  assert.ok(!cli.includes('skipped'), 'CLI should NOT use "skipped" wording');

  console.log('✅ CLI wording normalized');

  // 3) HTML normalization
  const html = generateEnhancedHtml(snapshot, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(html.includes('Not Executed'), 'HTML should label SKIPPED as "Not Executed"');
  assert.ok(!html.includes('SKIPPED'), 'HTML should NOT display "SKIPPED"');

  console.log('✅ HTML wording normalized');

  console.log('\nAll wording normalization tests passed.');
})();
