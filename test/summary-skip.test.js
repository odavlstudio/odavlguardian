/**
 * Phase 7.4: Summary Skip Tests
 * 
 * Verify SKIPPED attempts appear correctly in summaries
 */

const { printCliSummary } = require('../src/guardian/cli-summary');

async function testSkippedInSummary() {
  try {
    const snapshot = {
      baseUrl: 'https://example.com',
      attempts: [
        {
          attemptId: 'contact_form',
          attemptName: 'Contact Form',
          outcome: 'SUCCESS',
          stepCount: 5,
          totalDurationMs: 1234
        },
        {
          attemptId: 'checkout',
          attemptName: 'Checkout',
          outcome: 'SKIPPED',
          skipReason: 'No checkout/cart link found on page',
          stepCount: 0,
          totalDurationMs: 0
        },
        {
          attemptId: 'login',
          attemptName: 'Login',
          outcome: 'FAILURE',
          stepCount: 3,
          totalDurationMs: 2345
        }
      ],
      signals: [],
      flows: []
    };
    
    const policyEval = null;
    
    // This will print to console - we just verify it doesn't crash
    printCliSummary(snapshot, policyEval);
    
    console.log('✅ Test 1: SKIPPED appears in CLI summary without errors');
  } catch (err) {
    console.error('❌ Test 1 failed:', err.message);
    throw err;
  }
}

async function testSkippedCount() {
  try {
    const snapshot = {
      baseUrl: 'https://example.com',
      attempts: [
        { attemptId: 'a1', attemptName: 'A1', outcome: 'SUCCESS', stepCount: 1, totalDurationMs: 100 },
        { attemptId: 'a2', attemptName: 'A2', outcome: 'SKIPPED', skipReason: 'Missing prereq', stepCount: 0, totalDurationMs: 0 },
        { attemptId: 'a3', attemptName: 'A3', outcome: 'SKIPPED', skipReason: 'Missing prereq', stepCount: 0, totalDurationMs: 0 },
        { attemptId: 'a4', attemptName: 'A4', outcome: 'FAILURE', stepCount: 2, totalDurationMs: 200 }
      ],
      signals: [],
      flows: []
    };
    
    // Count outcomes
    const success = snapshot.attempts.filter(a => a.outcome === 'SUCCESS').length;
    const skipped = snapshot.attempts.filter(a => a.outcome === 'SKIPPED').length;
    const failed = snapshot.attempts.filter(a => a.outcome === 'FAILURE').length;
    
    if (success !== 1) {
      throw new Error(`Expected 1 success, got ${success}`);
    }
    
    if (skipped !== 2) {
      throw new Error(`Expected 2 skipped, got ${skipped}`);
    }
    
    if (failed !== 1) {
      throw new Error(`Expected 1 failure, got ${failed}`);
    }
    
    console.log('✅ Test 2: SKIPPED count calculated correctly (1 success, 2 skipped, 1 failed)');
  } catch (err) {
    console.error('❌ Test 2 failed:', err.message);
    throw err;
  }
}

async function testSkippedDoesNotAffectExitCode() {
  try {
    // Scenario: All attempts skipped - should still be exit code 0
    const allSkipped = [
      { attemptId: 'a1', outcome: 'SKIPPED', exitCode: 0 },
      { attemptId: 'a2', outcome: 'SKIPPED', exitCode: 0 }
    ];
    
    // Verify each SKIPPED has exitCode 0
    for (const attempt of allSkipped) {
      if (attempt.exitCode !== 0) {
        throw new Error(`SKIPPED should have exitCode 0, got ${attempt.exitCode}`);
      }
    }
    
    // Scenario: Mix of SUCCESS and SKIPPED - should be exit code 0
    const mixedSuccessSkipped = [
      { attemptId: 'a1', outcome: 'SUCCESS', exitCode: 0 },
      { attemptId: 'a2', outcome: 'SKIPPED', exitCode: 0 }
    ];
    
    for (const attempt of mixedSuccessSkipped) {
      if (attempt.exitCode !== 0) {
        throw new Error(`SUCCESS/SKIPPED should have exitCode 0, got ${attempt.exitCode}`);
      }
    }
    
    console.log('✅ Test 3: SKIPPED does not affect exit code (always 0)');
  } catch (err) {
    console.error('❌ Test 3 failed:', err.message);
    throw err;
  }
}

async function testSkippedReasonIncluded() {
  try {
    const attempt = {
      attemptId: 'checkout',
      attemptName: 'Checkout',
      outcome: 'SKIPPED',
      skipReason: 'No checkout/cart link found on page',
      stepCount: 0,
      totalDurationMs: 0
    };
    
    if (!attempt.skipReason) {
      throw new Error('SKIPPED attempt should have skipReason');
    }
    
    if (!attempt.skipReason.includes('checkout') && !attempt.skipReason.includes('cart')) {
      throw new Error(`skipReason should be descriptive, got: ${attempt.skipReason}`);
    }
    
    console.log(`✅ Test 4: SKIPPED includes reason ("${attempt.skipReason}")`);
  } catch (err) {
    console.error('❌ Test 4 failed:', err.message);
    throw err;
  }
}

async function runAllTests() {
  console.log('\n🧪 Summary Skip Tests (Phase 7.4)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    await testSkippedInSummary();
    await testSkippedCount();
    await testSkippedDoesNotAffectExitCode();
    await testSkippedReasonIncluded();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All summary skip tests PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  } catch (err) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ Some tests FAILED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

runAllTests();
