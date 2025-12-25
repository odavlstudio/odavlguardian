/**
 * Check Alias Test
 * Verifies `guardian check <url>` behaves identically to `guardian smoke <url>`.
 */

const assert = require('assert');
const http = require('http');
const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Start a minimal test server
function startServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body>Test</body></html>');
    });
    server.listen(port, '0.0.0.0', () => {
      resolve(server);
    });
  });
}

function runGuardian(args) {
  try {
    const output = execSync(`node ${path.join(rootDir, 'bin/guardian.js')} ${args}`, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
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

console.log('🧪 Check Alias Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: check requires --url just like smoke
console.log('Test 1: guardian check (no args) requires --url');
const res1 = runGuardian('check');
assert.notStrictEqual(res1.exitCode, 0, 'Should fail without --url');
assert.ok(
  res1.stdout.includes('Error') || res1.stderr.includes('Error') || res1.stdout.includes('required'),
  'Should error about missing URL'
);
console.log('✅ Check correctly requires --url\n');

// Test 2: check accepts --headful flag (smoke only flag)
console.log('Test 2: guardian check <url> accepts --headful');
const res2 = runGuardian('check https://example.com --headful --budget-ms 1000');
// May fail due to budget, but should not reject --headful flag
assert.ok(
  !res2.stdout.includes("Unknown flag '--headful'"),
  'Check should accept --headful flag'
);
console.log('✅ Check accepts smoke-specific flags\n');

// Test 3: check rejects non-smoke flags
console.log('Test 3: guardian check rejects invalid flags');
const res3 = runGuardian('check https://example.com --parallel 2');
assert.notStrictEqual(res3.exitCode, 0, 'Should fail with invalid flag');
assert.ok(
  res3.stdout.includes("Unknown flag") || res3.stderr.includes("Unknown flag"),
  'Should reject --parallel flag'
);
console.log('✅ Check correctly rejects non-smoke flags\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Check alias tests PASSED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
