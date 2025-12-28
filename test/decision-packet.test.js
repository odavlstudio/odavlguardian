const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const { writeEnhancedHtml } = require('../src/guardian/enhanced-html-reporter');
const { writeDecisionJson } = require('../src/guardian/reality');
const { analyzePatterns, loadRecentRunsForSite } = require('../src/guardian/pattern-analyzer');

function writeRun(artifactsDir, siteSlug, dateStr, snapshot) {
  const dirName = `${dateStr}_${siteSlug}_default_PASSED`;
  const runDir = path.join(artifactsDir, dirName);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'META.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    url: snapshot.meta?.url || 'http://demo.com',
    siteSlug,
    policy: 'default',
    result: 'PASSED',
    durationMs: 1000
  }, null, 2));
  fs.writeFileSync(path.join(runDir, 'snapshot.json'), JSON.stringify(snapshot, null, 2));
  return runDir;
}

function baseSnapshot(verdictScore) {
  return {
    meta: { url: 'http://demo.com', runId: 'run-decision', createdAt: new Date().toISOString() },
    verdict: {
      verdict: 'FRICTION',
      confidence: { level: verdictScore >= 0.66 ? 'high' : 'medium', score: verdictScore },
      why: 'Results show mixed outcomes; timing and confirmations vary.',
      keyFindings: ['Signup not executed', 'Payment failures observed'],
      limits: ['Live site behavior shifts over time; this verdict reflects this moment']
    },
    attempts: [],
    discovery: { pagesVisitedCount: 0, interactionsDiscovered: 0, interactionsExecuted: 0 },
    evidence: {}
  };
}

(function run() {
  console.log('\n🧪 Decision Packet Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const tmpArtifacts = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-decision-'));
  const siteSlug = 'demo-site';

  // Prepare runs to create patterns
  writeRun(tmpArtifacts, siteSlug, '2025-12-24_00-00-00', baseSnapshot(0.8));
  writeRun(tmpArtifacts, siteSlug, '2025-12-25_00-00-00', {
    ...baseSnapshot(0.6),
    attempts: [ { attemptId: 'signup', outcome: 'SKIPPED' }, { attemptId: 'payment', outcome: 'FAILURE' } ]
  });
  writeRun(tmpArtifacts, siteSlug, '2025-12-26_00-00-00', {
    ...baseSnapshot(0.5),
    attempts: [ { attemptId: 'signup', outcome: 'SKIPPED' }, { attemptId: 'payment', outcome: 'FAILURE' } ]
  });

  const currentRunDir = writeRun(tmpArtifacts, siteSlug, '2025-12-27_00-00-00', baseSnapshot(0.5));
  const snapshot = baseSnapshot(0.5);

  // Create enhanced HTML and dummy market JSON to satisfy evidencePaths presence
  const enhancedPath = writeEnhancedHtml(snapshot, currentRunDir, { artifactsDir: tmpArtifacts, siteSlug });
  const marketJsonPath = path.join(currentRunDir, 'market.json');
  fs.writeFileSync(marketJsonPath, JSON.stringify({ ok: true }, null, 2));

  // Write decision.json
  const decisionPath = writeDecisionJson(snapshot, currentRunDir, tmpArtifacts, siteSlug, enhancedPath, marketJsonPath);
  assert.ok(decisionPath && fs.existsSync(decisionPath), 'decision.json should be created');

  const decision = JSON.parse(fs.readFileSync(decisionPath, 'utf-8'));
  const requiredKeys = ['verdict', 'keyFindings', 'patterns', 'limits'];
  // evidencePaths, confidenceDrivers, focusSummary, deltaInsight are optional
  const keys = Object.keys(decision);
  requiredKeys.forEach(k => assert.ok(keys.includes(k), `Missing required key: ${k}`));
  // No extra keys beyond allowed
  const allowed = new Set(['verdict','keyFindings','patterns','limits','evidencePaths','confidenceDrivers','focusSummary','deltaInsight']);
  keys.forEach(k => assert.ok(allowed.has(k), `Unexpected key: ${k}`));

  // Verify structure
  assert.ok(decision.verdict && typeof decision.verdict.status !== 'undefined', 'verdict.status present');
  assert.ok(Array.isArray(decision.keyFindings), 'keyFindings is array');
  assert.ok(Array.isArray(decision.patterns), 'patterns is array');
  assert.ok(Array.isArray(decision.limits), 'limits is array');
  if (decision.evidencePaths) {
    const ep = decision.evidencePaths;
    assert.ok(ep.reportHtml || ep.marketReport || ep.screenshots || ep.traces, 'evidencePaths has at least one key');
  }

  console.log('✅ decision.json created with required keys (patterns case)');

  // Case: No patterns → only one prior run
  const tmpNoPatterns = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-decision-none-'));
  const runDirNo = writeRun(tmpNoPatterns, siteSlug, '2025-12-27_01-00-00', baseSnapshot(0.9));
  const enhancedNo = writeEnhancedHtml(baseSnapshot(0.9), runDirNo, { artifactsDir: tmpNoPatterns, siteSlug });
  const decisionNoPath = writeDecisionJson(baseSnapshot(0.9), runDirNo, tmpNoPatterns, siteSlug, enhancedNo, null);
  const decisionNo = JSON.parse(fs.readFileSync(decisionNoPath, 'utf-8'));
  assert.ok(Array.isArray(decisionNo.patterns) && decisionNo.patterns.length === 0, 'patterns should be empty when none exist');
  console.log('✅ decision.json created with empty patterns when none exist');

  console.log('\nAll decision packet tests passed.');
})();
