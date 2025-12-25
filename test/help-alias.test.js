/**
 * Help Alias Test
 * Verifies `guardian --help` includes `check` as an alias of `smoke`.
 */

const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');

function runGuardian(args) {
  try {
    const output = execSync(`node ${path.join(rootDir, 'bin/guardian.js')} ${args}`, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { stdout: output, exitCode: 0 };
  } catch (err) {
    return { stdout: (err.stdout || ''), stderr: (err.stderr || ''), exitCode: err.status || 1 };
  }
}

console.log('🧪 Help Alias Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: --help includes check
console.log('Test 1: guardian --help lists check');
const res1 = runGuardian('--help');
assert.ok(res1.stdout.includes('check'), 'Help should mention check command');
assert.ok(res1.stdout.includes('Alias'), 'Help should indicate alias relationship');
console.log('✅ Help includes check as alias\n');

// Test 2: check --help works
console.log('Test 2: guardian check --help works');
const res2 = runGuardian('check --help');
assert.strictEqual(res2.exitCode, 0, 'check --help should succeed');
assert.ok(res2.stdout.includes('smoke') || res2.stdout.includes('smoke'), 'Help should mention smoke');
console.log('✅ Check --help succeeds\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Help alias tests PASSED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
