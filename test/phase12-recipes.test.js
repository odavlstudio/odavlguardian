/**
 * Phase 12.1: Recipes Tests
 * Test recipe system, validation, and execution
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import recipe modules
const { validateRecipe, getComplexityScore, getEstimatedTime, getRecipeSummary, createExecutionContext, recordStep, markComplete } = require('../src/recipes/recipe-engine');
const { getAllRecipes, getRecipe, getRecipesByPlatform, addRecipe, removeRecipe, importRecipes, exportRecipes, resetCustomRecipes, BUILT_IN_RECIPES } = require('../src/recipes/recipe-store');

// Test counters
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    failed++;
  }
}

// ==================== RECIPE VALIDATION TESTS ====================

console.log('\n=== Recipe Validation ===\n');

test('Should validate correct recipe', () => {
  const recipe = {
    id: 'test-recipe',
    name: 'Test Recipe',
    platform: 'saas',
    intent: 'Test the system',
    steps: ['Step 1', 'Step 2'],
    expectedGoal: 'Success'
  };
  
  const result = validateRecipe(recipe);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test('Should reject missing id', () => {
  const recipe = {
    name: 'Test Recipe',
    platform: 'saas',
    intent: 'Test',
    steps: ['Step 1'],
    expectedGoal: 'Success'
  };
  
  const result = validateRecipe(recipe);
  assert.strictEqual(result.valid, false);
  assert(result.errors.some(e => e.includes('id')));
});

test('Should reject missing name', () => {
  const recipe = {
    id: 'test',
    platform: 'saas',
    intent: 'Test',
    steps: ['Step 1'],
    expectedGoal: 'Success'
  };
  
  const result = validateRecipe(recipe);
  assert.strictEqual(result.valid, false);
  assert(result.errors.some(e => e.includes('name')));
});

test('Should reject invalid platform', () => {
  const recipe = {
    id: 'test',
    name: 'Test',
    platform: 'invalid',
    intent: 'Test',
    steps: ['Step 1'],
    expectedGoal: 'Success'
  };
  
  const result = validateRecipe(recipe);
  assert.strictEqual(result.valid, false);
  assert(result.errors.some(e => e.includes('platform')));
});

test('Should reject missing steps', () => {
  const recipe = {
    id: 'test',
    name: 'Test',
    platform: 'saas',
    intent: 'Test',
    steps: [],
    expectedGoal: 'Success'
  };
  
  const result = validateRecipe(recipe);
  assert.strictEqual(result.valid, false);
});

test('Should reject missing expectedGoal', () => {
  const recipe = {
    id: 'test',
    name: 'Test',
    platform: 'saas',
    intent: 'Test',
    steps: ['Step 1']
  };
  
  const result = validateRecipe(recipe);
  assert.strictEqual(result.valid, false);
});

// ==================== RECIPE METRICS TESTS ====================

console.log('\n=== Recipe Metrics ===\n');

test('Should calculate complexity: simple', () => {
  const recipe = {
    steps: ['S1', 'S2', 'S3']
  };
  
  assert.strictEqual(getComplexityScore(recipe), 'simple');
});

test('Should calculate complexity: moderate', () => {
  const recipe = {
    steps: ['S1', 'S2', 'S3', 'S4', 'S5']
  };
  
  assert.strictEqual(getComplexityScore(recipe), 'moderate');
});

test('Should calculate complexity: complex', () => {
  const recipe = {
    steps: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']
  };
  
  assert.strictEqual(getComplexityScore(recipe), 'complex');
});

test('Should estimate time simple', () => {
  const recipe = {
    steps: ['S1', 'S2']
  };
  
  const time = getEstimatedTime(recipe);
  assert(time > 0);
  assert(time <= 20); // 2 * 5-8 seconds
});

test('Should estimate time complex', () => {
  const recipe = {
    steps: Array(10).fill('Step')
  };
  
  const time = getEstimatedTime(recipe);
  assert(time > 50); // 10 * 8 seconds
});

test('Should generate recipe summary', () => {
  const recipe = {
    id: 'test',
    name: 'Test',
    platform: 'saas',
    intent: 'Test intent',
    steps: ['S1', 'S2', 'S3'],
    expectedGoal: 'Success'
  };
  
  const summary = getRecipeSummary(recipe);
  assert.strictEqual(summary.id, 'test');
  assert.strictEqual(summary.stepCount, 3);
  assert(summary.complexity);
  assert(summary.estimatedTime > 0);
});

// ==================== RECIPE STORE TESTS ====================

console.log('\n=== Recipe Store ===\n');

test('Should have built-in recipes', () => {
  assert(BUILT_IN_RECIPES.length >= 3);
  assert(BUILT_IN_RECIPES.some(r => r.id === 'shopify-checkout'));
  assert(BUILT_IN_RECIPES.some(r => r.id === 'saas-signup'));
  assert(BUILT_IN_RECIPES.some(r => r.id === 'landing-contact'));
});

test('Should get all recipes', () => {
  resetCustomRecipes();
  const recipes = getAllRecipes();
  assert(recipes.length >= 3);
});

test('Should get recipe by id', () => {
  const recipe = getRecipe('shopify-checkout');
  assert(recipe);
  assert.strictEqual(recipe.id, 'shopify-checkout');
  assert.strictEqual(recipe.platform, 'shopify');
});

test('Should get recipes by platform', () => {
  const saasRecipes = getRecipesByPlatform('saas');
  assert(saasRecipes.length >= 1);
  assert(saasRecipes.every(r => r.platform === 'saas'));
});

test('Should add custom recipe', () => {
  resetCustomRecipes();
  const recipe = {
    id: 'custom-test',
    name: 'Custom Test',
    platform: 'landing',
    intent: 'Custom test',
    steps: ['Step 1', 'Step 2'],
    expectedGoal: 'Success'
  };
  
  const added = addRecipe(recipe);
  assert.strictEqual(added.id, 'custom-test');
  
  const retrieved = getRecipe('custom-test');
  assert(retrieved);
  assert.strictEqual(retrieved.name, 'Custom Test');
});

test('Should prevent duplicate recipe ids', () => {
  resetCustomRecipes();
  const recipe = {
    id: 'dup-test',
    name: 'Test',
    platform: 'landing',
    intent: 'Test',
    steps: ['S1'],
    expectedGoal: 'Success'
  };
  
  addRecipe(recipe);
  
  try {
    addRecipe(recipe);
    throw new Error('Should have thrown');
  } catch (err) {
    assert(err.message.includes('already exists'));
  }
});

test('Should remove custom recipe', () => {
  resetCustomRecipes();
  const recipe = {
    id: 'remove-test',
    name: 'Test',
    platform: 'landing',
    intent: 'Test',
    steps: ['S1'],
    expectedGoal: 'Success'
  };
  
  addRecipe(recipe);
  const removed = removeRecipe('remove-test');
  assert.strictEqual(removed.id, 'remove-test');
  
  const retrieved = getRecipe('remove-test');
  assert(!retrieved);
});

test('Should not remove built-in recipes', () => {
  try {
    removeRecipe('shopify-checkout');
    throw new Error('Should have thrown');
  } catch (err) {
    assert(err.message.includes('Cannot remove built-in'));
  }
});

// ==================== RECIPE IMPORT/EXPORT TESTS ====================

console.log('\n=== Recipe Import/Export ===\n');

test('Should export recipes', () => {
  resetCustomRecipes();
  const recipe = {
    id: 'export-test',
    name: 'Export Test',
    platform: 'saas',
    intent: 'Test',
    steps: ['S1'],
    expectedGoal: 'Success'
  };
  
  addRecipe(recipe);
  
  const tempFile = path.join(os.tmpdir(), `test-export-${Date.now()}.json`);
  
  try {
    const result = exportRecipes(['export-test'], tempFile);
    assert(fs.existsSync(tempFile));
    assert.strictEqual(result.count, 1);
    
    const content = JSON.parse(fs.readFileSync(tempFile, 'utf-8'));
    assert.strictEqual(content.recipes.length, 1);
    assert.strictEqual(content.recipes[0].id, 'export-test');
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
});

test('Should import recipes', () => {
  resetCustomRecipes();
  
  const recipe = {
    id: 'import-test',
    name: 'Import Test',
    platform: 'landing',
    intent: 'Test',
    steps: ['S1', 'S2'],
    expectedGoal: 'Success'
  };
  
  const tempFile = path.join(os.tmpdir(), `test-import-${Date.now()}.json`);
  
  try {
    fs.writeFileSync(tempFile, JSON.stringify([recipe], null, 2), 'utf-8');
    
    const result = importRecipes(tempFile);
    assert.strictEqual(result.imported.length, 1);
    assert(result.imported.includes('import-test'));
    
    const retrieved = getRecipe('import-test');
    assert(retrieved);
    assert.strictEqual(retrieved.name, 'Import Test');
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
});

test('Should skip duplicate imports', () => {
  resetCustomRecipes();
  const recipe = {
    id: 'dup-import',
    name: 'Test',
    platform: 'saas',
    intent: 'Test',
    steps: ['S1'],
    expectedGoal: 'Success'
  };
  
  addRecipe(recipe);
  
  const tempFile = path.join(os.tmpdir(), `test-skip-${Date.now()}.json`);
  
  try {
    fs.writeFileSync(tempFile, JSON.stringify([recipe], null, 2), 'utf-8');
    
    const result = importRecipes(tempFile);
    assert.strictEqual(result.imported.length, 0);
    assert(result.errors.length > 0);
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
});

// ==================== RECIPE EXECUTION TESTS ====================

console.log('\n=== Recipe Execution ===\n');

test('Should create execution context', () => {
  const recipe = {
    id: 'test',
    name: 'Test',
    platform: 'saas',
    intent: 'Test',
    steps: ['S1'],
    expectedGoal: 'Success'
  };
  
  const context = createExecutionContext(recipe, 'https://example.com');
  
  assert(context.recipe);
  assert.strictEqual(context.baseUrl, 'https://example.com');
  assert(context.startedAt);
  assert.strictEqual(context.success, false);
  assert.strictEqual(context.steps.length, 0);
});

test('Should record step execution', () => {
  const recipe = {
    id: 'test',
    name: 'Test',
    platform: 'saas',
    intent: 'Test',
    steps: ['S1'],
    expectedGoal: 'Success'
  };
  
  const context = createExecutionContext(recipe, 'https://example.com');
  
  recordStep(context, 0, 'Navigate', { success: true });
  recordStep(context, 1, 'Fill form', { success: true });
  
  assert.strictEqual(context.steps.length, 2);
  assert.strictEqual(context.steps[0].action, 'Navigate');
  assert.strictEqual(context.steps[1].action, 'Fill form');
});

test('Should mark execution complete', () => {
  const recipe = {
    id: 'test',
    name: 'Test',
    platform: 'saas',
    intent: 'Test',
    steps: ['S1'],
    expectedGoal: 'Success'
  };
  
  const context = createExecutionContext(recipe, 'https://example.com');
  
  recordStep(context, 0, 'Test', { success: true });
  markComplete(context, true);
  
  assert.strictEqual(context.success, true);
  assert(context.completedAt);
  assert(context.duration >= 0);
});

// ==================== INTEGRATION TESTS ====================

console.log('\n=== Integration Tests ===\n');

test('Built-in recipes are valid', () => {
  for (const recipe of BUILT_IN_RECIPES) {
    const result = validateRecipe(recipe);
    assert.strictEqual(result.valid, true, `Invalid recipe: ${recipe.id}`);
  }
});

test('All platforms have recipes', () => {
  const platforms = ['shopify', 'saas', 'landing'];
  
  for (const platform of platforms) {
    const recipes = getRecipesByPlatform(platform);
    assert(recipes.length > 0, `No recipes for platform: ${platform}`);
  }
});

test('Full recipe workflow', () => {
  resetCustomRecipes();
  
  // 1. Create recipe
  const recipe = {
    id: 'workflow-test',
    name: 'Workflow Test',
    platform: 'saas',
    intent: 'Complete test',
    steps: ['Navigate', 'Login', 'Verify'],
    expectedGoal: 'Authenticated'
  };
  
  // 2. Validate
  const validation = validateRecipe(recipe);
  assert.strictEqual(validation.valid, true);
  
  // 3. Add to store
  addRecipe(recipe);
  
  // 4. Retrieve
  const retrieved = getRecipe('workflow-test');
  assert(retrieved);
  
  // 5. Get metrics
  const summary = getRecipeSummary(retrieved);
  assert.strictEqual(summary.stepCount, 3);
  
  // 6. Create execution
  const context = createExecutionContext(retrieved, 'https://example.com');
  recordStep(context, 0, 'Navigate', { success: true });
  recordStep(context, 1, 'Login', { success: true });
  recordStep(context, 2, 'Verify', { success: true });
  markComplete(context, true);
  
  // 7. Verify execution
  assert.strictEqual(context.success, true);
  assert.strictEqual(context.steps.length, 3);
  assert(context.duration >= 0);
});

// ==================== SUMMARY ====================

console.log('\n=== Test Summary ===\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);

process.exit(failed > 0 ? 1 : 0);
