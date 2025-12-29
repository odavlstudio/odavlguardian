/**
 * CONFIG VALIDATOR TESTS
 * 
 * Verifies config schema validation works correctly
 */

const { validateConfig, getDefaultConfig, loadAndValidateConfig } = require('../src/guardian/config-validator');
const fs = require('fs');
const path = require('path');
const os = require('os');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passCount++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failCount++;
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(value, message) {
  if (!value) throw new Error(message || 'Expected true');
}

function assertFalse(value, message) {
  if (value) throw new Error(message || 'Expected false');
}

console.log('🧪 Config Validator Tests\n');

// Test 1: Valid minimal config
test('Valid minimal config passes', () => {
  const config = { crawl: { maxPages: 10 } };
  const result = validateConfig(config);
  assertTrue(result.valid, 'Config should be valid');
  assertEqual(result.errors, [], 'Should have no errors');
});

// Test 2: Valid full config
test('Valid full config passes', () => {
  const config = {
    crawl: { maxPages: 50, maxDepth: 3, timeout: 30000 },
    timeouts: { navigationMs: 20000, attemptMs: 60000 },
    output: { dir: './artifacts' },
    media: { screenshots: true, traces: false },
    preset: 'startup',
    headful: false,
    fast: true
  };
  const result = validateConfig(config);
  assertTrue(result.valid, 'Full config should be valid');
});

// Test 3: Invalid crawl.maxPages (too high)
test('Invalid maxPages rejected', () => {
  const config = { crawl: { maxPages: 10000 } };
  const result = validateConfig(config);
  assertFalse(result.valid, 'Config should be invalid');
  assertTrue(result.errors.length > 0, 'Should have errors');
  assertTrue(result.errors[0].includes('crawl.maxPages'), 'Error should reference maxPages');
});

// Test 4: Invalid crawl.maxDepth (negative)
test('Invalid maxDepth rejected', () => {
  const config = { crawl: { maxDepth: 0 } };
  const result = validateConfig(config);
  assertFalse(result.valid, 'Config should be invalid');
});

// Test 5: Invalid timeout (too low)
test('Invalid timeout rejected', () => {
  const config = { timeouts: { navigationMs: 100 } };
  const result = validateConfig(config);
  assertFalse(result.valid, 'Config should be invalid');
});

// Test 6: Unknown config key
test('Unknown config key rejected', () => {
  const config = { unknownKey: 'value' };
  const result = validateConfig(config);
  assertFalse(result.valid, 'Config with unknown key should be invalid');
  assertTrue(result.errors[0].includes('unknownKey'), 'Error should mention unknown key');
});

// Test 7: Unknown nested key
test('Unknown nested key rejected', () => {
  const config = { crawl: { maxPages: 10, unknownOption: true } };
  const result = validateConfig(config);
  assertFalse(result.valid, 'Config with unknown nested key should be invalid');
});

// Test 8: Invalid preset value
test('Invalid preset value rejected', () => {
  const config = { preset: 'invalid' };
  const result = validateConfig(config);
  assertFalse(result.valid, 'Invalid preset should be rejected');
  assertTrue(result.errors[0].includes('preset'), 'Error should mention preset');
});

// Test 9: Valid preset values
test('Valid preset values accepted', () => {
  for (const preset of ['startup', 'custom', 'landing', 'full']) {
    const config = { preset };
    const result = validateConfig(config);
    assertTrue(result.valid, `Preset "${preset}" should be valid`);
  }
});

// Test 10: Type mismatch detection
test('Type mismatch detected', () => {
  const config = { crawl: { maxPages: 'ten' } };
  const result = validateConfig(config);
  assertFalse(result.valid, 'String for numeric field should be invalid');
});

// Test 11: Empty config is valid (uses defaults)
test('Empty config is valid', () => {
  const config = {};
  const result = validateConfig(config);
  assertTrue(result.valid, 'Empty config should be valid');
});

// Test 12: Non-object config rejected
test('Non-object config rejected', () => {
  const result = validateConfig('not an object');
  assertFalse(result.valid, 'String should not be valid config');
  assertTrue(result.errors.length > 0, 'Should have errors');
});

// Test 13: Config with warnings
test('Config with warnings is still valid', () => {
  const config = { crawl: { maxPages: 10 } };
  const result = validateConfig(config);
  assertTrue(result.valid, 'Config should be valid even with warnings');
});

// Test 14: Default config has sensible values
test('Default config is valid and sensible', () => {
  const defaults = getDefaultConfig();
  const result = validateConfig(defaults);
  assertTrue(result.valid, 'Default config should be valid');
  assertTrue(defaults.crawl.maxPages > 0, 'Max pages should be positive');
  assertTrue(defaults.timeouts.navigationMs > 0, 'Timeout should be positive');
});

// Test 15: Media options can be set
test('Media options validation', () => {
  const config = { media: { screenshots: true, traces: true, video: false } };
  const result = validateConfig(config);
  assertTrue(result.valid, 'Media config should be valid');
});

// Test 16: Load and validate from missing file (should use defaults)
test('Missing file returns valid with defaults', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-test-'));
  const result = loadAndValidateConfig(tmpDir);
  assertTrue(result.valid, 'Should be valid when no file exists');
  assertEqual(result.config, null, 'Should return null config (will use defaults)');
  fs.rmSync(tmpDir, { recursive: true });
});

// Test 17: Load and validate from valid file
test('Valid config file loads successfully', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-test-'));
  const configPath = path.join(tmpDir, 'guardian.config.json');
  const validConfig = { crawl: { maxPages: 20 } };
  fs.writeFileSync(configPath, JSON.stringify(validConfig));
  
  const result = loadAndValidateConfig(tmpDir);
  assertTrue(result.valid, 'Valid config file should load');
  assertEqual(result.config.crawl.maxPages, 20, 'Config values should be preserved');
  fs.rmSync(tmpDir, { recursive: true });
});

// Test 18: Invalid JSON file
test('Invalid JSON file is detected', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-test-'));
  const configPath = path.join(tmpDir, 'guardian.config.json');
  fs.writeFileSync(configPath, '{ invalid json }');
  
  const result = loadAndValidateConfig(tmpDir);
  assertFalse(result.valid, 'Invalid JSON should be detected');
  assertTrue(result.errors[0].includes('Invalid JSON'), 'Should mention JSON error');
  fs.rmSync(tmpDir, { recursive: true });
});

// Test 19: Invalid config in file
test('Invalid config in file is detected', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-test-'));
  const configPath = path.join(tmpDir, 'guardian.config.json');
  const invalidConfig = { crawl: { maxPages: 10000 } };
  fs.writeFileSync(configPath, JSON.stringify(invalidConfig));
  
  const result = loadAndValidateConfig(tmpDir);
  assertFalse(result.valid, 'Invalid config should be detected');
  assertTrue(result.errors.length > 0, 'Should have validation errors');
  fs.rmSync(tmpDir, { recursive: true });
});

// Test 20: Config with all valid numeric ranges
test('All numeric constraints validated correctly', () => {
  const config = {
    crawl: { maxPages: 500, maxDepth: 5, timeout: 90000 },
    timeouts: { navigationMs: 50000, attemptMs: 150000 }
  };
  const result = validateConfig(config);
  assertTrue(result.valid, 'All numeric values within valid ranges should pass');
});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`Tests: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log(`${'='.repeat(60)}`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('\n✅ All config validation tests passed');
  process.exit(0);
}
