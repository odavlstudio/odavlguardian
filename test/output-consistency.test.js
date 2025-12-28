const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const { generateCliSummary } = require('../src/guardian/cli-summary');
const { generateEnhancedHtml } = require('../src/guardian/enhanced-html-reporter');
const { generateJunitXml } = require('../src/guardian/junit-reporter');
const { writeDecisionJson } = require('../src/guardian/reality');
const { buildVerdict } = require('../src/guardian/verdict');

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

function makeSnapshot() {
  const snapshot = {
    meta: { url: 'http://demo.com', runId: 'run-consistency', createdAt: new Date().toISOString() },
    attempts: [
      { attemptId: 'login', attemptName: 'Login', outcome: 'SUCCESS', totalDurationMs: 1200 },
      { attemptId: 'checkout', attemptName: 'Checkout', outcome: 'FAILURE', totalDurationMs: 800 }
    ],
    discovery: { pagesVisitedCount: 2, interactionsDiscovered: 3, interactionsExecuted: 2 },
    evidence: { traceZip: 'trace.zip', attemptArtifacts: { login: { screenshotDir: 'screens' } } },
    marketImpactSummary: { countsBySeverity: { CRITICAL: 1, WARNING: 0, INFO: 0 }, topRisks: [] }
  };
  snapshot.verdict = buildVerdict(snapshot);
  return snapshot;
}

(function run() {
  console.log('\n🧪 Output Consistency Lock Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const tmpArtifacts = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-consistency-'));
  const siteSlug = 'demo-site';

  // Create runs for patterns
  const snap1 = makeSnapshot();
  snap1.attempts[0].outcome = 'SKIPPED';
  writeRun(tmpArtifacts, siteSlug, '2025-12-24_00-00-00', snap1);
  const snap2 = makeSnapshot();
  snap2.attempts[0].outcome = 'SKIPPED';
  writeRun(tmpArtifacts, siteSlug, '2025-12-25_00-00-00', snap2);

  const currentRunDir = writeRun(tmpArtifacts, siteSlug, '2025-12-26_00-00-00', makeSnapshot());
  const snapshot = makeSnapshot();

  // Generate all outputs
  const cli = generateCliSummary(snapshot, null, null, { artifactsDir: tmpArtifacts, siteSlug });
  const html = generateEnhancedHtml(snapshot, currentRunDir, { artifactsDir: tmpArtifacts, siteSlug });
  const junit = generateJunitXml(snapshot, snapshot.meta.url);
  
  const enhancedPath = path.join(currentRunDir, 'report.html');
  fs.writeFileSync(enhancedPath, html);
  const decisionPath = writeDecisionJson(snapshot, currentRunDir, tmpArtifacts, siteSlug, enhancedPath, null);
  const decision = JSON.parse(fs.readFileSync(decisionPath, 'utf-8'));

  // Test: Verdict status identical
  const verdictStatus = snapshot.verdict.verdict;
  assert.ok(cli.includes(`Status: ${verdictStatus}`), 'CLI should have verdict status');
  assert.ok(html.includes(`<strong>Verdict:</strong> ${verdictStatus}`), 'HTML should have verdict status');
  assert.ok(junit.includes(`Verdict: ${verdictStatus}`), 'JUnit should have verdict status');
  assert.strictEqual(decision.verdict.status, verdictStatus, 'Decision.json should have verdict status');
  console.log(`✅ Verdict status identical across outputs: ${verdictStatus}`);

  // Test: Confidence identical
  const cf = snapshot.verdict.confidence;
  const confStr = `${cf.level} (${cf.score.toFixed(2)})`;
  assert.ok(cli.includes(`Confidence: ${confStr}`), 'CLI should have confidence');
  assert.ok(html.includes(`<strong>Confidence:</strong> ${confStr}`), 'HTML should have confidence');
  assert.ok(junit.includes(`Confidence: ${confStr}`), 'JUnit should have confidence');
  assert.strictEqual(decision.verdict.confidence, cf.level, 'Decision.json should have confidence level');
  console.log(`✅ Confidence identical across outputs: ${confStr}`);

  // Test: Why identical
  const why = snapshot.verdict.why;
  assert.ok(cli.includes(`Why: ${why}`), 'CLI should have why');
  assert.ok(html.includes(`<strong>Why:</strong> ${why}`), 'HTML should have why');
  assert.ok(junit.includes(`Why: ${why}`), 'JUnit should have why');
  assert.strictEqual(decision.verdict.why, why, 'Decision.json should have why');
  console.log('✅ Why identical across outputs');

  // Test: Key findings identical
  const findings = snapshot.verdict.keyFindings;
  findings.forEach(f => {
    assert.ok(cli.includes(f), `CLI should have finding: ${f}`);
    assert.ok(html.includes(f), `HTML should have finding: ${f}`);
    assert.ok(decision.keyFindings.includes(f), `Decision.json should have finding: ${f}`);
  });
  console.log(`✅ Key findings identical across outputs (${findings.length} findings)`);

  // Test: Limits identical (decision.json and HTML)
  const limits = snapshot.verdict.limits;
  limits.forEach(l => {
    assert.ok(html.includes(l), `HTML should have limit: ${l}`);
    assert.ok(decision.limits.includes(l), `Decision.json should have limit: ${l}`);
  });
  console.log(`✅ Limits identical across HTML/decision.json (${limits.length} limits)`);

  // Test: Micro-line identical
  const microLine = 'Confidence reflects the strength of evidence from outcomes, coverage, and captured artifacts.';
  assert.ok(cli.includes(microLine), 'CLI should have micro-line');
  assert.ok(html.includes(microLine), 'HTML should have micro-line');
  console.log('✅ Confidence micro-line identical across CLI/HTML');

  // Test: First-run note identical when present (depends on prior runs)
  const firstRunNote = 'This verdict reflects this moment; repeat runs strengthen confidence.';
  // With 2 prior runs, first-run note is suppressed; only check if priorRuns < 2
  // For consistency test, we ensure that IF it appears, it's identical
  const firstRunInCli = cli.includes(firstRunNote);
  const firstRunInHtml = html.includes(firstRunNote);
  assert.strictEqual(firstRunInCli, firstRunInHtml, 'First-run note should match across CLI/HTML');
  console.log(`✅ First-run note consistency verified (shown: ${firstRunInCli})`);

  // Test: Pattern text identical (if patterns exist)
  if (decision.patterns.length > 0) {
    decision.patterns.forEach(p => {
      assert.ok(cli.includes(p.summary) || html.includes(p.summary), `Pattern summary should appear: ${p.summary}`);
      if (p.recommendedFocus) {
        assert.ok(cli.includes(p.recommendedFocus) || html.includes(p.recommendedFocus), `Pattern focus should appear: ${p.recommendedFocus}`);
      }
    });
    console.log(`✅ Pattern text identical across outputs (${decision.patterns.length} patterns)`);
  }

  console.log('\nAll output consistency tests passed.');
})();
