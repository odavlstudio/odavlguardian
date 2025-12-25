/**
 * Phase 7.4: Smart Skip Tests
 * 
 * Verify prerequisite checks skip impossible attempts early
 */

const { checkPrerequisites, ATTEMPT_PREREQUISITES } = require('../src/guardian/prerequisite-checker');
const { chromium } = require('playwright');

async function testCheckoutPrerequisiteFails() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to page without checkout link
    await page.goto('data:text/html,<html><body><h1>Simple Page</h1><p>No checkout here</p></body></html>');
    
    // Check prerequisites
    const result = await checkPrerequisites(page, 'checkout', 2000);
    
    if (result.canProceed) {
      throw new Error('Should not proceed - no checkout link found');
    }
    
    if (!result.reason) {
      throw new Error('Should have skip reason');
    }
    
    if (!result.reason.includes('checkout') && !result.reason.includes('cart')) {
      throw new Error(`Unexpected skip reason: ${result.reason}`);
    }
    
    await browser.close();
    console.log('✅ Test 1: Checkout prerequisite fails when no link present');
  } catch (err) {
    await browser.close();
    console.error('❌ Test 1 failed:', err.message);
    throw err;
  }
}

async function testLoginPrerequisiteFails() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to page without login link
    await page.goto('data:text/html,<html><body><h1>No Login</h1></body></html>');
    
    // Check prerequisites
    const result = await checkPrerequisites(page, 'login', 2000);
    
    if (result.canProceed) {
      throw new Error('Should not proceed - no login link found');
    }
    
    if (!result.reason.includes('login')) {
      throw new Error(`Unexpected skip reason: ${result.reason}`);
    }
    
    await browser.close();
    console.log('✅ Test 2: Login prerequisite fails when no link present');
  } catch (err) {
    await browser.close();
    console.error('❌ Test 2 failed:', err.message);
    throw err;
  }
}

async function testNewsletterPrerequisitePasses() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to page WITH email input
    await page.goto('data:text/html,<html><body><h1>Newsletter</h1><input type="email" placeholder="Your email"></body></html>');
    
    // Check prerequisites
    const result = await checkPrerequisites(page, 'newsletter_signup', 2000);
    
    if (!result.canProceed) {
      throw new Error('Should proceed - email input is present');
    }
    
    if (result.reason !== null) {
      throw new Error('Should not have skip reason when prerequisites met');
    }
    
    await browser.close();
    console.log('✅ Test 3: Newsletter prerequisite passes when email input present');
  } catch (err) {
    await browser.close();
    console.error('❌ Test 3 failed:', err.message);
    throw err;
  }
}

async function testNoPrerequisitesAlwaysPasses() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to simple page
    await page.goto('data:text/html,<html><body><h1>Simple</h1></body></html>');
    
    // Check prerequisites for attempt with no prereqs defined
    const result = await checkPrerequisites(page, 'contact_form', 2000);
    
    if (!result.canProceed) {
      throw new Error('Should proceed - no prerequisites defined');
    }
    
    await browser.close();
    console.log('✅ Test 4: Attempts without prerequisites always pass');
  } catch (err) {
    await browser.close();
    console.error('❌ Test 4 failed:', err.message);
    throw err;
  }
}

async function testCheckoutPrerequisitePasses() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to page WITH checkout link
    await page.goto('data:text/html,<html><body><h1>Shop</h1><a href="/checkout">Checkout</a></body></html>');
    
    // Check prerequisites
    const result = await checkPrerequisites(page, 'checkout', 2000);
    
    if (!result.canProceed) {
      throw new Error(`Should proceed - checkout link is present. Reason: ${result.reason}`);
    }
    
    await browser.close();
    console.log('✅ Test 5: Checkout prerequisite passes when link present');
  } catch (err) {
    await browser.close();
    console.error('❌ Test 5 failed:', err.message);
    throw err;
  }
}

async function runAllTests() {
  console.log('\n🧪 Smart Skip Tests (Phase 7.4)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    await testCheckoutPrerequisiteFails();
    await testLoginPrerequisiteFails();
    await testNewsletterPrerequisitePasses();
    await testNoPrerequisitesAlwaysPasses();
    await testCheckoutPrerequisitePasses();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All smart skip tests PASSED');
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
