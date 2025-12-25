/**
 * CLI Positioning Runtime Test
 * Verifies smoke/protect print correct first-line intent when starting.
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
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 8000
    });
    return { stdout: output, stderr: '', exitCode: 0 };
  } catch (err) {
    return { 
      stdout: (err.stdout || ''), 
      stderr: (err.stderr || ''), 
      exitCode: err.status || 1 
    };
  }
}

console.log('🧪 CLI Positioning Runtime Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Smoke prints fast market sanity check
console.log('Test 1: Smoke prints "Fast market sanity check"');
const res1 = runGuardian('smoke https://example.com --budget-ms 2000');
assert.ok(
  res1.stdout.includes('SMOKE MODE: Fast market sanity check'),
  'Smoke should print "Fast market sanity check" in first line'
);
assert.ok(res1.stdout.includes('<30s'), 'Should mention <30s timing');
console.log('✅ Smoke prints correct positioning\n');

// Test 2: Check alias prints same as smoke
console.log('Test 2: Check alias prints same positioning as smoke');
const res2 = runGuardian('check https://example.com --budget-ms 2000');
assert.ok(
  res2.stdout.includes('SMOKE MODE: Fast market sanity check'),
  'Check should print same positioning as smoke'
);
console.log('✅ Check prints correct positioning\n');

// Test 3: Protect prints full market reality test
console.log('Test 3: Protect prints "Full market reality test"');
const res3 = runGuardian('protect https://example.com --fast');
assert.ok(
  res3.stdout.includes('PROTECT MODE: Full market reality test') || 
  res3.stdout.includes('REALITY MODE'),
  'Protect should print "Full market reality test" or reality mode'
);
console.log('✅ Protect prints correct positioning\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ CLI positioning runtime tests PASSED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
