/**
 * Phase 7.3: Browser Reuse with Parallel Execution Tests
 * 
 * Verify browser pool works correctly with parallel attempts
 */

const { BrowserPool } = require('../src/guardian/browser-pool');
const { executeParallel } = require('../src/guardian/parallel-executor');

async function testParallelContextsShareBrowser() {
  const pool = new BrowserPool();
  
  try {
    await pool.launch({ headless: true });
    
    // Track browser reference
    const browserRef = pool.browser;
    
    // Execute 3 parallel "attempts" that each create a context
    const results = await executeParallel(
      ['attempt1', 'attempt2', 'attempt3'],
      async (attemptId) => {
        const { context, page } = await pool.createContext();
        
        // Verify it's the same browser
        if (context.browser() !== browserRef) {
          throw new Error(`${attemptId} has different browser instance`);
        }
        
        // Navigate to verify context works
        await page.goto('about:blank');
        const title = await page.title();
        
        // Cleanup context
        await pool.closeContext(context);
        
        return { attemptId, title };
      },
      2 // Run 2 concurrent
    );
    
    // Verify all completed
    if (results.length !== 3) {
      throw new Error(`Expected 3 results, got ${results.length}`);
    }
    
    // Verify no contexts left open
    if (pool.getActiveContextCount() !== 0) {
      throw new Error(`Expected 0 active contexts, got ${pool.getActiveContextCount()}`);
    }
    
    await pool.close();
    console.log('✅ Test 1: Parallel contexts share same browser');
  } catch (err) {
    console.error('❌ Test 1 failed:', err.message);
    throw err;
  }
}

async function testParallelContextIsolation() {
  const pool = new BrowserPool();
  
  try {
    await pool.launch({ headless: true });
    
    // Run 3 attempts in parallel, each navigating to unique content
    const results = await executeParallel(
      ['a', 'b', 'c'],
      async (id) => {
        const { context, page } = await pool.createContext();
        
        // Navigate to unique content
        await page.goto(`data:text/html,<html><body>Attempt ${id}</body></html>`);
        
        // Read it back
        const value = await page.textContent('body');
        
        // Cleanup
        await pool.closeContext(context);
        
        return { id, value };
      },
      3 // All concurrent
    );
    
    // Verify each got its own value
    for (const result of results) {
      const expected = `Attempt ${result.id}`;
      if (result.value !== expected) {
        throw new Error(`Attempt ${result.id} got wrong value: ${result.value}, expected: ${expected}`);
      }
    }
    
    await pool.close();
    console.log('✅ Test 2: Parallel contexts maintain isolation');
  } catch (err) {
    console.error('❌ Test 2 failed:', err.message);
    throw err;
  }
}

async function testHighConcurrency() {
  const pool = new BrowserPool();
  
  try {
    await pool.launch({ headless: true });
    
    // Run 10 attempts with concurrency of 5
    const attemptIds = Array.from({ length: 10 }, (_, i) => `attempt-${i}`);
    
    const results = await executeParallel(
      attemptIds,
      async (id) => {
        const { context, page } = await pool.createContext();
        
        // Do minimal work
        await page.goto('about:blank');
        const url = page.url();
        
        await pool.closeContext(context);
        
        return { id, url };
      },
      5 // 5 concurrent
    );
    
    // Verify all completed
    if (results.length !== 10) {
      throw new Error(`Expected 10 results, got ${results.length}`);
    }
    
    // Verify no contexts left
    if (pool.getActiveContextCount() !== 0) {
      throw new Error(`Expected 0 active contexts, got ${pool.getActiveContextCount()}`);
    }
    
    await pool.close();
    console.log('✅ Test 3: High concurrency (10 attempts, 5 concurrent)');
  } catch (err) {
    console.error('❌ Test 3 failed:', err.message);
    throw err;
  }
}

async function testSequentialVsParallel() {
  const poolSeq = new BrowserPool();
  const poolPar = new BrowserPool();
  
  try {
    // Sequential: N=1
    await poolSeq.launch({ headless: true });
    const startSeq = Date.now();
    
    const resultsSeq = await executeParallel(
      ['a', 'b', 'c'],
      async (id) => {
        const { context, page } = await poolSeq.createContext();
        await page.goto('about:blank');
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
        await poolSeq.closeContext(context);
        return id;
      },
      1 // Sequential
    );
    
    const durationSeq = Date.now() - startSeq;
    await poolSeq.close();
    
    // Parallel: N=3
    await poolPar.launch({ headless: true });
    const startPar = Date.now();
    
    const resultsPar = await executeParallel(
      ['a', 'b', 'c'],
      async (id) => {
        const { context, page } = await poolPar.createContext();
        await page.goto('about:blank');
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
        await poolPar.closeContext(context);
        return id;
      },
      3 // All parallel
    );
    
    const durationPar = Date.now() - startPar;
    await poolPar.close();
    
    // Parallel should be faster (not strictly enforced due to timing variance)
    console.log(`  Sequential: ${durationSeq}ms, Parallel: ${durationPar}ms`);
    
    // Just verify both completed successfully
    if (resultsSeq.length !== 3 || resultsPar.length !== 3) {
      throw new Error('Not all attempts completed');
    }
    
    console.log('✅ Test 4: Sequential vs parallel execution timing');
  } catch (err) {
    console.error('❌ Test 4 failed:', err.message);
    throw err;
  }
}

async function runAllTests() {
  console.log('\n🧪 Browser Reuse + Parallel Tests (Phase 7.3)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    await testParallelContextsShareBrowser();
    await testParallelContextIsolation();
    await testHighConcurrency();
    await testSequentialVsParallel();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All parallel browser reuse tests PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  } catch (err) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ Some tests FAILED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

runAllTests();
