/**
 * DX Hotfix Test: --version flag works without URL
 * Ensures npx @odavl/guardian --version exits cleanly.
 */

const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');

// Get the root directory
const rootDir = path.join(__dirname, '..');

// Helper: run guardian CLI and return result
function runGuardian(args) {
  try {
    const output = execSync(`node ${path.join(rootDir, 'bin/guardian.js')} ${args}`, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { stdout: output, exitCode: 0 };
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.status || 1 };
  }
}

console.log('🧪 DX Hotfix: --version Flag Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: --version exits 0 and prints version
console.log('Test 1: guardian --version');
const result1 = runGuardian('--version');
assert.strictEqual(result1.exitCode, 0, 'Should exit with 0');
assert.match(result1.stdout.trim(), /^\d+\.\d+\.\d+/, 'Should print semver version');
console.log(`✅ Prints: ${result1.stdout.trim()}\n`);

// Test 2: -v short form also works
console.log('Test 2: guardian -v');
const result2 = runGuardian('-v');
assert.strictEqual(result2.exitCode, 0, 'Should exit with 0');
assert.match(result2.stdout.trim(), /^\d+\.\d+\.\d+/, 'Should print semver version');
console.log(`✅ Prints: ${result2.stdout.trim()}\n`);

// Test 3: Ensure --help still works without URL
console.log('Test 3: guardian --help');
const result3 = runGuardian('--help');
assert.strictEqual(result3.exitCode, 0, 'Should exit with 0');
assert.ok(result3.stdout.includes('Guardian') || result3.stdout.includes('Usage'), 'Should print help');
console.log(`✅ Help text present\n`);

// Test 4: Ensure smoke without --version/--help still requires --url
console.log('Test 4: guardian smoke (no args)');
const result4 = runGuardian('smoke');
assert.notStrictEqual(result4.exitCode, 0, 'Should exit with error');
assert.ok(result4.stdout.includes('Error') || result4.stderr.includes('Error') || result4.stdout.includes('required'), 'Should error about missing URL');
console.log(`✅ Correctly rejects missing --url\n`);

// Test 5: Ensure protect without --url still requires it
console.log('Test 5: guardian protect (no args)');
const result5 = runGuardian('protect');
assert.notStrictEqual(result5.exitCode, 0, 'Should exit with error');
assert.ok(result5.stdout.includes('Error') || result5.stderr.includes('Error') || result5.stdout.includes('required'), 'Should error about missing URL');
console.log(`✅ Correctly rejects missing --url\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ All DX hotfix tests PASSED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
