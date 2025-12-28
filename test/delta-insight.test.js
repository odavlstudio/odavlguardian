#!/usr/bin/env node
/**
 * Stage V / Step 5.1: Delta Insight Test
 * 
 * Validates delta insight generation comparing current run (N) vs previous run (N-1).
 */

const assert = require('assert');
const { formatDeltaInsight } = require('../src/guardian/text-formatters');
const { generateCliSummary } = require('../src/guardian/cli-summary');

console.log('🧪 Delta Insight Test\n');

// Test 1: Verdict improves (FRICTION → READY)
(() => {
  const currentVerdict = {
    verdict: 'READY',
    confidence: { level: 'high', score: 0.95 }
  };
  const previousVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'medium', score: 0.65 }
  };
  
  const delta = formatDeltaInsight(currentVerdict, previousVerdict, [], []);
  
  assert.strictEqual(delta.improved.length, 1, 'Should show 1 improvement');
  assert.strictEqual(delta.regressed.length, 0, 'Should show 0 regressions');
  assert(delta.improved[0].includes('improved'), 'Should mention improvement');
  
  console.log('✅ Case 1 passed: Verdict improves (FRICTION → READY)');
  console.log(`   Improved: "${delta.improved[0]}"`);
})();

// Test 2: Verdict regresses (READY → FRICTION)
(() => {
  const currentVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'medium', score: 0.65 }
  };
  const previousVerdict = {
    verdict: 'READY',
    confidence: { level: 'high', score: 0.95 }
  };
  
  const delta = formatDeltaInsight(currentVerdict, previousVerdict, [], []);
  
  assert.strictEqual(delta.improved.length, 0, 'Should show 0 improvements');
  assert.strictEqual(delta.regressed.length, 1, 'Should show 1 regression');
  assert(delta.regressed[0].includes('declined'), 'Should mention decline');
  
  console.log('✅ Case 2 passed: Verdict regresses (READY → FRICTION)');
  console.log(`   Regressed: "${delta.regressed[0]}"`);
})();

// Test 3: Verdict regresses further (FRICTION → DO_NOT_LAUNCH)
(() => {
  const currentVerdict = {
    verdict: 'DO_NOT_LAUNCH',
    confidence: { level: 'high', score: 0.90 }
  };
  const previousVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'medium', score: 0.65 }
  };
  
  const delta = formatDeltaInsight(currentVerdict, previousVerdict, [], []);
  
  assert.strictEqual(delta.improved.length, 0, 'Should show 0 improvements');
  assert.strictEqual(delta.regressed.length, 1, 'Should show 1 regression');
  assert(delta.regressed[0].includes('declined'), 'Should mention decline');
  
  console.log('✅ Case 3 passed: Verdict regresses further (FRICTION → DO_NOT_LAUNCH)');
  console.log(`   Regressed: "${delta.regressed[0]}"`);
})();

// Test 4: Confidence improves (verdict unchanged)
(() => {
  const currentVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'high', score: 0.85 }
  };
  const previousVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'medium', score: 0.65 }
  };
  
  const delta = formatDeltaInsight(currentVerdict, previousVerdict, [], []);
  
  assert.strictEqual(delta.improved.length, 1, 'Should show 1 improvement');
  assert.strictEqual(delta.regressed.length, 0, 'Should show 0 regressions');
  assert(delta.improved[0].includes('Confidence'), 'Should mention confidence');
  assert(delta.improved[0].includes('strengthened'), 'Should mention strengthening');
  
  console.log('✅ Case 4 passed: Confidence improves (verdict unchanged)');
  console.log(`   Improved: "${delta.improved[0]}"`);
})();

// Test 5: Confidence regresses (verdict unchanged)
(() => {
  const currentVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'low', score: 0.45 }
  };
  const previousVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'high', score: 0.85 }
  };
  
  const delta = formatDeltaInsight(currentVerdict, previousVerdict, [], []);
  
  assert.strictEqual(delta.improved.length, 0, 'Should show 0 improvements');
  assert.strictEqual(delta.regressed.length, 1, 'Should show 1 regression');
  assert(delta.regressed[0].includes('Confidence'), 'Should mention confidence');
  assert(delta.regressed[0].includes('weakened'), 'Should mention weakening');
  
  console.log('✅ Case 5 passed: Confidence regresses (verdict unchanged)');
  console.log(`   Regressed: "${delta.regressed[0]}"`);
})();

// Test 6: Critical pattern resolved
(() => {
  const currentVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'medium', score: 0.65 }
  };
  const previousVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'medium', score: 0.65 }
  };
  
  const currentPatterns = [];
  const previousPatterns = [
    { type: 'single_point_failure', pathName: 'Login', confidence: 0.9 }
  ];
  
  const delta = formatDeltaInsight(currentVerdict, previousVerdict, currentPatterns, previousPatterns);
  
  assert.strictEqual(delta.improved.length, 1, 'Should show 1 improvement');
  assert.strictEqual(delta.regressed.length, 0, 'Should show 0 regressions');
  assert(delta.improved[0].includes('friction'), 'Should mention friction');
  assert(delta.improved[0].includes('not detected'), 'Should mention not detected');
  
  console.log('✅ Case 6 passed: Critical pattern resolved');
  console.log(`   Improved: "${delta.improved[0]}"`);
})();

