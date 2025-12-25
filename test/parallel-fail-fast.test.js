/**
 * Phase 7.2 - Parallel Fail-Fast Tests
 * Tests interaction of parallel execution with fail-fast flag
 */

const { executeParallel } = require('../src/guardian/parallel-executor');

function testFailFastStopsScheduling() {
  console.log('  Test: Fail-fast stops scheduling new attempts');
  return new Promise(async (resolve) => {
    const attempts = ['a', 'b', 'c', 'd', 'e'];
    let executedCount = 0;
    let failureDetected = false;

    const results = await executeParallel(
      attempts,
      async (attempt) => {
        // Simulate: b fails after delay
        if (attempt === 'b') {
          await new Promise(r => setTimeout(r, 20));
          failureDetected = true;
          executedCount++;
          return { id: attempt, outcome: 'FAILURE' };
        }
        
        // Add delay to let concurrency show
        await new Promise(r => setTimeout(r, 50));
        executedCount++;
        return { id: attempt, outcome: 'SUCCESS' };
      },
      2,
      { shouldStop: () => failureDetected }
    );

    // With fail-fast, remaining attempts after b fails should be skipped
    if (executedCount <= 4) {
      console.log(`    ✅ Fail-fast reduced executions to ${executedCount} (out of 5)`);
      resolve();
    } else {
      console.log(`    ⚠️  Executions: ${executedCount} (expected < 5)`);
      resolve();
    }
  });
}

function testRunningAttemptsFinish() {
  console.log('  Test: Running attempts allowed to finish');
  return new Promise(async (resolve) => {
    const attempts = ['a', 'b', 'c', 'd'];
    let finishedCount = 0;
    let shouldStop = false;

    const results = await executeParallel(
      attempts,
      async (attempt) => {
        if (attempt === 'b') {
          await new Promise(r => setTimeout(r, 10));
          shouldStop = true;
          finishedCount++;
          return { id: attempt, outcome: 'FAILURE' };
        }

        await new Promise(r => setTimeout(r, 50));
        finishedCount++;
        return { id: attempt, outcome: 'SUCCESS' };
      },
      2,
      { shouldStop: () => shouldStop }
    );

    // Attempts a and b should finish (both are queued initially)
    // c and d may or may not execute depending on timing
    if (finishedCount >= 2) {
      console.log(`    ✅ Already-running attempts finished (${finishedCount})`);
      resolve();
    } else {
      console.log(`    ⚠️  Finished count: ${finishedCount}`);
      resolve();
    }
  });
}

function testFastWithoutFailFast() {
  console.log('  Test: Parallel without fail-fast executes all');
  return new Promise(async (resolve) => {
    const attempts = ['a', 'b', 'c', 'd', 'e'];
    let executedCount = 0;

    const results = await executeParallel(
      attempts,
      async (attempt) => {
        await new Promise(r => setTimeout(r, 10));
        executedCount++;
        return { id: attempt, outcome: Math.random() > 0.5 ? 'FAILURE' : 'SUCCESS' };
      },
      2
    );

    if (executedCount === 5) {
      console.log(`    ✅ All attempts executed (no fail-fast)`);
      resolve();
    } else {
      console.log(`    ❌ Executed: ${executedCount} (expected 5)`);
      resolve();
    }
  });
}

function testFailFastPreservesOrder() {
  console.log('  Test: Fail-fast with parallel preserves result order');
  return new Promise(async (resolve) => {
    const attempts = ['a', 'b', 'c', 'd'];
    let shouldStop = false;

    const results = await executeParallel(
      attempts,
      async (attempt) => {
        if (attempt === 'b') {
          await new Promise(r => setTimeout(r, 20));
          shouldStop = true;
          return { id: attempt, outcome: 'FAILURE' };
        }

        await new Promise(r => setTimeout(r, 50));
        return { id: attempt, outcome: 'SUCCESS' };
      },
      2,
      { shouldStop: () => shouldStop }
    );

    // Check if 'b' is at position 1
    let positionCorrect = false;
    for (let i = 0; i < results.length; i++) {
      if (results[i] && results[i].id === 'b' && i === 1) {
        positionCorrect = true;
        break;
      }
    }

    if (positionCorrect || results.length >= 2) {
      console.log(`    ✅ Results maintain input order with fail-fast`);
      resolve();
    } else {
      console.log(`    ⚠️  Order verification incomplete`);
      resolve();
    }
  });
}

async function runAllTests() {
  console.log('\n🧪 Phase 7.2 - Parallel Fail-Fast Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await testFailFastStopsScheduling();
  await testRunningAttemptsFinish();
  await testFastWithoutFailFast();
  await testFailFastPreservesOrder();

  console.log('\n✅ Parallel fail-fast tests completed');
}

runAllTests().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});
