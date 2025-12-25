/**
 * Phase 7.3: Browser Pool Cleanup Tests
 * 
 * Verify deterministic cleanup of contexts and browser
 */

const { BrowserPool } = require('../src/guardian/browser-pool');
const { executeParallel } = require('../src/guardian/parallel-executor');

async function testNormalCleanup() {
  const pool = new BrowserPool();
  
  try {
    await pool.launch({ headless: true });
    
    // Create contexts
    const ctx1 = await pool.createContext();
    const ctx2 = await pool.createContext();
    const ctx3 = await pool.createContext();
    
    if (pool.getActiveContextCount() !== 3) {
      throw new Error('Should have 3 active contexts');
    }
    
    // Close all
    await pool.close();
    
    // Verify all closed
    if (pool.getActiveContextCount() !== 0) {
      throw new Error(`Expected 0 contexts after close, got ${pool.getActiveContextCount()}`);
    }
    
    if (pool.isLaunched()) {
      throw new Error('Browser should not be launched after close');
    }
    
    console.log('✅ Test 1: Normal cleanup closes all contexts and browser');
  } catch (err) {
    console.error('❌ Test 1 failed:', err.message);
    throw err;
  }
}

async function testPartialCleanupThenClose() {
  const pool = new BrowserPool();
  
  try {
    await pool.launch({ headless: true });
    
    // Create 4 contexts
    const ctx1 = await pool.createContext();
    const ctx2 = await pool.createContext();
    const ctx3 = await pool.createContext();
    const ctx4 = await pool.createContext();
    
    if (pool.getActiveContextCount() !== 4) {
      throw new Error('Should have 4 active contexts');
    }
    
    // Close 2 manually
    await pool.closeContext(ctx1.context);
    await pool.closeContext(ctx2.context);
    
    if (pool.getActiveContextCount() !== 2) {
      throw new Error(`Expected 2 contexts after partial cleanup, got ${pool.getActiveContextCount()}`);
    }
    
    // Close pool (should close remaining 2)
    await pool.close();
    
    if (pool.getActiveContextCount() !== 0) {
      throw new Error(`Expected 0 contexts after full close, got ${pool.getActiveContextCount()}`);
    }
    
    console.log('✅ Test 2: Partial cleanup then pool.close() cleans remaining');
  } catch (err) {
    console.error('❌ Test 2 failed:', err.message);
    throw err;
  }
}

async function testFailFastCleanup() {
  const pool = new BrowserPool();
  
  try {
    await pool.launch({ headless: true });
    
    // Simulate multiple attempts where one fails, then verify cleanup
    const attempts = ['a', 'b', 'c'];
    let failureDetected = false;
    
    const results = [];
    for (const id of attempts) {
      const { context, page } = await pool.createContext();
      
      try {
        await page.goto('about:blank');
        
        // Second attempt fails
        if (id === 'b') {
          failureDetected = true;
          throw new Error('Simulated failure');
        }
        
        results.push({ id, outcome: 'SUCCESS' });
      } catch (err) {
        results.push({ id, outcome: 'FAILURE', error: err.message });
      } finally {
        // Always cleanup context
        await pool.closeContext(context);
      }
    }
    
    // Verify failure was detected
    if (!failureDetected) {
      throw new Error('Failure should have been detected');
    }
    
    // Verify all contexts cleaned up despite failure
    if (pool.getActiveContextCount() !== 0) {
      throw new Error(`Expected 0 contexts after attempts with failure, got ${pool.getActiveContextCount()}`);
    }
    
    await pool.close();
    
    console.log(`✅ Test 3: Cleanup with failures (contexts cleaned despite errors)`);
  } catch (err) {
    console.error('❌ Test 3 failed:', err.message);
    throw err;
  }
}

async function testCleanupOnError() {
  const pool = new BrowserPool();
  
  try {
    await pool.launch({ headless: true });
    
    // Create context and simulate error during attempt
    let errorThrown = false;
    try {
      const { context, page } = await pool.createContext();
      
      try {
        await page.goto('about:blank');
        // Simulate error
        throw new Error('Simulated attempt error');
      } finally {
        // Always cleanup context even on error
        await pool.closeContext(context);
      }
    } catch (err) {
      if (err.message === 'Simulated attempt error') {
        errorThrown = true;
      }
    }
    
    if (!errorThrown) {
      throw new Error('Error should have been thrown');
    }
    
    // Verify context was cleaned up despite error
    if (pool.getActiveContextCount() !== 0) {
      throw new Error(`Expected 0 contexts after error cleanup, got ${pool.getActiveContextCount()}`);
    }
    
    await pool.close();
    
    console.log('✅ Test 4: Cleanup on error (finally block ensures cleanup)');
  } catch (err) {
    console.error('❌ Test 4 failed:', err.message);
    throw err;
  }
}

async function testDoubleClose() {
  const pool = new BrowserPool();
  
  try {
    await pool.launch({ headless: true });
    
    const ctx = await pool.createContext();
    
    // Close context twice (should be safe)
    await pool.closeContext(ctx.context);
    await pool.closeContext(ctx.context); // Second close should not throw
    
    // Close pool twice (should be safe)
    await pool.close();
    await pool.close(); // Second close should not throw
    
    console.log('✅ Test 5: Double close is safe (idempotent)');
  } catch (err) {
    console.error('❌ Test 5 failed:', err.message);
    throw err;
  }
}

async function runAllTests() {
  console.log('\n🧪 Browser Pool Cleanup Tests (Phase 7.3)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    await testNormalCleanup();
    await testPartialCleanupThenClose();
    await testFailFastCleanup();
    await testCleanupOnError();
    await testDoubleClose();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All cleanup tests PASSED');
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
