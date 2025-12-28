/**
 * Pattern Analyzer Test Suite
 * Tests cross-run pattern detection
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {
  analyzePatterns,
  loadRecentRunsForSite,
  detectRepeatedSkippedAttempts,
  detectRecurringFriction,
  detectConfidenceDegradation,
  detectSinglePointFailure
} = require('../src/guardian/pattern-analyzer');

/**
 * Create mock snapshot for testing
 */
function createMockSnapshot(opts = {}) {
  return {
    meta: {
      timestamp: opts.timestamp || new Date().toISOString(),
      url: opts.url || 'http://example.com',
      siteSlug: opts.siteSlug || 'example-com',
      runId: opts.runId || 'test-run'
    },
    verdict: opts.verdict || {
      verdict: opts.verdict_type || 'READY',
      confidence: {
        level: 'high',
        score: opts.confidence_score || 0.9
      }
    },
    attempts: opts.attempts || []
  };
}

/**
 * Create mock run with artifacts
 */
function createMockRunDir(artifactsDir, runDirName, snapshot) {
  const runDir = path.join(artifactsDir, runDirName);
  if (!fs.existsSync(runDir)) {
    fs.mkdirSync(runDir, { recursive: true });
  }
  
  const metaPath = path.join(runDir, 'META.json');
  fs.writeFileSync(metaPath, JSON.stringify(snapshot.meta), 'utf8');
  
  const snapshotPath = path.join(runDir, 'snapshot.json');
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot), 'utf8');
  
  return runDir;
}

/**
 * Test: No patterns when fewer than 2 runs
 */
function testNoPatternsBelowThreshold() {
  const tmpDir = './test-artifacts/pattern-test-1';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  
  try {
    // Create only 1 run
    const snapshot1 = createMockSnapshot({
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      runId: 'run-1',
      siteSlug: 'example-com',
      attempts: [
        { attemptId: 'attempt-a', outcome: 'SUCCESS' },
        { attemptId: 'attempt-b', outcome: 'SUCCESS' }
      ]
    });
    createMockRunDir(tmpDir, '2025-12-27_10-00-00_example-com_default_PASSED', snapshot1);
    
    const patterns = analyzePatterns(tmpDir, 'example-com');
    assert.strictEqual(patterns.length, 0, 'Should return no patterns with < 2 runs');
    console.log('✅ Test 1 passed: No patterns below 2-run threshold');
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  }
}

/**
 * Test: Detect repeated skipped attempts
 */
function testDetectRepeatedSkipped() {
  const tmpDir = './test-artifacts/pattern-test-2';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  
  try {
    // Create 3 runs where 'slow-form' is always skipped
    for (let i = 0; i < 3; i++) {
      const timestamp = new Date(Date.now() - (3-i) * 3600000).toISOString();
      const snapshot = createMockSnapshot({
        timestamp,
        runId: `run-${i}`,
        siteSlug: 'example-com',
        attempts: [
          { attemptId: 'login', outcome: 'SUCCESS' },
          { attemptId: 'slow-form', outcome: 'SKIPPED' },  // Always skipped
          { attemptId: 'checkout', outcome: 'SUCCESS' }
        ]
      });
      createMockRunDir(tmpDir, `2025-12-27_${10+i}-00-00_example-com_default_PASSED`, snapshot);
    }
    
    const patterns = analyzePatterns(tmpDir, 'example-com');
    const skippedPattern = patterns.find(p => p.type === 'repeated_skipped_attempts');
    
    assert.ok(skippedPattern, 'Should detect repeated skipped attempts');
    assert.ok(skippedPattern.summary.includes('slow-form'), 'Pattern should mention attempt ID');
    assert.ok(skippedPattern.summary.includes('3'), 'Pattern should show 3 occurrences');
    assert.strictEqual(skippedPattern.confidence, 'high', 'Confidence should be high for 3+ runs');
    console.log('✅ Test 2 passed: Detected repeated skipped attempts');
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  }
}

/**
 * Test: Detect recurring friction
 */
function testDetectRecurringFriction() {
  const tmpDir = './test-artifacts/pattern-test-3';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  
  try {
    // Create 3 runs where 'payment' shows friction each time
    for (let i = 0; i < 3; i++) {
      const timestamp = new Date(Date.now() - (3-i) * 3600000).toISOString();
      const snapshot = createMockSnapshot({
        timestamp,
        runId: `run-${i}`,
        siteSlug: 'example-com',
        attempts: [
          { attemptId: 'cart', outcome: 'SUCCESS', totalDurationMs: 500 },
          { 
            attemptId: 'payment', 
            outcome: 'FRICTION',
            totalDurationMs: 3500 + i*200,  // Varying but consistently high
            friction: { isFriction: true }
          },
          { attemptId: 'confirm', outcome: 'SUCCESS', totalDurationMs: 400 }
        ]
      });
      createMockRunDir(tmpDir, `2025-12-27_${10+i}-00-00_example-com_default_WARN`, snapshot);
    }
    
    const patterns = analyzePatterns(tmpDir, 'example-com');
    const frictionPattern = patterns.find(p => p.type === 'recurring_friction');
    
    assert.ok(frictionPattern, 'Should detect recurring friction');
    assert.ok(frictionPattern.summary.includes('payment'), 'Pattern should mention attempt');
    assert.ok(frictionPattern.summary.includes('3'), 'Pattern should show 3 occurrences');
    assert.ok(frictionPattern.evidence.avgDurationMs > 3000, 'Should show average duration');
    console.log('✅ Test 3 passed: Detected recurring friction');
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  }
}

/**
 * Test: Detect single point of failure
 */
