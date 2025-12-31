/**
 * Verdict Clarity Integration Test
 * Verifies that verdict clarity is integrated properly and produces correct output
 */

const assert = require('assert');
const {
  printVerdictClarity,
  extractTopReasons,
  buildObservationClarity,
  shouldShowVerdictClarity
} = require('../src/guardian/verdict-clarity');

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Integration - full READY verdict output
  try {
    const mockTTY = () => {
      const original = process.stdout.isTTY;
      process.stdout.isTTY = true;
      return () => { process.stdout.isTTY = original; };
    };

    const restore = mockTTY();
    
    // Capture console output
    const output = [];
    const originalLog = console.log;
    console.log = (...args) => output.push(args.join(' '));

    const verdictData = {
      reasons: [
        'All 5 critical flows completed successfully',
        'No policy violations detected',
        'Performance metrics within expected range'
      ],
      explanation: 'All core user flows completed successfully. Safe to launch.',
      observed: {
        count: 5,
        examples: ['signup', 'login', 'payment', 'checkout', 'profile']
      },
      notObserved: {
        count: 2,
        reasons: {
          disabledByPreset: 2,
          userFiltered: 0,
          notApplicable: 0,
          missing: 0
        }
      },
      config: {},
      args: []
    };

    printVerdictClarity('READY', verdictData);

    console.log = originalLog;
    restore();

    const fullOutput = output.join('\n');

    assert.ok(fullOutput.includes('VERDICT'), 'Should have VERDICT header');
    assert.ok(fullOutput.includes('READY'), 'Should show READY');
    assert.ok(fullOutput.includes('Safe to launch'), 'Should show action');
    assert.ok(fullOutput.includes('Top Reasons'), 'Should have reasons section');
    assert.ok(fullOutput.includes('What Was Observed'), 'Should have observed section');
    assert.ok(fullOutput.includes('5 user flow(s) executed successfully'), 'Should show count');

    passed++;
    console.log('✅ Test 1: READY verdict integration output');
  } catch (e) {
    failed++;
    console.error('❌ Test 1 failed:', e.message);
  }

  // Test 2: Integration - full FRICTION verdict output
  try {
    const mockTTY = () => {
      const original = process.stdout.isTTY;
      process.stdout.isTTY = true;
      return () => { process.stdout.isTTY = original; };
    };

    const restore = mockTTY();

    const output = [];
    const originalLog = console.log;
    console.log = (...args) => output.push(args.join(' '));

    const verdictData = {
      reasons: [
        '2 flows encountered friction signals',
        'Payment flow has timeout issues',
        'Form validation errors on signup'
      ],
      explanation: 'Some user flows encountered issues. Launch with caution.',
      observed: {
        count: 4,
        examples: ['login', 'payment', 'checkout']
      },
      notObserved: {
        count: 1,
        reasons: {
          disabledByPreset: 0,
          userFiltered: 0,
          notApplicable: 1,
          missing: 0
        }
      },
      config: {},
      args: []
    };

    printVerdictClarity('FRICTION', verdictData);

    console.log = originalLog;
    restore();

    const fullOutput = output.join('\n');

    assert.ok(fullOutput.includes('FRICTION'), 'Should show FRICTION');
    assert.ok(fullOutput.includes('caution'), 'Should mention caution');
    assert.ok(fullOutput.includes('2 flows encountered'), 'Should show specific issue');

    passed++;
    console.log('✅ Test 2: FRICTION verdict integration output');
  } catch (e) {
    failed++;
    console.error('❌ Test 2 failed:', e.message);
  }

  // Test 3: Integration - DO_NOT_LAUNCH verdict
  try {
    const mockTTY = () => {
      const original = process.stdout.isTTY;
      process.stdout.isTTY = true;
      return () => { process.stdout.isTTY = original; };
    };

    const restore = mockTTY();

    const output = [];
    const originalLog = console.log;
    console.log = (...args) => output.push(args.join(' '));

    const verdictData = {
      reasons: [
        'Critical payment flow failed',
        'Security validation failed on login',
        'Database connection error in checkout'
      ],
      explanation: 'Critical issues found. Do not launch until resolved.',
      observed: {
        count: 2,
        examples: ['login', 'payment']
      },
      notObserved: {
        count: 3,
        reasons: {
          disabledByPreset: 3,
          userFiltered: 0,
          notApplicable: 0,
          missing: 0
        }
      },
      config: {},
      args: []
    };

    printVerdictClarity('DO_NOT_LAUNCH', verdictData);

    console.log = originalLog;
    restore();

    const fullOutput = output.join('\n');

    assert.ok(fullOutput.includes('DO_NOT_LAUNCH'), 'Should show DO_NOT_LAUNCH');
    assert.ok(fullOutput.includes('Do not launch'), 'Should show action');
    assert.ok(fullOutput.includes('Critical'), 'Should mention critical');

    passed++;
    console.log('✅ Test 3: DO_NOT_LAUNCH verdict integration output');
  } catch (e) {
    failed++;
    console.error('❌ Test 3 failed:', e.message);
  }

  // Test 4: CI mode suppression integration
  try {
    const mockNonTTY = () => {
      const original = process.stdout.isTTY;
      process.stdout.isTTY = false;
      return () => { process.stdout.isTTY = original; };
    };

    const restore = mockNonTTY();

    const output = [];
    const originalLog = console.log;
    console.log = (...args) => output.push(args.join(' '));

    printVerdictClarity('READY', {
      reasons: ['Test'],
      observed: { count: 1, examples: [] },
      notObserved: { count: 0, reasons: {} },
      config: {},
      args: []
    });

    console.log = originalLog;
    restore();

    const fullOutput = output.join('\n').trim();
    assert.strictEqual(fullOutput, '', 'Should suppress output in non-TTY (CI)');

    passed++;
    console.log('✅ Test 4: CI mode suppression works');
  } catch (e) {
    failed++;
    console.error('❌ Test 4 failed:', e.message);
  }

  // Test 5: Quiet flag suppression
  try {
    const mockTTY = () => {
      const original = process.stdout.isTTY;
      process.stdout.isTTY = true;
      return () => { process.stdout.isTTY = original; };
    };

    const restore = mockTTY();

    const output = [];
    const originalLog = console.log;
    console.log = (...args) => output.push(args.join(' '));

    printVerdictClarity('READY', {
      reasons: ['Test'],
      observed: { count: 1, examples: [] },
      notObserved: { count: 0, reasons: {} },
      config: {},
      args: ['--quiet']
    });

    console.log = originalLog;
    restore();

    const fullOutput = output.join('\n').trim();
    assert.strictEqual(fullOutput, '', 'Should suppress output with --quiet');

    passed++;
    console.log('✅ Test 5: Quiet flag suppression works');
  } catch (e) {
    failed++;
    console.error('❌ Test 5 failed:', e.message);
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`Results: ${passed}/${passed + failed} integration tests passed`);
  if (failed === 0) {
    console.log('✅ All verdict clarity integration tests passed');
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
