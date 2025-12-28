#!/usr/bin/env node
/**
 * Stage IV Complete Validation
 * 
 * Runs all Layer 2-5 tests to verify complete Stage IV implementation.
 */

const { spawnSync } = require('child_process');
const path = require('path');

console.log('🧪 Stage IV Complete Validation\n');
console.log('Running all Layer 2-5 tests...\n');

const tests = [
  { name: 'Layer 2: Three-Runs Journey', file: 'first-run-message.test.js' },
  { name: 'Layer 3: Pattern Action Focus', file: 'pattern-action-focus.test.js' },
  { name: 'Layer 4.2: Confidence Driver Card', file: 'confidence-driver-card.test.js' },
  { name: 'Layer 5: Focus Summary', file: 'focus-summary.test.js' },
  { name: 'Stage V / Step 5.1: Delta Insight', file: 'delta-insight.test.js' },
  { name: 'Decision Packet Schema', file: 'decision-packet.test.js' }
];

let allPassed = true;
const results = [];

for (const test of tests) {
  const testPath = path.join(__dirname, test.file);
  console.log(`\n📝 ${test.name}`);
  console.log(`   File: ${test.file}`);
  
  const result = spawnSync('node', [testPath], { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  const passed = result.status === 0;
  results.push({ name: test.name, passed });
  
  if (passed) {
    console.log(`   ✅ PASSED`);
  } else {
    console.log(`   ❌ FAILED`);
    console.log(`\n--- Error Output ---`);
    console.log(result.stdout);
    console.log(result.stderr);
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(60));
console.log('Stage IV Complete Validation Summary');
console.log('='.repeat(60));

for (const result of results) {
  const status = result.passed ? '✅' : '❌';
  console.log(`${status} ${result.name}`);
}

console.log('\n' + '='.repeat(60));

if (allPassed) {
  console.log('✅ All Stage IV tests passed!');
  console.log('\nStage IV implementation complete:');
  console.log('  - Layer 2: Three-Runs Journey ✅');
  console.log('  - Layer 3: Pattern Action Focus ✅');
  console.log('  - Layer 4.2: Confidence Driver Card ✅');
  console.log('  - Layer 5: Focus Summary ✅');
  console.log('  - Stage V / Step 5.1: Delta Insight ✅');
  console.log('  - Output consistency validated ✅');
  console.log('  - Schema compliance validated ✅');
  console.log('\nReady for production! 🚀');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. See output above.');
  process.exit(1);
}
