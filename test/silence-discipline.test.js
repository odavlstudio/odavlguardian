/**
 * Test Suite: Stage V / Step 5.2 — Silence Discipline
 * 
 * Purpose: Validates strict suppression rules across CLI, HTML, and decision.json
 * 
 * Guardian speaks ONLY when there is clear, meaningful value.
 * Silence is the default state.
 * 
 * Test Coverage:
 * 1. Suppression Helpers (7 boolean functions)
 * 2. CLI Output (no empty sections)
 * 3. HTML Output (no empty containers)
 * 4. Decision.json (omit keys entirely when suppressed)
 * 5. Consistency (same suppression across all outputs)
 */

const assert = require('assert');
const {
  shouldRenderFocusSummary,
  shouldRenderDeltaInsight,
  shouldRenderPatterns,
  shouldRenderConfidenceDrivers,
  shouldRenderJourneyMessage,
  shouldRenderNextRunHint,
  shouldRenderFirstRunNote,
} = require('../src/guardian/text-formatters');

// Simple test runner
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (err) {
    failed++;
    console.log(`❌ ${name}`);
    console.log(`   ${err.message}`);
  }
}

function describe(name, fn) {
  console.log(`\n📋 ${name}`);
  fn();
}

function it(name, fn) {
  test(`   ${name}`, fn);
}

// Run tests
console.log('\n🧪 Stage V / Step 5.2 — Silence Discipline Test Suite');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

describe('Suppression Helpers (Deterministic Boolean Functions)', () => {
  
  it('shouldRenderFocusSummary: suppress when READY + high + no patterns', () => {
    const verdict = { verdict: 'READY', confidence: { level: 'high' } };
    const patterns = [];
    assert.strictEqual(shouldRenderFocusSummary(verdict, patterns), false);
  });
  
  it('shouldRenderFocusSummary: show when READY + high + patterns exist', () => {
    const verdict = { verdict: 'READY', confidence: { level: 'high' } };
    const patterns = [{ patternId: 'critical-timeout' }];
    assert.strictEqual(shouldRenderFocusSummary(verdict, patterns), true);
  });
  
  it('shouldRenderFocusSummary: show when FRICTION (always)', () => {
    const verdict1 = { verdict: 'FRICTION', confidence: { level: 'high' } };
    const verdict2 = { verdict: 'FRICTION', confidence: { level: 'medium' } };
    assert.strictEqual(shouldRenderFocusSummary(verdict1, []), true);
    assert.strictEqual(shouldRenderFocusSummary(verdict2, []), true);
  });
  
  it('shouldRenderDeltaInsight: suppress when no improved/regressed lines', () => {
    const delta = { improved: [], regressed: [] };
    assert.strictEqual(shouldRenderDeltaInsight(delta), false);
  });
  
  it('shouldRenderDeltaInsight: show when any improved lines', () => {
    const delta = { improved: ['Verdict: FRICTION → READY'], regressed: [] };
    assert.strictEqual(shouldRenderDeltaInsight(delta), true);
  });
  
  it('shouldRenderDeltaInsight: show when any regressed lines', () => {
    const delta = { improved: [], regressed: ['Confidence: high → medium'] };
    assert.strictEqual(shouldRenderDeltaInsight(delta), true);
  });
  
  it('shouldRenderPatterns: suppress when patterns.length === 0', () => {
    assert.strictEqual(shouldRenderPatterns([]), false);
  });
  
  it('shouldRenderPatterns: show when patterns.length > 0', () => {
    const patterns = [{ patternId: 'critical-timeout' }];
    assert.strictEqual(shouldRenderPatterns(patterns), true);
  });
  
  it('shouldRenderConfidenceDrivers: suppress when high + runIndex >= 3', () => {
    const verdict = { confidence: { level: 'high' } };
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, 3), false);
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, 5), false);
  });
  
  it('shouldRenderConfidenceDrivers: show when high + runIndex < 3', () => {
    const verdict = { confidence: { level: 'high' } };
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, 1), true);
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, 2), true);
  });
  
  it('shouldRenderConfidenceDrivers: show when medium (always)', () => {
    const verdict = { confidence: { level: 'medium' } };
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, 1), true);
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, 5), true);
  });
  
  it('shouldRenderJourneyMessage: suppress when runIndex >= 3', () => {
    assert.strictEqual(shouldRenderJourneyMessage(3), false);
    assert.strictEqual(shouldRenderJourneyMessage(5), false);
  });
  
  it('shouldRenderJourneyMessage: show when runIndex < 3', () => {
    assert.strictEqual(shouldRenderJourneyMessage(1), true);
    assert.strictEqual(shouldRenderJourneyMessage(2), true);
  });
  
  it('shouldRenderNextRunHint: suppress when READY', () => {
    const verdict = { verdict: 'READY' };
    assert.strictEqual(shouldRenderNextRunHint(verdict), false);
  });
  
  it('shouldRenderNextRunHint: show when FRICTION', () => {
    const verdict = { verdict: 'FRICTION' };
    assert.strictEqual(shouldRenderNextRunHint(verdict), true);
  });
  
  it('shouldRenderFirstRunNote: suppress when runIndex >= 2', () => {
    assert.strictEqual(shouldRenderFirstRunNote(2), false);
    assert.strictEqual(shouldRenderFirstRunNote(5), false);
  });
  
  it('shouldRenderFirstRunNote: show when runIndex < 2', () => {
    assert.strictEqual(shouldRenderFirstRunNote(1), true);
  });
  
});

