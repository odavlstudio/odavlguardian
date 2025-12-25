/**
 * CLI Positioning Help Test
 * Verifies help text includes clarified positioning for smoke vs protect.
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

console.log('🧪 CLI Positioning Help Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Main help lists clear positioning
console.log('Test 1: Main help shows clear smoke vs protect positioning');
const res1 = runGuardian('--help');
assert.ok(res1.stdout.includes('smoke'), 'Help should mention smoke');
assert.ok(res1.stdout.includes('protect'), 'Help should mention protect');
assert.ok(res1.stdout.includes('market sanity check'), 'Should use "market sanity check" for smoke');
assert.ok(res1.stdout.includes('market reality test'), 'Should use "market reality test" for protect');
assert.ok(res1.stdout.includes('<30s'), 'Should mention <30s for smoke');
console.log('✅ Main help uses consistent positioning vocabulary\n');

// Test 2: Smoke help uses market sanity check
console.log('Test 2: Smoke help uses "market sanity check"');
const res2 = runGuardian('smoke --help');
assert.ok(res2.stdout.includes('market sanity check'), 'Smoke help should say "market sanity check"');
assert.ok(res2.stdout.includes('<30s'), 'Smoke help should mention <30s');
console.log('✅ Smoke help uses correct positioning\n');

// Test 3: Protect help uses market reality test
console.log('Test 3: Protect help uses "market reality test"');
const res3 = runGuardian('protect --help');
assert.ok(res3.stdout.includes('market reality test'), 'Protect help should say "market reality test"');
assert.ok(res3.stdout.includes('Deeper') || res3.stdout.includes('deeper'), 'Protect help should clarify it\'s deeper than smoke');
console.log('✅ Protect help uses correct positioning\n');

// Test 4: Check alias uses same positioning as smoke
console.log('Test 4: Check alias help matches smoke positioning');
const res4 = runGuardian('check --help');
assert.ok(res4.stdout.includes('market sanity check'), 'Check help should match smoke positioning');
console.log('✅ Check alias uses consistent positioning\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ CLI positioning help tests PASSED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
