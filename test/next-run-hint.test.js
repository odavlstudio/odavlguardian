const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const { buildVerdict } = require('../src/guardian/verdict');
const { generateCliSummary } = require('../src/guardian/cli-summary');
const { generateEnhancedHtml } = require('../src/guardian/enhanced-html-reporter');

const HINT_EVIDENCE = 'Capture additional evidence (e.g., traces) to strengthen timing and flow visibility.';
const HINT_COVERAGE = 'Expand coverage to include additional discovered interactions.';
const HINT_TIMEOUTS = 'Use a conservative timeout profile to reduce flakiness.';

function baseSnapshot() {
  return {
    meta: { url: 'http://demo.com', runId: 'run-hint', createdAt: new Date().toISOString() },
    attempts: [],
    discovery: { pagesVisitedCount: 0, interactionsDiscovered: 0, interactionsExecuted: 0 },
    evidence: {},
    marketImpactSummary: { countsBySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0 }, topRisks: [] }
  };
}

(function run() {
  console.log('\n🧪 Next-Run Hint Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const tmpArtifacts = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-next-hint-'));
  const siteSlug = 'demo-site';

  // Case 1: Evidence incomplete → hint A
  let s1 = baseSnapshot();
  s1.evidence = { marketReportJson: 'm.json', marketReportHtml: 'm.html', attemptArtifacts: { login: { screenshotDir: 'screens' } } };
  s1.attempts = [ { attemptId: 'login', attemptName: 'Login', outcome: 'SUCCESS' } ];
  s1.verdict = buildVerdict(s1);
  let cli1 = generateCliSummary(s1, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  let html1 = generateEnhancedHtml(s1, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(cli1.includes('Next Run Hint:'), 'CLI should show Next Run Hint');
  assert.ok(html1.includes('Next Run Hint:'), 'HTML should show Next Run Hint');
  assert.ok(cli1.includes(HINT_EVIDENCE), 'CLI should show evidence hint');
  assert.ok(html1.includes(HINT_EVIDENCE), 'HTML should show evidence hint');
  console.log('✅ Case 1 passed: evidence hint shown');

  // Case 2: Evidence + Coverage incomplete → priority A over B
  let s2 = baseSnapshot();
  s2.evidence = { attemptArtifacts: {} }; // missing trace/screenshots → evidence hint should win
  s2.discovery = { interactionsDiscovered: 5, interactionsExecuted: 2 };
  s2.attempts = [ { attemptId: 'a', outcome: 'SUCCESS' } ];
  s2.verdict = buildVerdict(s2);
  let cli2 = generateCliSummary(s2, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(cli2.includes(HINT_EVIDENCE), 'Evidence hint should take priority over coverage');
  console.log('✅ Case 2 passed: priority A > B enforced');

  // Case 3: Coverage incomplete, evidence complete → hint B
  let s3 = baseSnapshot();
  s3.evidence = { marketReportJson: 'm.json', marketReportHtml: 'm.html', traceZip: 'trace.zip', attemptArtifacts: { a: { screenshotDir: 'dir' } } };
  s3.discovery = { interactionsDiscovered: 3, interactionsExecuted: 1 };
  s3.attempts = [ { attemptId: 'a', outcome: 'SUCCESS' } ];
  s3.verdict = buildVerdict(s3);
  let cli3 = generateCliSummary(s3, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  let html3 = generateEnhancedHtml(s3, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(cli3.includes(HINT_COVERAGE), 'CLI should show coverage hint');
  assert.ok(html3.includes(HINT_COVERAGE), 'HTML should show coverage hint');
  console.log('✅ Case 3 passed: coverage hint shown');

  // Case 4: Recurring timeouts/flakiness → hint C
  let s4 = baseSnapshot();
  s4.evidence = { marketReportJson: 'm.json', marketReportHtml: 'm.html', traceZip: 'trace.zip', attemptArtifacts: { a: { screenshotDir: 'dir' } } };
  s4.discovery = { interactionsDiscovered: 2, interactionsExecuted: 2 };
  s4.attempts = [
    { attemptId: 'a', outcome: 'FAILURE', error: 'Timeout waiting for selector' },
    { attemptId: 'b', outcome: 'FAILURE', error: 'Operation timed out' }
  ];
  s4.verdict = buildVerdict(s4);
  let cli4 = generateCliSummary(s4, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  let html4 = generateEnhancedHtml(s4, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(cli4.includes(HINT_TIMEOUTS), 'CLI should show timeout/flakiness hint');
  assert.ok(html4.includes(HINT_TIMEOUTS), 'HTML should show timeout/flakiness hint');
  console.log('✅ Case 4 passed: timeout/flakiness hint shown');

  // Case 5: No hint when none apply
  let s5 = baseSnapshot();
  s5.evidence = { marketReportJson: 'm.json', marketReportHtml: 'm.html', traceZip: 'trace.zip', attemptArtifacts: { a: { screenshotDir: 'dir' } } };
  s5.discovery = { interactionsDiscovered: 2, interactionsExecuted: 2 };
  s5.attempts = [ { attemptId: 'a', outcome: 'SUCCESS' }, { attemptId: 'b', outcome: 'SUCCESS' } ];
  s5.verdict = buildVerdict(s5);
  let cli5 = generateCliSummary(s5, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  let html5 = generateEnhancedHtml(s5, tmpArtifacts, { artifactsDir: tmpArtifacts, siteSlug });
  assert.ok(!cli5.includes('Next Run Hint:'), 'CLI should not show hint when none apply');
  assert.ok(!html5.includes('Next Run Hint:'), 'HTML should not show hint when none apply');
  console.log('✅ Case 5 passed: no hint when none apply');

  console.log('\nAll next-run hint tests passed.');
})();
