/**
 * Verdict Clarity Tests
 * Verify verdict formatting, reasons, testing clarity, and skip conditions
 */

const assert = require('assert');
const {
  shouldShowVerdictClarity,
  getVerdictExplanation,
  getActionHint,
  extractTopReasons,
  buildObservationClarity,
  formatVerdictClarity
} = require('../src/guardian/verdict-clarity');

// Test utilities
function mockTTY(isTTY) {
  const original = process.stdout.isTTY;
  process.stdout.isTTY = isTTY;
  return () => { process.stdout.isTTY = original; };
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Should show verdict clarity by default (TTY, no quiet)
  try {
    const restore = mockTTY(true);
    const result = shouldShowVerdictClarity({}, []);
    assert.strictEqual(result, true, 'Should show by default in TTY');
    restore();
    passed++;
    console.log('✅ Test 1: Default shows verdict clarity in TTY');
  } catch (e) {
    failed++;
    console.error('❌ Test 1 failed:', e.message);
  }

  // Test 2: Should skip with --quiet flag
  try {
    const restore = mockTTY(true);
    const result = shouldShowVerdictClarity({}, ['--quiet']);
    assert.strictEqual(result, false, 'Should skip with --quiet');
    restore();
    passed++;
    console.log('✅ Test 2: Skips with --quiet flag');
  } catch (e) {
    failed++;
    console.error('❌ Test 2 failed:', e.message);
  }

  // Test 3: Should skip with -q flag
  try {
    const restore = mockTTY(true);
    const result = shouldShowVerdictClarity({}, ['-q']);
    assert.strictEqual(result, false, 'Should skip with -q');
    restore();
    passed++;
    console.log('✅ Test 3: Skips with -q flag');
  } catch (e) {
    failed++;
    console.error('❌ Test 3 failed:', e.message);
  }

  // Test 4: Should skip non-TTY (CI)
  try {
    const restore = mockTTY(false);
    const result = shouldShowVerdictClarity({}, []);
    assert.strictEqual(result, false, 'Should skip non-TTY');
    restore();
    passed++;
    console.log('✅ Test 4: Skips non-TTY environments (CI)');
  } catch (e) {
    failed++;
    console.error('❌ Test 4 failed:', e.message);
  }

  // Test 5: READY verdict explanation
  try {
    const result = getVerdictExplanation('READY');
    assert.ok(result.toLowerCase().includes('safe'), 'READY should mention safe');
    assert.ok(result.toLowerCase().includes('launch'), 'READY should mention launch');
    passed++;
    console.log('✅ Test 5: READY verdict explanation');
  } catch (e) {
    failed++;
    console.error('❌ Test 5 failed:', e.message);
  }

  // Test 6: FRICTION verdict explanation
  try {
    const result = getVerdictExplanation('FRICTION');
    assert.ok(result.toLowerCase().includes('issue'), 'FRICTION should mention issues');
    assert.ok(result.toLowerCase().includes('caution'), 'FRICTION should mention caution');
    passed++;
    console.log('✅ Test 6: FRICTION verdict explanation');
  } catch (e) {
    failed++;
    console.error('❌ Test 6 failed:', e.message);
  }

  // Test 7: DO_NOT_LAUNCH verdict explanation
  try {
    const result = getVerdictExplanation('DO_NOT_LAUNCH');
    assert.ok(result.toLowerCase().includes('critical'), 'DO_NOT_LAUNCH should mention critical');
    assert.ok(result.toLowerCase().includes('resolved'), 'DO_NOT_LAUNCH should mention resolved');
    passed++;
    console.log('✅ Test 7: DO_NOT_LAUNCH verdict explanation');
  } catch (e) {
    failed++;
    console.error('❌ Test 7 failed:', e.message);
  }

  // Test 8: Action hint for READY
  try {
    const result = getActionHint('READY');
    assert.strictEqual(result, 'Safe to launch', 'READY action hint');
    passed++;
    console.log('✅ Test 8: Action hint for READY');
  } catch (e) {
    failed++;
    console.error('❌ Test 8 failed:', e.message);
  }

  // Test 9: Action hint for FRICTION
  try {
    const result = getActionHint('FRICTION');
    assert.strictEqual(result, 'Launch with caution', 'FRICTION action hint');
    passed++;
    console.log('✅ Test 9: Action hint for FRICTION');
  } catch (e) {
    failed++;
    console.error('❌ Test 9 failed:', e.message);
  }

  // Test 10: Action hint for DO_NOT_LAUNCH
  try {
    const result = getActionHint('DO_NOT_LAUNCH');
    assert.strictEqual(result, 'Do not launch', 'DO_NOT_LAUNCH action hint');
    passed++;
    console.log('✅ Test 10: Action hint for DO_NOT_LAUNCH');
  } catch (e) {
    failed++;
    console.error('❌ Test 10 failed:', e.message);
  }

  // Test 11: Extract top reasons - rules triggered
  try {
    const verdict = {
      triggeredRules: ['rule-1', 'rule-2', 'rule-3', 'rule-4']
    };
    const reasons = extractTopReasons(verdict, [], []);
    assert.strictEqual(reasons.length, 3, 'Should cap at 3 reasons');
    assert.ok(reasons.includes('rule-1'), 'Should include rule-1');
    passed++;
    console.log('✅ Test 11: Extract top reasons - rules triggered');
  } catch (e) {
    failed++;
    console.error('❌ Test 11 failed:', e.message);
  }

  // Test 12: Extract top reasons - critical failures
  try {
    const attempts = [
      { outcome: 'FAILURE' },
      { outcome: 'FAILURE' }
    ];
    const reasons = extractTopReasons({}, attempts, []);
    assert.ok(reasons.some(r => r.includes('2 critical')), 'Should mention critical failures');
    passed++;
    console.log('✅ Test 12: Extract top reasons - critical failures');
  } catch (e) {
    failed++;
    console.error('❌ Test 12 failed:', e.message);
  }

  // Test 13: Extract top reasons - friction signals
  try {
    const attempts = [
      { outcome: 'FRICTION' },
      { outcome: 'FRICTION' },
      { outcome: 'FRICTION' }
    ];
    const reasons = extractTopReasons({}, attempts, []);
    assert.ok(reasons.some(r => r.includes('3 flow') && r.includes('friction')), 'Should mention friction');
    passed++;
    console.log('✅ Test 13: Extract top reasons - friction signals');
  } catch (e) {
    failed++;
    console.error('❌ Test 13 failed:', e.message);
  }

  // Test 14: Build testing clarity - tested
  try {
    const coverage = {};
    const attempts = [
      { executed: true, attemptName: 'signup' },
      { executed: true, attemptName: 'payment' },
      { executed: true, attemptName: 'checkout' }
    ];
    const result = buildObservationClarity(coverage, attempts);
    assert.strictEqual(result.observed.count, 3, 'Should count 3 executed');
    assert.ok(result.observed.examples.includes('signup'), 'Should include flow names');
    passed++;
    console.log('✅ Test 14: Build observation clarity - observed');
  } catch (e) {
    failed++;
    console.error('❌ Test 14 failed:', e.message);
  }

  // Test 15: Build observation clarity - not observed reasons
  try {
    const coverage = {
      skippedDisabledByPreset: [{}, {}],
      skippedUserFiltered: [{}],
      skippedNotApplicable: [{}],
      skippedMissing: [{}]
    };
    const result = buildObservationClarity(coverage, []);
    assert.strictEqual(result.notObserved.count, 5, 'Should count 5 not observed');
    assert.strictEqual(result.notObserved.reasons.disabledByPreset, 2);
    assert.strictEqual(result.notObserved.reasons.userFiltered, 1);
    passed++;
    console.log('✅ Test 15: Build observation clarity - not observed reasons');
  } catch (e) {
    failed++;
    console.error('❌ Test 15 failed:', e.message);
  }

  // Test 16: Format verdict clarity - READY
  try {
    const restore = mockTTY(true);
    const output = formatVerdictClarity('READY', {
      reasons: ['All flows passed'],
      explanation: 'Safe to launch',
      observed: { count: 5, examples: ['flow1', 'flow2'] },
      notObserved: { count: 0, reasons: {} },
      config: {},
      args: []
    });
    restore();
    assert.ok(output.includes('READY'), 'Should include verdict');
    assert.ok(output.includes('Safe to launch'), 'Should include action');
    assert.ok(output.includes('All flows passed'), 'Should include reason');
    assert.ok(output.includes('What Was Observed'), 'Should include observed section');
    passed++;
    console.log('✅ Test 16: Format verdict clarity - READY');
  } catch (e) {
    failed++;
    console.error('❌ Test 16 failed:', e.message);
  }

  // Test 17: Format verdict clarity - FRICTION
  try {
    const restore = mockTTY(true);
    const output = formatVerdictClarity('FRICTION', {
      reasons: ['2 flows failed'],
      explanation: 'Some issues found',
      observed: { count: 3, examples: [] },
      notObserved: { count: 2, reasons: { missing: 2 } },
      config: {},
      args: []
    });
    restore();
    assert.ok(output.includes('FRICTION'), 'Should include verdict');
    assert.ok(output.includes('caution'), 'Should include caution');
    assert.ok(output.includes('What Was NOT Observed'), 'Should include not observed section');
    passed++;
    console.log('✅ Test 17: Format verdict clarity - FRICTION');
  } catch (e) {
    failed++;
    console.error('❌ Test 17 failed:', e.message);
  }

  // Test 18: Format verdict clarity - DO_NOT_LAUNCH
  try {
    const restore = mockTTY(true);
    const output = formatVerdictClarity('DO_NOT_LAUNCH', {
      reasons: ['Critical payment flow failed'],
      explanation: 'Critical issues',
      observed: { count: 2, examples: [] },
      notObserved: { count: 3, reasons: { disabledByPreset: 3 } },
      config: {},
      args: []
    });
    restore();
    assert.ok(output.includes('DO_NOT_LAUNCH'), 'Should include verdict');
    assert.ok(output.includes('Do not launch'), 'Should include action');
    passed++;
    console.log('✅ Test 18: Format verdict clarity - DO_NOT_LAUNCH');
  } catch (e) {
    failed++;
    console.error('❌ Test 18 failed:', e.message);
  }

  // Test 19: No reasons shows explicit message
  try {
    const restore = mockTTY(true);
    const output = formatVerdictClarity('READY', {
      reasons: [],
      observed: { count: 1, examples: [] },
      notObserved: { count: 0, reasons: {} },
      config: {},
      args: []
    });
    restore();
    assert.ok(output.includes('Guardian did not find enough evidence'), 'Should show evidence message when no reasons');
    passed++;
    console.log('✅ Test 19: No reasons shows explicit message');
  } catch (e) {
    failed++;
    console.error('❌ Test 19 failed:', e.message);
  }

  // Test 20: Skips with --quiet in format
  try {
    const restore = mockTTY(true);
    const output = formatVerdictClarity('READY', {
      reasons: ['All passed'],
      config: {},
      args: ['--quiet']
    });
    restore();
    assert.strictEqual(output, '', 'Should return empty string with --quiet');
    passed++;
    console.log('✅ Test 20: Skips with --quiet in format');
  } catch (e) {
    failed++;
    console.error('❌ Test 20 failed:', e.message);
  }

  // Test 21: Verdict clarity has proper formatting
  try {
    const restore = mockTTY(true);
    const output = formatVerdictClarity('READY', {
      reasons: ['Test reason'],
      observed: { count: 1, examples: ['flow1'] },
      notObserved: { count: 0, reasons: {} },
      config: {},
      args: []
    });
    restore();
    assert.ok(output.includes('━━━━━━━'), 'Should have separators');
    assert.ok(output.includes('VERDICT'), 'Should have verdict header');
    assert.ok(output.includes('Status:'), 'Should have status label');
    assert.ok(output.includes('Meaning:'), 'Should have meaning label');
    assert.ok(output.includes('Action:'), 'Should have action label');
    passed++;
    console.log('✅ Test 21: Verdict clarity has proper formatting');
  } catch (e) {
    failed++;
    console.error('❌ Test 21 failed:', e.message);
  }

  // Test 22: Caps reasons at 3
  try {
    const restore = mockTTY(true);
    const output = formatVerdictClarity('READY', {
      reasons: ['Reason 1', 'Reason 2', 'Reason 3', 'Reason 4'],
      observed: { count: 1, examples: [] },
      notObserved: { count: 0, reasons: {} },
      config: {},
      args: []
    });
    restore();
    // Count how many "1.", "2.", "3." appear in output
    const match = output.match(/^\d\./gm);
    assert.ok(match && match.length <= 3, 'Should cap at 3 reasons in output');
    passed++;
    console.log('✅ Test 22: Caps reasons at 3');
  } catch (e) {
    failed++;
    console.error('❌ Test 22 failed:', e.message);
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`Results: ${passed}/${passed + failed} tests passed`);
  if (failed === 0) {
    console.log('✅ All verdict clarity tests passed');
  } else {
    console.log(`❌ ${failed} test(s) failed`);
  }
  console.log('════════════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(2);
});
