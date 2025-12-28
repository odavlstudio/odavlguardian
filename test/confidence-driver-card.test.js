/**
 * Confidence Driver Card Tests
 * 
 * Layer 4 / Step 4.2: Validate confidence drivers display logic
 * 
 * Tests:
 * 1. Drivers visible when confidence is medium/low
 * 2. Drivers visible on run 1/2 even if confidence is high
 * 3. Drivers suppressed on run >=3 with high confidence
 * 4. Identical text across CLI, HTML, decision.json
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { generateCliSummary } = require('../src/guardian/cli-summary');
const { writeEnhancedHtml } = require('../src/guardian/enhanced-html-reporter');
const { writeDecisionJson } = require('../src/guardian/reality');

const testArtifactsDir = path.join(__dirname, '..', 'test-artifacts', 'confidence-drivers-test');

// Clean test directory
if (fs.existsSync(testArtifactsDir)) {
  fs.rmSync(testArtifactsDir, { recursive: true });
}
fs.mkdirSync(testArtifactsDir, { recursive: true });

// Helper: write prior run snapshots
function writeRun(artifactsDir, siteSlug, runIndex, verdict) {
  const timestamp = `2025-12-27_00-0${runIndex}-00`;
  const runDir = path.join(artifactsDir, `${timestamp}_${siteSlug}_startup_PENDING`);
  fs.mkdirSync(runDir, { recursive: true });
  const snapshot = {
    meta: { url: 'https://example.com', runId: `run-${runIndex}`, siteSlug },
    verdict
  };
  fs.writeFileSync(path.join(runDir, 'snapshot.json'), JSON.stringify(snapshot, null, 2));
  fs.writeFileSync(path.join(runDir, 'META.json'), JSON.stringify({ timestamp: new Date().toISOString() }));
}

console.log('🧪 Confidence Driver Card Test');
console.log('━'.repeat(70) + '\n');

try {
  // Case 1: Medium confidence → drivers should show
  {
    const siteSlug = 'case1-medium';
    const caseDir = path.join(testArtifactsDir, siteSlug);
    fs.mkdirSync(caseDir, { recursive: true });

    // Create 2 prior runs
    writeRun(caseDir, siteSlug, 1, {
      verdict: 'FRICTION',
      confidence: { level: 'medium', score: 0.45 }
    });
    writeRun(caseDir, siteSlug, 2, {
      verdict: 'FRICTION',
      confidence: { level: 'medium', score: 0.50 }
    });

    // Create current run with drivers
    const latestDir = path.join(caseDir, 'latest');
    fs.mkdirSync(latestDir, { recursive: true });
    const snapshot = {
      meta: { url: 'https://example.com', runId: 'run-3', siteSlug },
      verdict: {
        verdict: 'FRICTION',
        confidence: { 
          level: 'medium', 
          score: 0.48,
          reasons: ['Page loaded with errors', 'Some assertions skipped', 'Network issues detected']
        },
        why: 'Partial success with errors',
        keyFindings: []
      }
    };

    // Generate outputs
    const cli = generateCliSummary(snapshot, null, null, { artifactsDir: caseDir, siteSlug });
    writeEnhancedHtml(snapshot, latestDir, { artifactsDir: caseDir, siteSlug });
    writeDecisionJson(snapshot, latestDir, caseDir, siteSlug, null, null);

    const htmlPath = path.join(latestDir, 'report.html');
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`HTML report not found at ${htmlPath}`);
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    const decision = JSON.parse(fs.readFileSync(path.join(latestDir, 'decision.json'), 'utf8'));

    // Verify drivers present
    assert.ok(cli && cli.includes('Confidence Drivers:'), 'CLI should have Confidence Drivers section');
    assert.ok(cli && cli.includes('Page loaded with errors'), 'CLI should show first driver');
    assert.ok(html && html.includes('Confidence Drivers:'), 'HTML should have Confidence Drivers section');
    assert.ok(html && html.includes('Page loaded with errors'), 'HTML should show first driver');
    assert.ok(Array.isArray(decision.confidenceDrivers), 'decision.json should have confidenceDrivers array');
    assert.strictEqual(decision.confidenceDrivers[0], 'Page loaded with errors', 'decision.json should contain first driver');
    console.log('✅ Case 1 passed: Drivers shown for medium confidence');
  }

  // Case 2: High confidence on run 1 → drivers should show
  {
    const siteSlug = 'case2-high-run1';
    const caseDir = path.join(testArtifactsDir, siteSlug);
    fs.mkdirSync(caseDir, { recursive: true });

    // No prior runs (this is run 1)
    const latestDir = path.join(caseDir, 'latest');
    fs.mkdirSync(latestDir, { recursive: true });
    const snapshot = {
      meta: { url: 'https://example.com', runId: 'run-1', siteSlug },
      verdict: {
        verdict: 'PASSED',
        confidence: { 
          level: 'high', 
          score: 0.85,
          reasons: ['All assertions passed', 'No errors detected', 'Page fully loaded']
        },
        why: 'Strong success signals',
        keyFindings: []
      }
    };

    // Generate outputs
    const cli = generateCliSummary(snapshot, null, null, { artifactsDir: caseDir, siteSlug });
    writeEnhancedHtml(snapshot, latestDir, { artifactsDir: caseDir, siteSlug });
    writeDecisionJson(snapshot, latestDir, caseDir, siteSlug, null, null);

    const html = fs.readFileSync(path.join(latestDir, 'report.html'), 'utf8');
    const decision = JSON.parse(fs.readFileSync(path.join(latestDir, 'decision.json'), 'utf8'));

    // Verify drivers present (run 1 even with high confidence)
    assert.ok(cli.includes('Confidence Drivers:'), 'CLI should show drivers on run 1 (high confidence)');
    assert.ok(html.includes('Confidence Drivers:'), 'HTML should show drivers on run 1 (high confidence)');
    assert.ok(decision.confidenceDrivers, 'decision.json should have confidenceDrivers on run 1 (high confidence)');
    console.log('✅ Case 2 passed: Drivers shown on run 1 even with high confidence');
  }

  // Case 3: High confidence on run 3+ → drivers should NOT show
  {
    const siteSlug = 'case3-high-run3';
    const caseDir = path.join(testArtifactsDir, siteSlug);
    fs.mkdirSync(caseDir, { recursive: true });

    // Create 2 prior runs
    writeRun(caseDir, siteSlug, 1, {
      verdict: 'PASSED',
      confidence: { level: 'high', score: 0.90 }
    });
    writeRun(caseDir, siteSlug, 2, {
      verdict: 'PASSED',
      confidence: { level: 'high', score: 0.92 }
    });

    // Create run 3 with high confidence
    const latestDir = path.join(caseDir, 'latest');
    fs.mkdirSync(latestDir, { recursive: true });
    const snapshot = {
      meta: { url: 'https://example.com', runId: 'run-3', siteSlug },
      verdict: {
        verdict: 'PASSED',
        confidence: { 
          level: 'high', 
          score: 0.88,
          reasons: ['Consistent success', 'High repeatability']
        },
        why: 'Reliable outcomes',
        keyFindings: []
      }
    };

    // Generate outputs
    const cli = generateCliSummary(snapshot, null, null, { artifactsDir: caseDir, siteSlug });
    writeEnhancedHtml(snapshot, latestDir, { artifactsDir: caseDir, siteSlug });
    writeDecisionJson(snapshot, latestDir, caseDir, siteSlug, null, null);

    const html = fs.readFileSync(path.join(latestDir, 'report.html'), 'utf8');
    const decision = JSON.parse(fs.readFileSync(path.join(latestDir, 'decision.json'), 'utf8'));

    // Verify drivers NOT present (high confidence on run >=3)
    assert.ok(!cli.includes('Confidence Drivers:'), 'CLI should NOT show drivers on run 3 with high confidence');
    assert.ok(!html.includes('Confidence Drivers:'), 'HTML should NOT show drivers on run 3 with high confidence');
    assert.ok(!decision.confidenceDrivers, 'decision.json should NOT have confidenceDrivers on run 3 with high confidence');
    console.log('✅ Case 3 passed: Drivers suppressed on run 3+ with high confidence');
  }

  // Case 4: Identical text across outputs
  {
    const siteSlug = 'case4-consistency';
    const caseDir = path.join(testArtifactsDir, siteSlug);
    fs.mkdirSync(caseDir, { recursive: true });

    // Create 1 prior run
    writeRun(caseDir, siteSlug, 1, {
      verdict: 'FRICTION',
      confidence: { level: 'low', score: 0.30 }
    });

    // Create current run
    const latestDir = path.join(caseDir, 'latest');
    fs.mkdirSync(latestDir, { recursive: true });
    const snapshot = {
      meta: { url: 'https://example.com', runId: 'run-2', siteSlug },
      verdict: {
        verdict: 'BLOCKED',
        confidence: { 
          level: 'low', 
          score: 0.25,
          reasons: ['Multiple failures', 'Critical errors detected']
        },
        why: 'Significant issues',
        keyFindings: []
      }
    };

    // Generate outputs
    const cli = generateCliSummary(snapshot, null, null, { artifactsDir: caseDir, siteSlug });
    writeEnhancedHtml(snapshot, latestDir, { artifactsDir: caseDir, siteSlug });
    writeDecisionJson(snapshot, latestDir, caseDir, siteSlug, null, null);

    const html = fs.readFileSync(path.join(latestDir, 'report.html'), 'utf8');
    const decision = JSON.parse(fs.readFileSync(path.join(latestDir, 'decision.json'), 'utf8'));

    // Verify identical text
    const expectedDriver = 'Multiple failures';
    assert.ok(cli.includes(expectedDriver), 'CLI should contain driver text');
    assert.ok(html.includes(expectedDriver), 'HTML should contain driver text');
    assert.ok(decision.confidenceDrivers.includes(expectedDriver), 'decision.json should contain driver text');
    console.log('✅ Case 4 passed: Identical driver text across CLI, HTML, decision.json');
  }

  console.log('\nAll confidence driver card tests passed.');
} catch (err) {
  console.error('\n❌ Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}
