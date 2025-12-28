const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { startFixtureServer } = require('./fixture-server');
const { executeReality } = require('../src/guardian/reality');
const { loadSnapshot } = require('../src/guardian/snapshot');
const { generateCliSummary } = require('../src/guardian/cli-summary');
const { generateEnhancedHtml } = require('../src/guardian/enhanced-html-reporter');

async function runTests() {
  console.log('\n🧪 Verdict Object + Explainability Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const fixture = await startFixtureServer();
  const baseUrl = `${fixture.baseUrl}?mode=ok`;
  const tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-verdict-'));
  const tempArtifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-artifacts-'));

  let passed = 0, failed = 0;

  // Run 1
  let result1;
  try {
    result1 = await executeReality({
      baseUrl,
      artifactsDir: path.join(tempArtifactsDir, 'run1'),
      storageDir: tempStorageDir,
      enableCrawl: false,
      headful: false,
      enableTrace: false,
      enableScreenshots: false
    });
    const snap1 = loadSnapshot(result1.snapshotPath);

    assert.ok(snap1.verdict, 'snapshot.verdict should exist');
    assert.ok(['READY','DO_NOT_LAUNCH','FRICTION'].includes(snap1.verdict.verdict), 'verdict.verdict should be valid');
    assert.ok(snap1.verdict.confidence && typeof snap1.verdict.confidence.score === 'number', 'confidence.score should be number');
    assert.ok(snap1.verdict.confidence.score >= 0 && snap1.verdict.confidence.score <= 1, 'confidence.score in [0,1]');

    // CLI summary includes Verdict Card
    const cli = generateCliSummary(snap1, null, null);
    assert.ok(cli.includes('VERDICT CARD'), 'CLI should include Verdict Card');
    assert.ok(cli.includes('Status:') || cli.includes('Verdict:'), 'CLI verdict label present');

    // HTML contains Verdict & Confidence panel
    const html = generateEnhancedHtml(snap1, path.join(tempArtifactsDir, 'run1'));
    assert.ok(html.includes('Verdict & Confidence'), 'HTML verdict panel present');

    passed++;
    console.log('✅ Test 1 passed: Verdict shape and outputs');
  } catch (e) {
    failed++; console.error('❌ Test 1 failed:', e.message);
  }

  // Run 2 (determinism check)
  try {
    const result2 = await executeReality({
      baseUrl,
      artifactsDir: path.join(tempArtifactsDir, 'run2'),
      storageDir: tempStorageDir,
      enableCrawl: false,
      headful: false,
      enableTrace: false,
      enableScreenshots: false
    });
    const snap2 = loadSnapshot(result2.snapshotPath);

    assert.strictEqual(snap2.verdict.verdict, 'READY', 'Expected READY for ok mode');
    // Deterministic score under identical conditions
    const score1 = loadSnapshot(result1.snapshotPath).verdict.confidence.score;
    const score2 = snap2.verdict.confidence.score;
    assert.strictEqual(score1, score2, 'Confidence score should be deterministic');

    // Check explanation is concrete
    const why = snap2.verdict.why || '';
    assert.ok(why.includes('4') && (why.includes('executed') || why.includes('attempt')), 'Explanation should reference execution count');
    assert.ok(why.includes('differs from FRICTION') || why.includes('all attempts'), 'Explanation should contrast with FRICTION verdict');
    assert.ok(why.includes('differs from DO_NOT_LAUNCH') || why.includes('critical'), 'Explanation should contrast with DO_NOT_LAUNCH verdict');

    // Check key findings are concrete
    const findings = snap2.verdict.keyFindings || [];
    const foundAttempts = findings.find(f => f.includes('executed attempts'));
    assert.ok(foundAttempts, 'Key findings should mention executed attempts');

    // Check limits are situational
    const limits = snap2.verdict.limits || [];
    assert.ok(limits.length > 0, 'Limits should be populated');
    assert.ok(!limits.some(l => l.includes('generic') || l.includes('boilerplate')), 'Limits should be specific, not generic');

    passed++;
    console.log('✅ Test 2 passed: Deterministic verdict scoring with concrete explanations');
  } catch (e) {
    failed++; console.error('❌ Test 2 failed:', e.message);
  }

  try { await fixture.server.close(); } catch {}

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Tests passed: ${passed}`);
  console.log(`❌ Tests failed: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  if (failed > 0) process.exit(1);
}

runTests().catch(err => { console.error('❌ Suite error:', err); process.exit(1); });
