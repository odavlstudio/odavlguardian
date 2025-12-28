const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const { generateCliSummary } = require('../src/guardian/cli-summary');
const { generateEnhancedHtml } = require('../src/guardian/enhanced-html-reporter');

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

function baseSnapshot() {
  return {
    meta: { url: 'http://demo.com', runId: 'run-journey', createdAt: new Date().toISOString() },
    verdict: { verdict: 'FRICTION', confidence: { level: 'medium', score: 0.5 }, why: 'Test scenario.' },
    attempts: [],
    marketImpactSummary: { countsBySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0 }, topRisks: [] },
    discovery: { pagesVisitedCount: 0, interactionsDiscovered: 0, interactionsExecuted: 0 },
    evidence: {}
  };
}

(function run() {
  console.log('\n🧪 Three-Runs Journey Messaging Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const tmpArtifacts = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-journey-'));
  const siteSlug = 'demo-site';

  const RUN1 = 'Run 1/3: establishing a baseline for this site.';
  const RUN2 = 'Run 2/3: checking for repeat signals.';

  // Case 1: Run 1 (no prior runs) → show Run 1/3
  let s1 = baseSnapshot();
  let cli1 = generateCliSummary(s1, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  let html1 = generateEnhancedHtml(s1, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(cli1.includes(RUN1), 'CLI should show Run 1/3 message');
  assert.ok(html1.includes(RUN1), 'HTML should show Run 1/3 message');
  console.log('✅ Case 1 passed: Run 1 message shown');

  // Case 2: Run 2 (exactly 1 prior run) → show Run 2/3
  makeRunDir(tmpArtifacts, `2025-12-26_00-00-00_${siteSlug}_default_PASSED`);
  let s2 = baseSnapshot();
  let cli2 = generateCliSummary(s2, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  let html2 = generateEnhancedHtml(s2, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(cli2.includes(RUN2), 'CLI should show Run 2/3 message');
  assert.ok(html2.includes(RUN2), 'HTML should show Run 2/3 message');
  console.log('✅ Case 2 passed: Run 2 message shown');

  // Case 3: Run 3+ (2 or more prior runs) → suppress journey message
  makeRunDir(tmpArtifacts, `2025-12-27_00-00-00_${siteSlug}_default_PASSED`);
  let s3 = baseSnapshot();
  let cli3 = generateCliSummary(s3, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  let html3 = generateEnhancedHtml(s3, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(!cli3.includes(RUN1) && !cli3.includes(RUN2), 'CLI should suppress journey message for Run 3+');
  assert.ok(!html3.includes(RUN1) && !html3.includes(RUN2), 'HTML should suppress journey message for Run 3+');
  console.log('✅ Case 3 passed: Run 3+ suppression works');

  // Case 4: Suppression when patterns are present (Stage V)
  // Simulate patterns by ensuring 2+ prior runs; journey should be suppressed regardless
  makeRunDir(tmpArtifacts, `2025-12-27_01-00-00_${siteSlug}_default_PASSED`);
  let s4 = baseSnapshot();
  let cli4 = generateCliSummary(s4, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  let html4 = generateEnhancedHtml(s4, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(!cli4.includes(RUN1) && !cli4.includes(RUN2), 'CLI should suppress when patterns are present');
  assert.ok(!html4.includes(RUN1) && !html4.includes(RUN2), 'HTML should suppress when patterns are present');
  console.log('✅ Case 4 passed: suppression with patterns present');

  console.log('\nAll three-runs journey messaging tests passed.');
})();
