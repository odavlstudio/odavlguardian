const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const { generateCliSummary } = require('../src/guardian/cli-summary');
const { generateEnhancedHtml } = require('../src/guardian/enhanced-html-reporter');

const MICRO_LINE = 'Confidence reflects the strength of evidence from outcomes, coverage, and captured artifacts.';

function makeRunDir(baseDir, dirName, meta) {
  const dir = path.join(baseDir, dirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'META.json'), JSON.stringify(meta || {
    timestamp: new Date().toISOString(),
    url: 'http://demo.com',
    siteSlug: 'demo-site',
    policy: 'default',
    result: 'PASSED',
    durationMs: 1000
  }, null, 2));
  return dir;
}

function baseSnapshot(confLevel = 'medium') {
  return {
    meta: { url: 'http://demo.com', runId: 'run-x', createdAt: new Date().toISOString() },
    verdict: { verdict: 'FRICTION', confidence: { level: confLevel, score: confLevel === 'high' ? 0.8 : 0.4 }, why: 'Test scenario.' },
    attempts: [],
    marketImpactSummary: { countsBySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0 }, topRisks: [] },
    discovery: { pagesVisitedCount: 0, interactionsDiscovered: 0, interactionsExecuted: 0 },
    evidence: {}
  };
}

(function run() {
  console.log('\n🧪 Confidence Micro-Line Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const tmpArtifacts = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-confidence-'));
  const siteSlug = 'demo-site';

  // Case A: low/medium confidence → line appears
  let snapshotA = baseSnapshot('low');
  let cliA = generateCliSummary(snapshotA, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  let htmlA = generateEnhancedHtml(snapshotA, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(cliA.includes(MICRO_LINE), 'CLI should show micro-line for low confidence');
  assert.ok(htmlA.includes(MICRO_LINE), 'HTML should show micro-line for low confidence');
  console.log('✅ Case A passed: appears for low confidence');

  // Case B: first-run context active (only 1 prior run), high confidence → line appears
  makeRunDir(tmpArtifacts, `2025-12-25_00-00-00_${siteSlug}_default_PASSED`);
  let snapshotB = baseSnapshot('high');
  let cliB = generateCliSummary(snapshotB, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  let htmlB = generateEnhancedHtml(snapshotB, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(cliB.includes(MICRO_LINE), 'CLI should show micro-line for first-run even if high');
  assert.ok(htmlB.includes(MICRO_LINE), 'HTML should show micro-line for first-run even if high');
  console.log('✅ Case B passed: appears for first-run with high confidence');

  // Case C: non-first run (>=2 runs), high confidence → line suppressed
  makeRunDir(tmpArtifacts, `2025-12-26_00-00-00_${siteSlug}_default_PASSED`);
  let snapshotC = baseSnapshot('high');
  let cliC = generateCliSummary(snapshotC, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  let htmlC = generateEnhancedHtml(snapshotC, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(!cliC.includes(MICRO_LINE), 'CLI should suppress micro-line for high confidence on non-first run');
  assert.ok(!htmlC.includes(MICRO_LINE), 'HTML should suppress micro-line for high confidence on non-first run');
  console.log('✅ Case C passed: suppressed for high confidence on non-first run');

  console.log('\nAll confidence micro-line tests passed.');
})();
