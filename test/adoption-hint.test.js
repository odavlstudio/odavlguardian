/**
 * Adoption Hint Test
 * Verifies first-run hint function exists and is callable.
 */

const assert = require('assert');
const { printFirstRunHint } = require('../src/guardian/first-run');

console.log('🧪 Adoption Hint Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Hint function exists
console.log('Test 1: printFirstRunHint function is defined');
assert.ok(typeof printFirstRunHint === 'function', 'printFirstRunHint should be a function');
console.log('✅ Function exists\n');

// Test 2: Hint function prints expected text
console.log('Test 2: printFirstRunHint outputs tip');
const originalLog = console.log;
let capturedOutput = '';
console.log = (msg) => {
  capturedOutput += msg + '\n';
};
printFirstRunHint();
console.log = originalLog;
assert.ok(capturedOutput.includes('Tip:'), 'Output should include "Tip:"');
assert.ok(capturedOutput.includes('smoke'), 'Output should mention smoke command');
console.log(`✅ Prints: ${capturedOutput.trim()}\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Adoption hint tests PASSED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
