/**
 * Unit Tests: Journey Scanner Decision Logic
 * Tests error classification and outcome decisions
 */

const assert = require('assert');

// Import the decision logic
const { JourneyScanner } = require('../src/guardian/journey-scanner');

class DecisionLogicTests {
  constructor() {
    this.testCount = 0;
    this.passedCount = 0;
    this.failedCount = 0;
  }

  test(name, fn) {
    this.testCount++;
    try {
      fn();
      this.passedCount++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      this.failedCount++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }

  async run() {
    console.log('\n🧪 Unit Tests: Decision Logic\n');

    // Test 1: All steps succeeded = SAFE
    this.test('All steps succeeded → SAFE', () => {
      const scanner = new JourneyScanner();
      const result = {
        executedSteps: [
          { id: 'step-1', name: 'Homepage', success: true },
          { id: 'step-2', name: 'Find CTA', success: true }
        ],
        failedSteps: [],
        errorClassification: { type: 'NO_ERRORS', reason: 'All steps completed successfully' }
      };

      const decision = scanner._decideOutcome(result);
      assert.strictEqual(decision, 'SAFE', 'Should be SAFE when all steps succeed');
    });

    // Test 2: Partial failure = RISK
    this.test('Partial failure (50%) → RISK', () => {
      const scanner = new JourneyScanner();
      const result = {
        executedSteps: [
          { id: 'step-1', name: 'Homepage', success: true },
          { id: 'step-2', name: 'Find CTA', success: false }
        ],
        failedSteps: ['step-2'],
        errorClassification: { type: 'ELEMENT_NOT_FOUND', reason: 'CTA not found' }
      };

      const decision = scanner._decideOutcome(result);
      assert.strictEqual(decision, 'RISK', 'Should be RISK when some steps fail');
    });

    // Test 3: Complete failure = DO_NOT_LAUNCH
    this.test('Complete failure (0% success) → DO_NOT_LAUNCH', () => {
      const scanner = new JourneyScanner();
      const result = {
        executedSteps: [
          { id: 'step-1', name: 'Homepage', success: false }
        ],
        failedSteps: ['step-1'],
        errorClassification: { type: 'SITE_UNREACHABLE', reason: 'Cannot load homepage' }
      };

      const decision = scanner._decideOutcome(result);
      assert.strictEqual(decision, 'DO_NOT_LAUNCH', 'Should be DO_NOT_LAUNCH on total failure');
    });

    // Test 4: Error classification - Navigation blocked
    this.test('Error classification: Navigation blocked', () => {
      const scanner = new JourneyScanner();
      const result = {
        executedSteps: [
          { id: 'step-1', name: 'Homepage', action: 'navigate', success: true },
          { id: 'step-2', name: 'Signup page', action: 'navigate', success: false, error: 'Navigation failed' }
        ],
        failedSteps: ['step-2'],
        errorClassification: null
      };

      const classification = scanner._classifyErrors(result);
      assert.strictEqual(classification.type, 'NAVIGATION_BLOCKED', 'Should classify as NAVIGATION_BLOCKED');
    });

    // Test 5: Error classification - CTA not found
    this.test('Error classification: CTA not found', () => {
      const scanner = new JourneyScanner();
      const result = {
        executedSteps: [
          { id: 'step-1', name: 'Homepage', action: 'navigate', success: true },
          { id: 'step-2', name: 'Find CTA', action: 'find_cta', success: false, error: 'No CTA found' }
        ],
        failedSteps: ['step-2'],
        errorClassification: null
      };

      const classification = scanner._classifyErrors(result);
      assert.strictEqual(classification.type, 'CTA_NOT_FOUND', 'Should classify as CTA_NOT_FOUND');
    });

    // Test 6: Error classification - Site unreachable (no steps executed)
    this.test('Error classification: Site unreachable', () => {
      const scanner = new JourneyScanner();
      const result = {
        executedSteps: [],
        failedSteps: [],
        errorClassification: null
      };

      const classification = scanner._classifyErrors(result);
      assert.strictEqual(classification.type, 'SITE_UNREACHABLE', 'Should classify as SITE_UNREACHABLE when no steps executed');
    });

    // Test 7: Decision with no errors
    this.test('No errors classification', () => {
      const scanner = new JourneyScanner();
      const result = {
        executedSteps: [
          { id: 'step-1', name: 'Step 1', success: true },
          { id: 'step-2', name: 'Step 2', success: true }
        ],
        failedSteps: [],
        errorClassification: null
      };

      const classification = scanner._classifyErrors(result);
      assert.strictEqual(classification.type, 'NO_ERRORS', 'Should classify as NO_ERRORS when all succeed');
    });

    // Test 8: Edge case - Single step success
    this.test('Single step success → SAFE', () => {
      const scanner = new JourneyScanner();
      const result = {
        executedSteps: [{ id: 'step-1', name: 'Homepage', success: true }],
        failedSteps: [],
        errorClassification: { type: 'NO_ERRORS' }
      };

      const decision = scanner._decideOutcome(result);
      assert.strictEqual(decision, 'SAFE', 'Single successful step should be SAFE');
    });

    // Test 9: Edge case - Single step failure
    this.test('Single step failure → DO_NOT_LAUNCH', () => {
      const scanner = new JourneyScanner();
      const result = {
        executedSteps: [{ id: 'step-1', name: 'Homepage', success: false }],
        failedSteps: ['step-1'],
        errorClassification: { type: 'SITE_UNREACHABLE' }
      };

      const decision = scanner._decideOutcome(result);
      assert.strictEqual(decision, 'DO_NOT_LAUNCH', 'Single failed step should be DO_NOT_LAUNCH');
    });

    // Test 10: High success rate (80%) → SAFE or RISK
    this.test('High success rate (80%) is still SAFE', () => {
      const scanner = new JourneyScanner();
      // 4/5 steps succeeded = 80% but 1 failed step
      const result = {
        executedSteps: [
          { id: 's1', success: true },
          { id: 's2', success: true },
          { id: 's3', success: true },
          { id: 's4', success: true }
        ],
        failedSteps: [],
        errorClassification: { type: 'NO_ERRORS' }
      };

      const decision = scanner._decideOutcome(result);
      assert.strictEqual(decision, 'SAFE', 'All successes should be SAFE regardless of percentage');
    });

    // Summary
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Tests: ${this.passedCount}/${this.testCount} passed`);
    if (this.failedCount === 0) {
      console.log(`✅ All unit tests PASSED`);
      return 0;
    } else {
      console.log(`❌ ${this.failedCount} test(s) FAILED`);
      return 1;
    }
  }
}

// Run tests
(async () => {
  const suite = new DecisionLogicTests();
  const exitCode = await suite.run();
  process.exit(exitCode);
})();
