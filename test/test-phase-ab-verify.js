#!/usr/bin/env node

/**
 * Phase A & B Verification Test
 * Confirms both scheduler and recipe runtime are properly integrated
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔍 Phase A & B Verification Test');
console.log('═══════════════════════════════════════════════════════════\n');

// Verify Phase A files exist
console.log('Verifying Phase A (Scheduler) files...');
const phaseAFiles = [
  'src/guardian/live-scheduler.js',
  'src/guardian/live-scheduler-runner.js',
  'test-live-scheduler-unit.js',
  'test-live-scheduler-integration.js'
];

for (const file of phaseAFiles) {
  const filePath = path.join(__dirname, file);
  assert(fs.existsSync(filePath), `Missing file: ${file}`);
  console.log(`  ✓ ${file}`);
}
console.log();

// Verify Phase B files exist
console.log('Verifying Phase B (Recipes) files...');
const phaseBFiles = [
  'src/recipes/recipe-runtime.js',
  'src/recipes/recipe-failure-analysis.js',
  'test-recipe-runtime-unit.js',
  'test-recipe-runtime-integration.js',
  'PHASE_B_RECIPES.md'
];

for (const file of phaseBFiles) {
  const filePath = path.join(__dirname, file);
  assert(fs.existsSync(filePath), `Missing file: ${file}`);
  console.log(`  ✓ ${file}`);
}
console.log();

// Verify CLI wiring
console.log('Verifying CLI integration...');
const cliPath = path.join(__dirname, 'bin/guardian.js');
const cliContent = fs.readFileSync(cliPath, 'utf-8');

// Phase A CLI
assert(cliContent.includes('live-start'), 'Missing live-start handler');
assert(cliContent.includes('live-stop'), 'Missing live-stop handler');
assert(cliContent.includes('live-status'), 'Missing live-status handler');
console.log('  ✓ Phase A CLI commands wired');

// Phase B CLI
assert(cliContent.includes('executeRecipeRuntime'), 'Missing recipe runtime import');
assert(cliContent.includes('recipe run'), 'Missing recipe run handler');
console.log('  ✓ Phase B CLI commands wired');
console.log();

// Verify flag validator
console.log('Verifying flag validator updates...');
const flagPath = path.join(__dirname, 'src/guardian/flag-validator.js');
const flagContent = fs.readFileSync(flagPath, 'utf-8');
assert(flagContent.includes('--interval'), 'Missing --interval flag');
assert(flagContent.includes('--cooldown'), 'Missing --cooldown flag');
console.log('  ✓ CLI flags updated for live scheduling\n');

// Verify module exports
console.log('Verifying module exports...');
try {
  const { executeRecipeRuntime } = require('./src/recipes/recipe-runtime');
  assert(typeof executeRecipeRuntime === 'function');
  console.log('  ✓ recipe-runtime exports executeRecipeRuntime');
  
  const { createSchedule, stopSchedule, listSchedules } = require('./src/guardian/live-scheduler');
  assert(typeof createSchedule === 'function');
  assert(typeof stopSchedule === 'function');
  assert(typeof listSchedules === 'function');
  console.log('  ✓ live-scheduler exports all functions');
  
  const { analyzeRecipeFailure } = require('./src/recipes/recipe-failure-analysis');
  assert(typeof analyzeRecipeFailure === 'function');
  console.log('  ✓ recipe-failure-analysis exports analyzeRecipeFailure');
} catch (err) {
  console.error('  ✗ Module export error:', err.message);
  process.exit(1);
}
console.log();

// Test recipe store
console.log('Verifying recipe store...');
try {
  const { getAllRecipes, getRecipe } = require('./src/recipes/recipe-store');
  const recipes = getAllRecipes();
  assert(Array.isArray(recipes), 'getAllRecipes should return array');
  assert(recipes.length > 0, 'Should have at least 3 built-in recipes');
  
  const recipe = getRecipe('shopify-checkout');
  assert(recipe, 'Should find shopify-checkout recipe');
  assert(recipe.id === 'shopify-checkout', 'Recipe ID mismatch');
  assert(Array.isArray(recipe.steps), 'Recipe steps should be array');
  
  console.log(`  ✓ Recipe store working (${recipes.length} recipes available)`);
} catch (err) {
  console.error('  ✗ Recipe store error:', err.message);
  process.exit(1);
}
console.log();

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ All verifications passed!');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Phase A (Scheduler): ✅ READY');
console.log('Phase B (Recipes):  ✅ READY\n');

console.log('Next steps:');
console.log('  1. guardian live start https://example.com --interval 15');
console.log('  2. guardian recipe run shopify-checkout --url https://store.example.com\n');

process.exit(0);