function testDetectSinglePointFailure() {
  const tmpDir = './test-artifacts/pattern-test-4';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  
  try {
    // Create 4 runs where 'problematic-api' fails in 3+ of them
    for (let i = 0; i < 4; i++) {
      const timestamp = new Date(Date.now() - (4-i) * 3600000).toISOString();
      const shouldFail = i !== 0; // Fail in 3 out of 4 runs
      const snapshot = createMockSnapshot({
        timestamp,
        runId: `run-${i}`,
        siteSlug: 'example-com',
        attempts: [
          { attemptId: 'homepage', outcome: 'SUCCESS' },
          { attemptId: 'browse', outcome: 'SUCCESS' },
          { attemptId: 'problematic-api', outcome: shouldFail ? 'FAILURE' : 'SUCCESS' }
        ]
      });
      createMockRunDir(tmpDir, `2025-12-27_${10+i}-00-00_example-com_default_WARN`, snapshot);
    }
    
    const patterns = analyzePatterns(tmpDir, 'example-com');
    const failurePattern = patterns.find(p => p.type === 'single_point_failure');
    
    assert.ok(failurePattern, 'Should detect single point of failure');
    assert.ok(failurePattern.summary.includes('problematic-api'), 'Pattern should mention attempt');
    assert.ok(failurePattern.whyItMatters.toLowerCase().includes('bottleneck'), 'Should explain impact');
    console.log('✅ Test 4 passed: Detected single point of failure');
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  }
}

/**
 * Test: Detect confidence degradation
 */
function testDetectConfidenceDegradation() {
  const tmpDir = './test-artifacts/pattern-test-5';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  
  try {
    // Create 4 runs with declining confidence scores
    const scores = [0.95, 0.85, 0.70, 0.55];
    for (let i = 0; i < 4; i++) {
      const timestamp = new Date(Date.now() - (4-i) * 3600000).toISOString();
      const snapshot = createMockSnapshot({
        timestamp,
        runId: `run-${i}`,
        siteSlug: 'example-com',
        confidence_score: scores[i],
        attempts: [
          { attemptId: 'attempt-a', outcome: 'SUCCESS' }
        ]
      });
      createMockRunDir(tmpDir, `2025-12-27_${10+i}-00-00_example-com_default_WARN`, snapshot);
    }
    
    const patterns = analyzePatterns(tmpDir, 'example-com');
    const degradationPattern = patterns.find(p => p.type === 'confidence_degradation');
    
    assert.ok(degradationPattern, 'Should detect confidence degradation');
    assert.ok(degradationPattern.summary.includes('95%'), 'Should mention initial score');
    assert.ok(degradationPattern.summary.includes('55%'), 'Should mention final score');
    assert.ok(degradationPattern.whyItMatters.toLowerCase().includes('degrading'), 'Should explain impact');
    console.log('✅ Test 5 passed: Detected confidence degradation');
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  }
}

/**
 * Test: No false positives with insufficient data
 */
function testNoFalsePositives() {
  const tmpDir = './test-artifacts/pattern-test-6';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  
  try {
    // Create 2 runs with one-off variations (not patterns)
    const snapshot1 = createMockSnapshot({
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      runId: 'run-1',
      siteSlug: 'example-com',
      attempts: [
        { attemptId: 'a', outcome: 'SUCCESS' },
        { attemptId: 'b', outcome: 'SKIPPED' },  // Skipped once
        { attemptId: 'c', outcome: 'SUCCESS' }
      ]
    });
    
    const snapshot2 = createMockSnapshot({
      timestamp: new Date(Date.now() - 0).toISOString(),
      runId: 'run-2',
      siteSlug: 'example-com',
      attempts: [
        { attemptId: 'a', outcome: 'SUCCESS' },
        { attemptId: 'b', outcome: 'SUCCESS' },  // Executed this time
        { attemptId: 'c', outcome: 'FAILURE' }
      ]
    });
    
    createMockRunDir(tmpDir, '2025-12-27_10-00-00_example-com_default_PASSED', snapshot1);
    createMockRunDir(tmpDir, '2025-12-27_11-00-00_example-com_default_WARN', snapshot2);
    
    const patterns = analyzePatterns(tmpDir, 'example-com');
    
    // Should not detect repeated skip (only once) or recurring failure (only once)
    const repeatedSkip = patterns.find(p => p.type === 'repeated_skipped_attempts' && p.evidence.attemptId === 'b');
    const recurringFailure = patterns.find(p => p.type === 'single_point_failure' && p.evidence.attemptId === 'c');
    
    assert.ok(!repeatedSkip, 'Should not detect skip pattern from single occurrence');
    assert.ok(!recurringFailure, 'Should not detect failure pattern from single occurrence');
    console.log('✅ Test 6 passed: No false positives with insufficient data');
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  }
}

/**
 * Run all tests
 */
function runTests() {
  console.log('\n' + '━'.repeat(70));
  console.log('🧪 Pattern Analyzer Test Suite');
  console.log('━'.repeat(70) + '\n');
  
  try {
    testNoPatternsBelowThreshold();
    testDetectRepeatedSkipped();
    testDetectRecurringFriction();
    testDetectSinglePointFailure();
    testDetectConfidenceDegradation();
    testNoFalsePositives();
    
    console.log('\n' + '━'.repeat(70));
    console.log('✅ All pattern analyzer tests passed!');
    console.log('━'.repeat(70) + '\n');
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = {
  testNoPatternsBelowThreshold,
  testDetectRepeatedSkipped,
  testDetectRecurringFriction,
  testDetectSinglePointFailure,
  testDetectConfidenceDegradation,
  testNoFalsePositives
};
