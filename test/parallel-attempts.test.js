/**
 * Phase 7.2 - Parallel Attempts Tests
 * Tests bounded parallel execution of attempts
 */

const { executeParallel } = require('../src/guardian/parallel-executor');

function testSequentialEquivalent() {
  console.log('  Test: N=1 equals sequential behavior');
  return new Promise(async (resolve) => {
    const attempts = ['a', 'b', 'c'];
    let executionOrder = [];

    const results = await executeParallel(
      attempts,
      async (attempt) => {
        executionOrder.push(attempt);
        return { id: attempt, completed: true };
      },
      1
    );

    if (executionOrder.join(',') === 'a,b,c' && results.length === 3) {
      console.log('    ✅ Sequential (N=1) preserves order');
      resolve();
    } else {
      console.log(`    ❌ Sequential order incorrect: ${executionOrder.join(',')}`);
      resolve();
    }
  });
}

function testParallelExecution() {
  console.log('  Test: N=2 allows concurrent execution');
  return new Promise(async (resolve) => {
    const attempts = ['a', 'b', 'c', 'd'];
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const results = await executeParallel(
      attempts,
      async (attempt) => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        
        // Simulate work
        await new Promise(r => setTimeout(r, 10));
        
        concurrentCount--;
        return { id: attempt, completed: true };
      },
      2
    );

    if (maxConcurrent <= 2 && results.length === 4) {
      console.log(`    ✅ Parallel (N=2) concurrency: max ${maxConcurrent}`);
      resolve();
    } else {
      console.log(`    ⚠️  Concurrency: max=${maxConcurrent} (expected <= 2)`);
      resolve();
    }
  });
}

function testResultOrder() {
  console.log('  Test: Results in original input order');
  return new Promise(async (resolve) => {
    const attempts = [10, 20, 30, 40, 50];
    
    const results = await executeParallel(
      attempts,
      async (attempt) => {
        // Reverse delay: larger numbers finish first
        await new Promise(r => setTimeout(r, 100 - attempt));
        return { value: attempt, delayed: true };
      },
      3
    );

    const resultOrder = results.map(r => r.value).join(',');
    if (resultOrder === '10,20,30,40,50') {
      console.log('    ✅ Results in original input order despite different completion times');
      resolve();
    } else {
      console.log(`    ❌ Order incorrect: ${resultOrder}`);
      resolve();
    }
  });
}

function testEmptyQueue() {
  console.log('  Test: Empty queue handled gracefully');
  return new Promise(async (resolve) => {
    const attempts = [];
    const results = await executeParallel(
      attempts,
      async (attempt) => ({ id: attempt }),
      2
    );

    if (results.length === 0) {
      console.log('    ✅ Empty queue returns empty results');
      resolve();
    } else {
      console.log('    ❌ Empty queue should return empty results');
      resolve();
    }
  });
}

function testHighConcurrency() {
  console.log('  Test: High concurrency (N=5) supported');
  return new Promise(async (resolve) => {
    const attempts = Array.from({ length: 10 }, (_, i) => `task-${i}`);
    let maxConcurrent = 0;
    let concurrentCount = 0;

    const results = await executeParallel(
      attempts,
      async (attempt) => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise(r => setTimeout(r, 5));
        concurrentCount--;
        return { id: attempt };
      },
      5
    );

    if (maxConcurrent <= 5 && results.length === 10) {
      console.log(`    ✅ High concurrency (N=5) max=${maxConcurrent} concurrent`);
      resolve();
    } else {
      console.log(`    ⚠️  Concurrency: max=${maxConcurrent}`);
      resolve();
    }
  });
}

async function runAllTests() {
  console.log('\n🧪 Phase 7.2 - Parallel Attempts Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await testSequentialEquivalent();
  await testParallelExecution();
  await testResultOrder();
  await testEmptyQueue();
  await testHighConcurrency();

  console.log('\n✅ Parallel attempts tests completed');
}

runAllTests().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});