// Test 7: New critical pattern appears
(() => {
  const currentVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'medium', score: 0.65 }
  };
  const previousVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'medium', score: 0.65 }
  };
  
  const currentPatterns = [
    { type: 'single_point_failure', pathName: 'Checkout', confidence: 0.9 }
  ];
  const previousPatterns = [];
  
  const delta = formatDeltaInsight(currentVerdict, previousVerdict, currentPatterns, previousPatterns);
  
  assert.strictEqual(delta.improved.length, 0, 'Should show 0 improvements');
  assert.strictEqual(delta.regressed.length, 1, 'Should show 1 regression');
  assert(delta.regressed[0].includes('blocking issues') || delta.regressed[0].includes('New blocking'), 
    'Should mention blocking issues');
  
  console.log('✅ Case 7 passed: New critical pattern appears');
  console.log(`   Regressed: "${delta.regressed[0]}"`);
})();

// Test 8: No meaningful change → suppressed
(() => {
  const currentVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'medium', score: 0.65 }
  };
  const previousVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'medium', score: 0.66 } // minor score change
  };
  
  const delta = formatDeltaInsight(currentVerdict, previousVerdict, [], []);
  
  assert.strictEqual(delta.improved.length, 0, 'Should show 0 improvements');
  assert.strictEqual(delta.regressed.length, 0, 'Should show 0 regressions');
  
  console.log('✅ Case 8 passed: No meaningful change → Delta Insight suppressed');
})();

// Test 9: No previous run → suppressed
(() => {
  const currentVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'medium', score: 0.65 }
  };
  const previousVerdict = null;
  
  const delta = formatDeltaInsight(currentVerdict, previousVerdict, [], []);
  
  assert.strictEqual(delta.improved.length, 0, 'Should show 0 improvements');
  assert.strictEqual(delta.regressed.length, 0, 'Should show 0 regressions');
  
  console.log('✅ Case 9 passed: No previous run → Delta Insight suppressed');
})();

// Test 10: Max 2 lines enforced (1 improved + 1 regressed)
(() => {
  // This is a logic test - the function should never return more than 1 improved + 1 regressed
  const currentVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'high', score: 0.85 }
  };
  const previousVerdict = {
    verdict: 'READY',
    confidence: { level: 'low', score: 0.45 }
  };
  
  const delta = formatDeltaInsight(currentVerdict, previousVerdict, [], []);
  
  // Verdict change takes priority, so we should only see regression
  assert(delta.improved.length + delta.regressed.length <= 2, 'Should never exceed 2 total lines');
  assert.strictEqual(delta.regressed.length, 1, 'Verdict regression should be shown');
  
  console.log('✅ Case 10 passed: Max 2 lines enforced');
})();

// Test 11: Text consistency across outputs (CLI format check)
(() => {
  const snapshot = {
    meta: {
      url: 'https://example.com',
      runId: 'test-run-001',
      timestamp: new Date().toISOString()
    },
    verdict: {
      verdict: 'READY',
      confidence: { level: 'high', score: 0.95 },
      why: 'All checks passed',
      keyFindings: []
    },
    attempts: [],
    intelligence: { failures: [] }
  };
  
  const cliOutput = generateCliSummary(snapshot, null, null, {});
  
  // Verify CLI output structure is intact
  assert(cliOutput.includes('Guardian Reality Summary'), 'CLI should have summary header');
  assert(cliOutput.includes('VERDICT CARD'), 'CLI should have verdict card');
  
  console.log('✅ Case 11 passed: CLI output structure validated');
})();

// Test 12: Verdict priority override
(() => {
  // When verdict changes, it overrides confidence and pattern changes
  const currentVerdict = {
    verdict: 'READY',
    confidence: { level: 'low', score: 0.45 } // low confidence
  };
  const previousVerdict = {
    verdict: 'FRICTION',
    confidence: { level: 'high', score: 0.85 } // high confidence
  };
  
  const currentPatterns = [
    { type: 'single_point_failure', pathName: 'Login', confidence: 0.9 }
  ];
  const previousPatterns = [];
  
  const delta = formatDeltaInsight(currentVerdict, previousVerdict, currentPatterns, previousPatterns);
  
  // Verdict improvement should be shown, not confidence regression or pattern appearance
  assert.strictEqual(delta.improved.length, 1, 'Should show verdict improvement');
  assert(delta.improved[0].includes('readiness improved'), 'Should show readiness improvement');
  
  console.log('✅ Case 12 passed: Verdict priority override validated');
})();

console.log('\n' + '='.repeat(60));
console.log('All Delta Insight tests passed.');
console.log('='.repeat(60));