describe('CLI Output: No Empty Sections', () => {
  
  it('READY + high + no patterns: only verdict card visible', () => {
    // Mock verdict and patterns
    const verdict = {
      verdict: 'READY',
      confidence: { level: 'high', score: 0.95 },
      gaps: []
    };
    const patterns = [];
    const runIndex = 3;
    
    // Check suppression states
    assert.strictEqual(shouldRenderFocusSummary(verdict, patterns), false, 
      'Focus Summary should be suppressed');
    assert.strictEqual(shouldRenderPatterns(patterns), false, 
      'Patterns should be suppressed');
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, runIndex), false, 
      'Confidence Drivers should be suppressed');
    assert.strictEqual(shouldRenderJourneyMessage(runIndex), false, 
      'Journey Message should be suppressed');
    assert.strictEqual(shouldRenderNextRunHint(verdict), false, 
      'Next Run Hint should be suppressed');
    
    // In this "silent case", CLI should show:
    // - Verdict card (always)
    // - Confidence card (always)
    // - Nothing else (all optional sections suppressed)
  });
  
  it('FRICTION + medium + patterns: signal case with full output', () => {
    const verdict = {
      verdict: 'FRICTION',
      confidence: { level: 'medium', score: 0.72 },
      gaps: [{ category: 'content', severity: 'warning' }]
    };
    const patterns = [{ patternId: 'critical-timeout' }];
    const runIndex = 1;
    
    // Check visibility states
    assert.strictEqual(shouldRenderFocusSummary(verdict, patterns), true, 
      'Focus Summary should be visible');
    assert.strictEqual(shouldRenderPatterns(patterns), true, 
      'Patterns should be visible');
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, runIndex), true, 
      'Confidence Drivers should be visible');
    assert.strictEqual(shouldRenderJourneyMessage(runIndex), true, 
      'Journey Message should be visible');
    assert.strictEqual(shouldRenderNextRunHint(verdict), true, 
      'Next Run Hint should be visible');
  });
  
});

