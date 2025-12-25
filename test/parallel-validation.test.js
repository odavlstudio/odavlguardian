/**
 * Phase 7.2 - Parallel Validation Tests
 * Tests --parallel flag validation
 */

const { validateParallel } = require('../src/guardian/parallel-executor');

function testValidParallel1() {
  console.log('  Test: --parallel 1 is valid');
  const result = validateParallel(1);
  if (result.valid && result.parallel === 1) {
    console.log('    ✅ --parallel 1 accepted');
  } else {
    console.log('    ❌ --parallel 1 should be valid');
  }
}

function testValidParallel2() {
  console.log('  Test: --parallel 2 is valid');
  const result = validateParallel(2);
  if (result.valid && result.parallel === 2) {
    console.log('    ✅ --parallel 2 accepted');
  } else {
    console.log('    ❌ --parallel 2 should be valid');
  }
}

function testValidParallel10() {
  console.log('  Test: --parallel 10 is valid (no hard cap)');
  const result = validateParallel(10);
  if (result.valid && result.parallel === 10) {
    console.log('    ✅ --parallel 10 accepted (no hard cap)');
  } else {
    console.log('    ❌ --parallel 10 should be valid');
  }
}

function testInvalidParallel0() {
  console.log('  Test: --parallel 0 is invalid');
  const result = validateParallel(0);
  if (!result.valid && result.error) {
    console.log('    ✅ --parallel 0 rejected with clean error');
  } else {
    console.log('    ❌ --parallel 0 should be invalid');
  }
}

function testInvalidParallelNegative() {
  console.log('  Test: --parallel -1 is invalid');
  const result = validateParallel(-1);
  if (!result.valid && result.error) {
    console.log('    ✅ --parallel -1 rejected with clean error');
  } else {
    console.log('    ❌ --parallel -1 should be invalid');
  }
}

function testInvalidParallelString() {
  console.log('  Test: --parallel abc is invalid');
  const result = validateParallel('abc');
  if (!result.valid && result.error && result.hint) {
    console.log('    ✅ --parallel abc rejected with hint');
  } else {
    console.log('    ❌ --parallel abc should be invalid');
  }
}

function testInvalidParallelEmpty() {
  console.log('  Test: --parallel (empty) defaults to 1');
  const result = validateParallel(undefined);
  if (result.valid && result.parallel === 1) {
    console.log('    ✅ No parallel value defaults to 1');
  } else {
    console.log('    ❌ Empty parallel should default to 1');
  }
}

function testParallelStringNumber() {
  console.log('  Test: --parallel "3" (string) is coerced to 3');
  const result = validateParallel('3');
  if (result.valid && result.parallel === 3) {
    console.log('    ✅ String "3" coerced to number 3');
  } else {
    console.log('    ❌ String "3" should be coerced');
  }
}

function testErrorMessage() {
  console.log('  Test: Invalid parallel error message is clean');
  const result = validateParallel('xyz');
  if (!result.valid && result.error && !result.error.includes('undefined')) {
    console.log('    ✅ Error message is clean');
  } else {
    console.log('    ⚠️  Error message quality');
  }
}

function testHintProvided() {
  console.log('  Test: Invalid parallel value includes hint');
  const result = validateParallel(-5);
  if (!result.valid && result.hint && result.hint.includes('--parallel')) {
    console.log('    ✅ Helpful hint included');
  } else {
    console.log('    ⚠️  Hint should be provided');
  }
}

async function runAllTests() {
  console.log('\n🧪 Phase 7.2 - Parallel Validation Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  testValidParallel1();
  testValidParallel2();
  testValidParallel10();
  testInvalidParallel0();
  testInvalidParallelNegative();
  testInvalidParallelString();
  testInvalidParallelEmpty();
  testParallelStringNumber();
  testErrorMessage();
  testHintProvided();

  console.log('\n✅ Parallel validation tests completed');
}

runAllTests().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});
