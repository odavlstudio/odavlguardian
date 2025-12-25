/**
 * Phase 7.4: Early Exit Tests
 * 
 * Verify early exit when target will never appear
 */

const { AttemptEngine } = require('../src/guardian/attempt-engine');
const { chromium } = require('playwright');
const { registerAttempt } = require('../src/guardian/attempt-registry');

async function testEarlyExitOnMissingElement() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Simple page without target element
    await page.goto('data:text/html,<html><body><h1>Page</h1><p>Content</p></body></html>');
    
    // Register attempt definition that waits for non-existent element
    const attemptDef = {
      id: 'test-wait',
      name: 'Test Wait',
      goal: 'Test early exit',
      baseSteps: [
        { id: 'wait_missing', type: 'waitFor', target: '.never-exists', timeout: 2000 }
      ],
      successConditions: [
        { type: 'selector', target: '.never-exists' }
      ]
    };
    registerAttempt(attemptDef);
    
    const engine = new AttemptEngine({ attemptId: 'test-wait', timeout: 3000 });
    
    const startTime = Date.now();
    const result = await engine.executeAttempt(page, 'test-wait', 'https://example.com', null, null);
    const duration = Date.now() - startTime;
    
    // Should fail (element not found)
    if (result.outcome !== 'FAILURE') {
      throw new Error(`Expected FAILURE, got: ${result.outcome}`);
    }
    
    // Should exit relatively quickly (not wait full timeout for all retries)
    if (duration > 6000) {
      throw new Error(`Took too long: ${duration}ms (expected < 6000ms)`);
    }
    
    // Error message should indicate early exit
    if (result.error && result.error.includes('DOM settled')) {
      console.log(`  Early exit reason detected: ${result.error}`);
    }
    
    await browser.close();
    console.log(`✅ Test 1: Early exit on missing element (${duration}ms)`);
  } catch (err) {
    await browser.close();
    console.error('❌ Test 1 failed:', err.message);
    throw err;
  }
}

async function testNormalWaitWhenElementAppears() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Page where element will appear
    await page.goto('data:text/html,<html><body><div id="target" style="display:block">Target</div></body></html>');
    
    const attemptDef = {
      id: 'test-wait-exists',
      name: 'Test Wait Exists',
      goal: 'Test normal wait',
      baseSteps: [
        { id: 'wait_target', type: 'waitFor', target: '#target', timeout: 2000 }
      ],
      successConditions: [
        { type: 'selector', target: '#target' }
      ]
    };
    registerAttempt(attemptDef);
    
    const engine = new AttemptEngine({ attemptId: 'test-wait-exists', timeout: 3000 });
    
    const startTime = Date.now();
    const result = await engine.executeAttempt(page, 'test-wait-exists', 'https://example.com', null, null);
    const duration = Date.now() - startTime;
    
    // Should succeed quickly
    if (result.outcome !== 'SUCCESS') {
      throw new Error(`Expected SUCCESS, got: ${result.outcome}`);
    }
    
    // Should be fast (element already exists)
    if (duration > 3000) {
      throw new Error(`Took too long: ${duration}ms`);
    }
    
    await browser.close();
    console.log(`✅ Test 2: Normal wait succeeds when element present (${duration}ms)`);
  } catch (err) {
    await browser.close();
    console.error('❌ Test 2 failed:', err.message);
    throw err;
  }
}

async function testShortTimeoutForRepeatedLookups() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Page without target
    await page.goto('data:text/html,<html><body><p>No target</p></body></html>');
    
    const attemptDef = {
      id: 'test-repeated',
      name: 'Test Repeated',
      goal: 'Test repeated lookups',
      baseSteps: [
        { id: 'wait_first', type: 'waitFor', target: '.missing-1', timeout: 1500 },
        { id: 'wait_second', type: 'waitFor', target: '.missing-2', timeout: 1500 }
      ],
      successConditions: [
        { type: 'selector', target: '.missing-2' }
      ]
    };
    registerAttempt(attemptDef);
    
    const engine = new AttemptEngine({ attemptId: 'test-repeated', timeout: 5000 });
    
    const startTime = Date.now();
    const result = await engine.executeAttempt(page, 'test-repeated', 'https://example.com', null, null);
    const duration = Date.now() - startTime;
    
    // Should fail
    if (result.outcome !== 'FAILURE') {
      throw new Error(`Expected FAILURE, got: ${result.outcome}`);
    }
    
    // With retries, should still finish in reasonable time
    // 2 steps × 2 attempts × ~1.5s = ~6s max
    if (duration > 8000) {
      throw new Error(`Took too long: ${duration}ms (expected < 8000ms)`);
    }
    
    await browser.close();
    console.log(`✅ Test 3: Repeated lookups with adaptive timeout (${duration}ms)`);
  } catch (err) {
    await browser.close();
    console.error('❌ Test 3 failed:', err.message);
    throw err;
  }
}

async function runAllTests() {
  console.log('\n🧪 Early Exit Tests (Phase 7.4)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    await testEarlyExitOnMissingElement();
    await testNormalWaitWhenElementAppears();
    await testShortTimeoutForRepeatedLookups();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All early exit tests PASSED');
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
