/**
 * Phase 7.3: Browser Reuse Tests
 * 
 * Verify single browser launch per run with context-based isolation
 */

const { BrowserPool } = require('../src/guardian/browser-pool');
const { chromium } = require('playwright');

async function testBrowserLaunchedOnce() {
  const pool = new BrowserPool();
  
  try {
    await pool.launch({ headless: true });
    
    // Verify browser is launched
    if (!pool.isLaunched()) {
      throw new Error('Browser should be launched');
    }
    
    // Try launching again - should not fail or launch second browser
    await pool.launch({ headless: true });
    
    // Should still have only one browser
    if (!pool.isLaunched()) {
      throw new Error('Browser should still be launched');
    }
    
    await pool.close();
    console.log('✅ Test 1: Browser launched once per run');
  } catch (err) {
    console.error('❌ Test 1 failed:', err.message);
    throw err;
  }
}

async function testMultipleContextsCreated() {
  const pool = new BrowserPool();
  
  try {
    await pool.launch({ headless: true });
    
    // Create 3 contexts (simulating 3 attempts)
    const context1 = await pool.createContext();
    const context2 = await pool.createContext();
    const context3 = await pool.createContext();
    
    // Verify all have context and page
    if (!context1.context || !context1.page) {
      throw new Error('Context 1 should have context and page');
    }
    if (!context2.context || !context2.page) {
      throw new Error('Context 2 should have context and page');
    }
    if (!context3.context || !context3.page) {
      throw new Error('Context 3 should have context and page');
    }
    
    // Verify active context count
    if (pool.getActiveContextCount() !== 3) {
      throw new Error(`Expected 3 active contexts, got ${pool.getActiveContextCount()}`);
    }
    
    // Close contexts
    await pool.closeContext(context1.context);
    await pool.closeContext(context2.context);
    await pool.closeContext(context3.context);
    
    // Verify count is 0
    if (pool.getActiveContextCount() !== 0) {
      throw new Error(`Expected 0 active contexts after cleanup, got ${pool.getActiveContextCount()}`);
    }
    
    await pool.close();
    console.log('✅ Test 2: Multiple contexts created from single browser');
  } catch (err) {
    console.error('❌ Test 2 failed:', err.message);
    throw err;
  }
}

async function testContextsAreIsolated() {
  const pool = new BrowserPool();
  
  try {
    await pool.launch({ headless: true });
    
    // Create two contexts
    const ctx1 = await pool.createContext();
    const ctx2 = await pool.createContext();
    
    // Navigate to different "pages" (data URLs with different content)
    await ctx1.page.goto('data:text/html,<html><body>Context 1</body></html>');
    await ctx2.page.goto('data:text/html,<html><body>Context 2</body></html>');
    
    // Verify each context has its own content
    const content1 = await ctx1.page.textContent('body');
    const content2 = await ctx2.page.textContent('body');
    
    if (content1 !== 'Context 1') {
      throw new Error(`Context 1 should have 'Context 1', got: ${content1}`);
    }
    
    if (content2 !== 'Context 2') {
      throw new Error(`Context 2 should have 'Context 2', got: ${content2}`);
    }
    
    // Navigate ctx1 again and verify ctx2 is unchanged
    await ctx1.page.goto('data:text/html,<html><body>Context 1 Updated</body></html>');
    const content1Updated = await ctx1.page.textContent('body');
    const content2After = await ctx2.page.textContent('body');
    
    if (content1Updated !== 'Context 1 Updated') {
      throw new Error('Context 1 update failed');
    }
    
    if (content2After !== 'Context 2') {
      throw new Error('Context 2 should be unchanged');
    }
    
    await pool.closeContext(ctx1.context);
    await pool.closeContext(ctx2.context);
    await pool.close();
    
    console.log('✅ Test 3: Contexts are isolated (independent navigation)');
  } catch (err) {
    console.error('❌ Test 3 failed:', err.message);
    throw err;
  }
}

async function testCookieIsolation() {
  const pool = new BrowserPool();
  
  try {
    await pool.launch({ headless: true });
    
    // Create two contexts
    const ctx1 = await pool.createContext();
    const ctx2 = await pool.createContext();
    
    // Set cookie in context 1
    await ctx1.context.addCookies([{
      name: 'test-cookie',
      value: 'context-1',
      domain: 'example.com',
      path: '/'
    }]);
    
    // Get cookies from both contexts
    const cookies1 = await ctx1.context.cookies('https://example.com');
    const cookies2 = await ctx2.context.cookies('https://example.com');
    
    // Context 1 should have the cookie
    if (cookies1.length === 0 || cookies1[0].value !== 'context-1') {
      throw new Error('Context 1 should have the cookie');
    }
    
    // Context 2 should NOT have the cookie
    if (cookies2.length > 0) {
      throw new Error(`Context 2 should not have cookies from context 1. Got: ${cookies2.length}`);
    }
    
    await pool.closeContext(ctx1.context);
    await pool.closeContext(ctx2.context);
    await pool.close();
    
    console.log('✅ Test 4: Cookies are isolated between contexts');
  } catch (err) {
    console.error('❌ Test 4 failed:', err.message);
    throw err;
  }
}

async function testEmptyPoolHandling() {
  const pool = new BrowserPool();
  
  try {
    // Try to create context before launch
    let errorThrown = false;
    try {
      await pool.createContext();
    } catch (err) {
      if (err.message.includes('Browser not launched')) {
        errorThrown = true;
      }
    }
    
    if (!errorThrown) {
      throw new Error('Should throw error when creating context before launch');
    }
    
    // Now launch and it should work
    await pool.launch({ headless: true });
    const ctx = await pool.createContext();
    
    if (!ctx.context || !ctx.page) {
      throw new Error('Context should be created after launch');
    }
    
    await pool.closeContext(ctx.context);
    await pool.close();
    
    console.log('✅ Test 5: Empty pool handling (error before launch)');
  } catch (err) {
    console.error('❌ Test 5 failed:', err.message);
    throw err;
  }
}

async function runAllTests() {
  console.log('\n🧪 Browser Reuse Tests (Phase 7.3)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    await testBrowserLaunchedOnce();
    await testMultipleContextsCreated();
    await testContextsAreIsolated();
    await testCookieIsolation();
    await testEmptyPoolHandling();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All browser reuse tests PASSED');
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
