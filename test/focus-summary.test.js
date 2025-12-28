/**
 * Focus Summary Tests
 * 
 * Layer 5 - Advisor Mode: Validate focus summary derivation and display logic
 * 
 * Tests:
 * 1. Suppressed when READY + high confidence + no patterns
 * 2. Single pattern → 1 focus line derived from pattern
 * 3. Multiple patterns → ordered focus (max 3)
 * 4. BLOCKED verdict generates focus even without patterns
 * 5. Identical text when integrated
 */

const assert = require('assert');
const { formatFocusSummary } = require('../src/guardian/text-formatters');

console.log('🧪 Focus Summary Test');
console.log('━'.repeat(70) + '\n');

try {
  // Case 1: Suppressed when READY + high + no patterns
  {
    const verdict = {
      verdict: 'READY',
      confidence: { level: 'high', score: 0.90 }
    };
    const patterns = [];
    
    const focus = formatFocusSummary(verdict, patterns);
    
    assert.strictEqual(focus.length, 0, 'Focus should be empty for READY + high + no patterns');
    console.log('✅ Case 1 passed: Focus suppressed when READY + high + no patterns');
  }

  // Case 2: Single SPOF pattern → 1 focus line
  {
    const verdict = {
      verdict: 'BLOCKED',
      confidence: { level: 'medium', score: 0.45 }
    };
    const patterns = [{
      type: 'single_point_failure',
      pathName: 'Checkout flow',
      summary: 'Checkout always fails',
      confidence: 'high'
    }];
    
    const focus = formatFocusSummary(verdict, patterns);
    
    assert.strictEqual(focus.length, 1, 'Should have 1 focus line for single pattern');
    assert.ok(focus[0].includes('Checkout flow is blocked and prevents user progress'), 
      'Focus should mention SPOF pattern');
    console.log('✅ Case 2 passed: Single pattern generates 1 focus line');
  }

  // Case 3: Multiple patterns → ordered focus (max 3)
  {
    const verdict = {
      verdict: 'FRICTION',
      confidence: { level: 'medium', score: 0.55 }
    };
    const patterns = [
      {
        type: 'repeated_skipped_attempts',
        pathName: 'Shipping',
        summary: 'Shipping not tested',
        confidence: 'medium'
      },
      {
        type: 'single_point_failure',
        pathName: 'Login',
        summary: 'Login blocks progress',
        confidence: 'high'
      },
      {
        type: 'confidence_degradation',
        pathName: 'Search',
        summary: 'Quality declining',
        confidence: 'high'
      },
      {
        type: 'recurring_friction',
        pathName: 'Cart',
        summary: 'Cart friction repeating',
        confidence: 'medium'
      }
    ];
    
    const focus = formatFocusSummary(verdict, patterns);
    
    assert.strictEqual(focus.length, 3, 'Should have max 3 focus lines');
    // Verify priority order: SPOF > degradation > friction
    assert.ok(focus[0].includes('Login is blocked'), 'First focus should be SPOF');
    assert.ok(focus[1].includes('Search declining'), 'Second focus should be degradation');
    assert.ok(focus[2].includes('Cart experiencing repeated friction'), 'Third focus should be friction');
    console.log('✅ Case 3 passed: Multiple patterns generate ordered focus (max 3)');
  }

  // Case 4: BLOCKED verdict generates focus without patterns
  {
    const verdict = {
      verdict: 'BLOCKED',
      confidence: { level: 'medium', score: 0.50 }
    };
    const patterns = [];
    
    const focus = formatFocusSummary(verdict, patterns);
    
    assert.ok(focus.length > 0, 'BLOCKED should generate focus even without patterns');
    assert.ok(focus[0].includes('blocked'), 'Focus should mention blocked state');
    console.log('✅ Case 4 passed: BLOCKED verdict generates focus without patterns');
  }

  // Case 5: FRICTION with medium confidence generates focus
  {
    const verdict = {
      verdict: 'FRICTION',
      confidence: { level: 'medium', score: 0.45 }
    };
    const patterns = [];
    
    const focus = formatFocusSummary(verdict, patterns);
    
    assert.ok(focus.length > 0, 'FRICTION + medium should generate focus');
    assert.ok(focus[0].includes('friction'), 'Focus should mention friction');
    console.log('✅ Case 5 passed: FRICTION verdict generates focus');
  }

  // Case 6: Pattern priority order validation
  {
    const verdict = {
      verdict: 'FRICTION',
      confidence: { level: 'low', score: 0.30 }
    };
    const patterns = [
      {
        type: 'recurring_friction',
        pathName: 'Path A',
        confidence: 'high'
      },
      {
        type: 'confidence_degradation',
        pathName: 'Path B',
        confidence: 'high'
      },
      {
        type: 'single_point_failure',
        pathName: 'Path C',
        confidence: 'high'
      },
      {
        type: 'repeated_skipped_attempts',
        pathName: 'Path D',
        confidence: 'medium'
      }
    ];
    
    const focus = formatFocusSummary(verdict, patterns);
    
    // Verify strict priority: SPOF first
    assert.ok(focus[0].includes('Path C'), 'SPOF should be first priority');
    assert.ok(focus[1].includes('Path B'), 'Degradation should be second');
    assert.ok(focus[2].includes('Path A'), 'Friction should be third');
    console.log('✅ Case 6 passed: Pattern priority order validated');
  }

  // Case 7: Max 3 lines enforced
  {
    const verdict = {
      verdict: 'BLOCKED',
      confidence: { level: 'low', score: 0.20 }
    };
    const patterns = [
      { type: 'single_point_failure', pathName: 'P1', confidence: 'high' },
      { type: 'single_point_failure', pathName: 'P2', confidence: 'high' },
      { type: 'confidence_degradation', pathName: 'P3', confidence: 'high' },
      { type: 'confidence_degradation', pathName: 'P4', confidence: 'high' },
      { type: 'recurring_friction', pathName: 'P5', confidence: 'medium' }
    ];
    
    const focus = formatFocusSummary(verdict, patterns);
    
    assert.strictEqual(focus.length, 3, 'Must enforce max 3 focus lines');
    console.log('✅ Case 7 passed: Max 3 lines enforced');
  }

  // Case 8: Coverage gap (repeated_skipped) wording
  {
    const verdict = {
      verdict: 'FRICTION',
      confidence: { level: 'medium', score: 0.50 }
    };
    const patterns = [{
      type: 'repeated_skipped_attempts',
      pathName: 'Payment processing',
      confidence: 'medium'
    }];
    
    const focus = formatFocusSummary(verdict, patterns);
    
    assert.ok(focus[0].includes('Coverage gap'), 'Skipped pattern should mention coverage gap');
    assert.ok(focus[0].includes('not yet exercised'), 'Should indicate path not tested');
    console.log('✅ Case 8 passed: Coverage gap wording correct');
  }

  console.log('\nAll focus summary tests passed.');
} catch (err) {
  console.error('\n❌ Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}
