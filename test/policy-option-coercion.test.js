/**
 * Policy Option Coercion Test
 * 
 * Regression test for non-critical policy option type issue.
 * Ensures that parsePolicyOption safely handles non-string inputs without throwing.
 */

const { parsePolicyOption } = require('../src/guardian/preset-loader');

async function test() {
  console.log('\n🧪 Policy Option Coercion Tests\n');

  let passed = 0;
  let failed = 0;

  // Test 1: null input
  try {
    const result = parsePolicyOption(null);
    if (result === null) {
      console.log('✅ Test 1: null input returns null');
      passed++;
    } else {
      console.log('❌ Test 1: null input should return null');
      failed++;
    }
  } catch (err) {
    console.log(`❌ Test 1: null input threw error: ${err.message}`);
    failed++;
  }

  // Test 2: undefined input
  try {
    const result = parsePolicyOption(undefined);
    if (result === null) {
      console.log('✅ Test 2: undefined input returns null');
      passed++;
    } else {
      console.log('❌ Test 2: undefined input should return null');
      failed++;
    }
  } catch (err) {
    console.log(`❌ Test 2: undefined input threw error: ${err.message}`);
    failed++;
  }

  // Test 3: empty string input
  try {
    const result = parsePolicyOption('');
    if (result === null) {
      console.log('✅ Test 3: empty string returns null');
      passed++;
    } else {
      console.log('❌ Test 3: empty string should return null');
      failed++;
    }
  } catch (err) {
    console.log(`❌ Test 3: empty string threw error: ${err.message}`);
    failed++;
  }

  // Test 4: whitespace-only string
  try {
    const result = parsePolicyOption('   ');
    if (result === null) {
      console.log('✅ Test 4: whitespace-only string returns null');
      passed++;
    } else {
      console.log('❌ Test 4: whitespace-only string should return null');
      failed++;
    }
  } catch (err) {
    console.log(`❌ Test 4: whitespace-only string threw error: ${err.message}`);
    failed++;
  }

  // Test 5: number input (should coerce to string safely)
  try {
    const result = parsePolicyOption(123);
    // Should try to find file "123", which doesn't exist
    if (result === null) {
      console.log('✅ Test 5: number input safely coerced and returns null');
      passed++;
    } else {
      console.log('❌ Test 5: number input should return null');
      failed++;
    }
  } catch (err) {
    console.log(`❌ Test 5: number input threw error: ${err.message}`);
    failed++;
  }

  // Test 6: object input (should coerce to string safely)
  try {
    const result = parsePolicyOption({ fake: 'object' });
    // Should coerce to string "[object Object]" and not find file
    if (result === null) {
      console.log('✅ Test 6: object input safely coerced and returns null');
      passed++;
    } else {
      console.log('❌ Test 6: object input should return null');
      failed++;
    }
  } catch (err) {
    console.log(`❌ Test 6: object input threw error: ${err.message}`);
    failed++;
  }

  // Test 7: string with startsWith should not throw
  try {
    const result = parsePolicyOption('some-nonexistent-file.json');
    // Should not find file and return null
    if (result === null) {
      console.log('✅ Test 7: normal string input does not throw');
      passed++;
    } else {
      console.log('❌ Test 7: normal string should return null');
      failed++;
    }
  } catch (err) {
    console.log(`❌ Test 7: normal string threw error: ${err.message}`);
    failed++;
  }

  // Test 8: preset format should work
  try {
    // Try to load non-existent preset (should warn but not throw)
    const result = parsePolicyOption('preset:fake-preset');
    if (result === null) {
      console.log('✅ Test 8: preset: format does not throw');
      passed++;
    } else {
      console.log('❌ Test 8: preset: format should return null for non-existent preset');
      failed++;
    }
  } catch (err) {
    console.log(`❌ Test 8: preset: format threw error: ${err.message}`);
    failed++;
  }

  // Summary
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

test().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
