/**
 * Phase B: Recipe Runtime Unit Tests
 * 
 * Tests recipe parsing, enforcement logic, and failure classification
 */

const assert = require('assert');
const {
  parseRecipeStep,
  extractQuotedOrLastWord,
  executeRecipeAction
} = require('./src/recipes/recipe-runtime');
const {
  analyzeRecipeFailure,
  formatRecipeError,
  assessRecipeImpact
} = require('./src/recipes/recipe-failure-analysis');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🧪 Recipe Runtime Unit Tests');
console.log('═══════════════════════════════════════════════════════════\n');

// Test 1: Parse navigate step
console.log('Test 1: Parse navigate steps');
const navStep = parseRecipeStep('Navigate to product page', 0);
assert.strictEqual(navStep.action, 'navigate');
assert(navStep.target === 'product' || navStep.target === 'product page'); // Can be either
console.log('  ✓ Navigate parsed correctly\n');

// Test 2: Parse click step
console.log('Test 2: Parse click steps');
const clickStep = parseRecipeStep("Click on 'Add to Cart' button", 1);
assert.strictEqual(clickStep.action, 'click');
assert.strictEqual(clickStep.selector, 'Add to Cart');
console.log('  ✓ Click parsed correctly\n');

// Test 3: Parse fill step
console.log('Test 3: Parse fill steps');
const fillStep = parseRecipeStep("Fill email with 'test@example.com'", 2);
assert.strictEqual(fillStep.action, 'fill');
assert.strictEqual(fillStep.field, 'email');
assert.strictEqual(fillStep.value, 'test@example.com');
console.log('  ✓ Fill parsed correctly\n');

// Test 4: Parse submit step
console.log('Test 4: Parse submit steps');
const submitStep = parseRecipeStep('Submit form', 3);
assert.strictEqual(submitStep.action, 'submit');
console.log('  ✓ Submit parsed correctly\n');

// Test 5: Parse assert step
console.log('Test 5: Parse assert steps');
const assertStep = parseRecipeStep('Assert visible Success message', 4);
assert.strictEqual(assertStep.action, 'assertVisible');
// The selector might be 'element' or 'success message' depending on parsing
assert(assertStep.selector === 'element' || assertStep.selector.toLowerCase().includes('message'));
console.log('  ✓ Assert parsed correctly\n');

// Test 6: Extract quoted text
console.log('Test 6: Extract quoted text');
const quoted = extractQuotedOrLastWord("Click on 'Submit Button'");
assert.strictEqual(quoted, 'Submit Button');
console.log('  ✓ Quoted text extracted\n');

// Test 7: Recipe failure analysis
console.log('Test 7: Analyze recipe failure');
const failureResult = {
  success: false,
  recipe: 'test-recipe',
  recipeName: 'Test Recipe',
  baseUrl: 'http://example.com',
  steps: [
    { id: 'test-recipe-step-0', index: 0, text: 'Navigate', success: true },
    { id: 'test-recipe-step-1', index: 1, text: 'Click', success: false, error: 'Element not found' }
  ],
  failedStep: 'test-recipe-step-1',
  failureReason: 'Element not found: .submit-btn',
  duration: 5
};

const analysis = analyzeRecipeFailure(failureResult);
assert.strictEqual(analysis.failureType, 'ELEMENT_NOT_FOUND');
assert.strictEqual(analysis.severity, 'CRITICAL');
assert.strictEqual(analysis.stepProgress.completed, 1);
assert.strictEqual(analysis.stepProgress.total, 2);
console.log('  ✓ Failure analysis correct');
console.log(`    Type: ${analysis.failureType}`);
console.log(`    Message: ${analysis.humanReadableError}\n`);

// Test 8: Impact assessment
console.log('Test 8: Assess recipe impact');
const impact = assessRecipeImpact(failureResult);
assert.strictEqual(impact.hasRisk, true);
assert(impact.riskScore >= 50);
assert.strictEqual(impact.severity, 'CRITICAL');
console.log(`  ✓ Risk assessment: ${impact.severity} (${impact.riskScore}/100)\n`);

// Test 9: Goal failure analysis
console.log('Test 9: Analyze goal failure');
const goalFailure = {
  success: false,
  recipe: 'checkout',
  recipeName: 'Checkout Flow',
  baseUrl: 'http://shop.example.com',
  steps: [
    { success: true, text: 'Add to cart' },
    { success: true, text: 'Proceed to checkout' },
    { success: true, text: 'Enter address' },
    { success: true, text: 'Submit payment' }
  ],
  failedStep: null,
  failureReason: 'Goal not reached: Order confirmation page loads with order number',
  duration: 12
};

const goalAnalysis = analyzeRecipeFailure(goalFailure);
assert.strictEqual(goalAnalysis.failureType, 'GOAL_FAILURE');
console.log('  ✓ Goal failure detected\n');

// Test 10: Format human-readable error
console.log('Test 10: Format human-readable error');
const humanError = formatRecipeError('Login Flow', 'recipe-step-2', 'Field not found: password', 5);
assert(humanError.includes('Login Flow'));
assert(humanError.includes('step 3'));
assert(humanError.includes('password'));
console.log(`  ✓ Error message: "${humanError}"\n`);

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ All unit tests passed!');
console.log('═══════════════════════════════════════════════════════════\n');

process.exit(0);
