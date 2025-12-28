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

function makeSnapshot(runId) {
  return {
    meta: {
      url: 'http://demo.com',
      runId,
      createdAt: new Date().toISOString()
    },
    verdict: {
      verdict: 'FRICTION',
      confidence: { level: 'medium', score: 0.4 },
      why: 'Initial check on demo site.'
    },
    attempts: [],
    marketImpactSummary: { countsBySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0 }, topRisks: [] },
    discovery: { pagesVisitedCount: 0, interactionsDiscovered: 0, interactionsExecuted: 0 }
  };
}

(async () => {
  console.log('\n🧪 First-Run Messaging Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const tmpArtifacts = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-first-run-'));
  const siteSlug = 'demo-site';

  // Case 1: history < 2 (one prior run)
  makeRunDir(tmpArtifacts, `2025-12-25_00-00-00_${siteSlug}_default_PASSED`, {
    timestamp: '2025-12-25T00:00:00.000Z', url: 'http://demo.com', siteSlug, policy: 'default', result: 'PASSED', durationMs: 1000
  });

  const snapshot1 = makeSnapshot('run-test-1');
  const cli1 = generateCliSummary(snapshot1, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  const html1 = generateEnhancedHtml(snapshot1, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });

  const message = 'This verdict reflects this moment; repeat runs strengthen confidence.';

  assert.ok(cli1.includes(message), 'CLI should include first-run message when prior runs < 2');
  assert.ok(html1.includes(message), 'HTML should include first-run message when prior runs < 2');
  console.log('✅ Case 1 passed: Message appears for < 2 prior runs');

  // Case 2: history >= 2 (two prior runs)
  makeRunDir(tmpArtifacts, `2025-12-26_00-00-00_${siteSlug}_default_PASSED`, {
    timestamp: '2025-12-26T00:00:00.000Z', url: 'http://demo.com', siteSlug, policy: 'default', result: 'PASSED', durationMs: 1000
  });

  const snapshot2 = makeSnapshot('run-test-2');
  const cli2 = generateCliSummary(snapshot2, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  const html2 = generateEnhancedHtml(snapshot2, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });

  assert.ok(!cli2.includes(message), 'CLI should NOT include first-run message when prior runs >= 2');
  assert.ok(!html2.includes(message), 'HTML should NOT include first-run message when prior runs >= 2');
  console.log('✅ Case 2 passed: Message suppressed for >= 2 prior runs');

  console.log('\nAll first-run messaging tests passed.');
})();