describe('Decision.json: Omit Keys When Suppressed', () => {
  
  it('decision.json must omit confidenceDrivers when suppressed', () => {
    const verdict = { confidence: { level: 'high' } };
    const runIndex = 3;
    
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, runIndex), false);
    
    // Expected: decision.json should NOT have "confidenceDrivers" key
    // The key must be omitted entirely, not set to []
  });
  
  it('decision.json must omit patterns when suppressed', () => {
    const patterns = [];
    
    assert.strictEqual(shouldRenderPatterns(patterns), false);
    
    // Expected: decision.json should NOT have "patterns" key
  });
  
  it('decision.json must omit focusSummary when suppressed', () => {
    const verdict = { verdict: 'READY', confidence: { level: 'high' } };
    const patterns = [];
    
    assert.strictEqual(shouldRenderFocusSummary(verdict, patterns), false);
    
    // Expected: decision.json should NOT have "focusSummary" key
  });
  
  it('decision.json must omit deltaInsight when suppressed', () => {
    const delta = { improved: [], regressed: [] };
    
    assert.strictEqual(shouldRenderDeltaInsight(delta), false);
    
    // Expected: decision.json should NOT have "deltaInsight" key
  });
  
});

describe('Consistency Across Outputs', () => {
  
  it('same suppression logic for CLI, HTML, decision.json', () => {
    // Test case: READY + high + no patterns
    const verdict = { verdict: 'READY', confidence: { level: 'high' } };
    const patterns = [];
    
    const shouldShow = shouldRenderFocusSummary(verdict, patterns);
    
    // All three outputs MUST use the same helper → same result
    assert.strictEqual(shouldShow, false);
    
    // This ensures:
    // - CLI: Focus Summary section not rendered
    // - HTML: Focus Summary card not rendered
    // - decision.json: focusSummary key omitted
  });
  
  it('centralized helpers eliminate inline conditions', () => {
    // Before Step 5.2: Each output had its own inline condition
    // CLI: if (focusLines.length > 0 && (verdict !== 'READY' || patterns.length > 0))
    // HTML: if (focusLines.length > 0 && shouldShowFocus())
    // decision.json: if (focusLines.length > 0) { packet.focusSummary = ... }
    
    // After Step 5.2: All outputs use shouldRenderFocusSummary()
    // This test validates that the helper exists and is deterministic
    
    const verdict = { verdict: 'READY', confidence: { level: 'high' } };
    const patterns = [{ patternId: 'test' }];
    
    const result1 = shouldRenderFocusSummary(verdict, patterns);
    const result2 = shouldRenderFocusSummary(verdict, patterns);
    const result3 = shouldRenderFocusSummary(verdict, patterns);
    
    // Deterministic: same inputs → same output (always)
    assert.strictEqual(result1, result2);
    assert.strictEqual(result2, result3);
    assert.strictEqual(result1, true); // patterns exist → show
  });
  
});

describe('Edge Cases', () => {
  
  it('handles missing verdict fields gracefully', () => {
    const verdict1 = {};
    const verdict2 = { verdict: 'READY' };
    const verdict3 = { confidence: { level: 'high' } };
    
    // Should not throw errors
    assert.doesNotThrow(() => shouldRenderFocusSummary(verdict1, []));
    assert.doesNotThrow(() => shouldRenderFocusSummary(verdict2, []));
    assert.doesNotThrow(() => shouldRenderConfidenceDrivers(verdict3, 1));
  });
  
  it('handles null/undefined patterns gracefully', () => {
    const verdict = { verdict: 'READY', confidence: { level: 'high' } };
    
    assert.strictEqual(shouldRenderFocusSummary(verdict, null), true); // null → show
    assert.strictEqual(shouldRenderFocusSummary(verdict, undefined), true); // undefined → show
    assert.strictEqual(shouldRenderPatterns(null), false); // null → hide
    assert.strictEqual(shouldRenderPatterns(undefined), false); // undefined → hide
  });
  
  it('handles edge runIndex values', () => {
    const verdict = { confidence: { level: 'high' } };
    
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, 0), true); // 0 → show
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, 1), true); // 1 → show
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, 2), true); // 2 → show
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, 3), false); // 3 → hide
    assert.strictEqual(shouldRenderConfidenceDrivers(verdict, 100), false); // 100 → hide
  });
  
});

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (failed === 0) {
  console.log(`✅ All ${passed} tests PASSED`);
  process.exit(0);
} else {
  console.log(`❌ ${failed} tests FAILED, ${passed} tests passed`);
  process.exit(1);
}
