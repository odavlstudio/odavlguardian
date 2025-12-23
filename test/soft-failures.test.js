/**
 * Phase 2: Soft Failure Detection Tests
 * Tests prove that validators detect soft failures that Playwright would miss
 */

const assert = require('assert');
const { AttemptEngine } = require('../src/guardian/attempt-engine');
const { GuardianBrowser } = require('../src/guardian/browser');
const { createSoftFailureTestServer } = require('./soft-failure-test-server');
const { analyzer } = require('../src/guardian/validators');

console.log(`\n🧪 Phase 2: Soft Failure Detection Tests`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

let server = null;
let port = null;
let testsPassed = 0;
let testsFailed = 0;

async function startTestServer() {
  const app = createSoftFailureTestServer();
  return new Promise((resolve) => {
    const srv = app.listen(0, 'localhost', () => {
      port = srv.address().port;
      server = srv;
      console.log(`✅ Test server running at http://localhost:${port}`);
      resolve();
    });
  });
}

function stopTestServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log(`✅ Test server stopped`);
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function runTest(name, testFn) {
  try {
    console.log(`\n📋 ${name}`);
    await testFn();
    console.log(`✅ ${name} passed`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ ${name} failed: ${err.message}`);
    testsFailed++;
  }
}

// Test 1: Validators are executed and recorded in snapshot
async function test1_ValidatorsExecuted() {
  const browser = new GuardianBrowser();
  try {
    await browser.launch(30000);

    const engine = new AttemptEngine({ attemptId: 'contact_form' });

    // Validators for contact form
    const validators = [
      { type: 'elementVisible', selector: '[data-testid="success"], [data-guardian="success"]' },
      { type: 'pageContainsAnyText', textList: ['success', 'submitted'] }
    ];

    const result = await engine.executeAttempt(
      browser.page,
      'contact_form',
      `http://localhost:${port}/contact`,
      null,
      validators
    );

    assert(result.validators, 'validators array should exist in result');
    assert(Array.isArray(result.validators), 'validators should be an array');
    assert(result.validators.length > 0, 'validators should be executed');

    // Check validator results
    result.validators.forEach(v => {
      assert(v.id, 'validator should have id');
      assert(v.type, 'validator should have type');
      assert(['PASS', 'FAIL', 'WARN'].includes(v.status), 'validator should have valid status');
      assert(v.message, 'validator should have message');
    });

    console.log(`   • Executed ${result.validators.length} validators`);
    console.log(`   • Validator results recorded in snapshot`);

  } finally {
    await browser.close();
  }
}

// Test 2: Soft failure detected when form succeeds but error indicator present
async function test2_SoftFailureDetection_ErrorPresent() {
  const browser = new GuardianBrowser();
  try {
    await browser.launch(30000);

    const engine = new AttemptEngine({ attemptId: 'contact_form' });

    // Try to submit contact form with error state
    const validators = [
      { type: 'elementNotVisible', selector: '.error, [role="alert"]' } // Should FAIL if error appears
    ];

    // Manually navigate and trigger error state
    await browser.page.goto(`http://localhost:${port}/contact?error=true`);
    // Fill form fields
    await browser.page.fill('input[name="name"]', 'Test User');
    await browser.page.fill('input[name="email"]', 'test@example.com');
    await browser.page.fill('textarea[name="message"]', 'Test message');
    // Click submit
    await browser.page.click('button[type="submit"]');
    await browser.page.waitForTimeout(1000); // Wait for form submission handler to execute

    // Run validators on this error state
    const validatorResults = await require('../src/guardian/validators').runValidators(
      validators,
      { page: browser.page, consoleMessages: [] }
    );

    // Check that validator detected the error
    const errorValidator = validatorResults.find(v => v.type === 'elementNotVisible');
    assert(errorValidator, 'error validator should exist');
    assert(errorValidator.status === 'FAIL', 'validator should FAIL when error is present');

    console.log(`   • Error indicator detected by validator`);
    console.log(`   • Soft failure flagged: ${errorValidator.message}`);

  } finally {
    await browser.close();
  }
}

// Test 3: Language switch validator detects no-op language change
async function test3_LanguageSwitchNoOp() {
  const browser = new GuardianBrowser();
  try {
    await browser.launch(30000);

    // Navigate to broken language switcher
    await browser.page.goto(`http://localhost:${port}/language-no-switch`);

    // Click to switch language
    await browser.page.click('[data-guardian="lang-toggle"]');
    await browser.page.selectOption('#lang-select', 'de');
    await browser.page.waitForTimeout(500);

    // Now validate - language should be DE
    const langValidator = { type: 'htmlLangAttribute', lang: 'de' };

    const validatorResults = await require('../src/guardian/validators').runValidators(
      [langValidator],
      { page: browser.page, consoleMessages: [] }
    );

    // Should FAIL because language is still EN, not DE
    const result = validatorResults[0];
    assert(result.status === 'FAIL', `Language validator should FAIL (got ${result.status})`);
    console.log(`   • Language remained EN (soft failure detected)`);
    console.log(`   • Validator message: ${result.message}`);

  } finally {
    await browser.close();
  }
}

// Test 4: Silent form submission (no success or error) is flagged as soft failure
async function test4_SilentFormSubmission() {
  const browser = new GuardianBrowser();
  try {
    await browser.launch(30000);

    // Navigate to form with silent failure
    await browser.page.goto(`http://localhost:${port}/contact-silent-fail`);

    // Submit form
    await browser.page.fill('input[data-testid="name"]', 'Test');
    await browser.page.fill('input[data-testid="email"]', 'test@example.com');
    await browser.page.fill('textarea[data-testid="message"]', 'Test message');
    await browser.page.click('button[type="submit"]');
    await browser.page.waitForTimeout(500);

    // Validators that would catch this
    const validators = [
      { type: 'elementVisible', selector: '[data-testid="success"]' }, // Should FAIL
      { type: 'pageContainsAnyText', textList: ['success', 'submitted', 'thank you'] } // Should FAIL
    ];

    const validatorResults = await require('../src/guardian/validators').runValidators(
      validators,
      { page: browser.page, consoleMessages: [] }
    );

    // Both should FAIL
    const failedValidators = validatorResults.filter(v => v.status === 'FAIL');
    assert(failedValidators.length > 0, 'At least one validator should fail for silent submission');

    console.log(`   • Silent form submission detected`);
    console.log(`   • ${failedValidators.length} validator(s) failed (soft failure)`);

  } finally {
    await browser.close();
  }
}

// Test 5: Soft failure analysis works correctly
async function test5_SoftFailureAnalysis() {
  const validatorResults = [
    { id: 'test1', type: 'elementVisible', status: 'PASS', message: 'Element visible' },
    { id: 'test2', type: 'pageContains', status: 'FAIL', message: 'Text not found' },
    { id: 'test3', type: 'urlMatch', status: 'FAIL', message: 'URL does not match' }
  ];

  const analysis = require('../src/guardian/validators').analyzeSoftFailures(validatorResults);

  assert(analysis.hasSoftFailure === true, 'Should detect soft failure');
  assert(analysis.failureCount === 2, 'Should count 2 failures');
  assert(analysis.warnCount === 0, 'Should count 0 warnings');
  assert(analysis.failedValidators.length === 2, 'Should list failed validators');

  console.log(`   • Analysis detects soft failures: ${analysis.hasSoftFailure}`);
  console.log(`   • Failure count: ${analysis.failureCount}`);
  console.log(`   • Failed validators: ${analysis.failedValidators.map(v => v.id).join(', ')}`);
}

// Test 6: Validators in attempt result are recorded in attempt object
async function test6_ValidatorsInAttemptResult() {
  const browser = new GuardianBrowser();
  try {
    await browser.launch(30000);

    const engine = new AttemptEngine({ attemptId: 'contact_form' });

    const validators = [
      { type: 'elementVisible', selector: '[data-testid="success"]' },
      { type: 'pageContainsAnyText', textList: ['success'] }
    ];

    const result = await engine.executeAttempt(
      browser.page,
      'contact_form',
      `http://localhost:${port}/contact`,
      null,
      validators
    );

    // Result should include validators
    assert(result.validators, 'Result should include validators array');
    assert(result.validators.length === validators.length, `Should have ${validators.length} validator results`);

    // Result should include soft failure count
    assert('softFailures' in result, 'Result should include softFailures');
    assert('failureCount' in result.softFailures, 'softFailures should have failureCount');

    console.log(`   • Validators recorded: ${result.validators.length}`);
    console.log(`   • Soft failure count: ${result.softFailures.failureCount}`);

  } finally {
    await browser.close();
  }
}

// Test 7: Newsletter signup with validators
async function test7_NewsletterSignupValidators() {
  const browser = new GuardianBrowser();
  try {
    await browser.launch(30000);

    const engine = new AttemptEngine({ attemptId: 'newsletter_signup' });

    const validators = [
      { type: 'elementVisible', selector: '[data-testid="signup-success"]' },
      { type: 'elementNotVisible', selector: '.error' }
    ];

    const result = await engine.executeAttempt(
      browser.page,
      'newsletter_signup',
      `http://localhost:${port}/newsletter?success=true`,
      null,
      validators
    );

    // Should succeed and validators should pass
    assert(result.validators.length > 0, 'Should execute validators');

    const passedValidators = result.validators.filter(v => v.status === 'PASS');
    console.log(`   • Validators executed: ${result.validators.length}`);
    console.log(`   • Passed: ${passedValidators.length}`);
    console.log(`   • Soft failure count: ${result.softFailures.failureCount}`);

  } finally {
    await browser.close();
  }
}

// Main test runner
async function main() {
  try {
    await startTestServer();

    await runTest('Test 1: Validators are executed and recorded', test1_ValidatorsExecuted);
    await runTest('Test 2: Soft failure detected (error indicator present)', test2_SoftFailureDetection_ErrorPresent);
    await runTest('Test 3: Language switch no-op detected', test3_LanguageSwitchNoOp);
    await runTest('Test 4: Silent form submission flagged', test4_SilentFormSubmission);
    await runTest('Test 5: Soft failure analysis works correctly', test5_SoftFailureAnalysis);
    await runTest('Test 6: Validators included in attempt result', test6_ValidatorsInAttemptResult);
    await runTest('Test 7: Newsletter signup validators', test7_NewsletterSignupValidators);

    await stopTestServer();

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Tests passed: ${testsPassed}`);
    console.log(`❌ Tests failed: ${testsFailed}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    process.exit(testsFailed > 0 ? 1 : 0);
  } catch (err) {
    console.error(`\n❌ Test suite error: ${err.message}`);
    console.error(err.stack);
    await stopTestServer();
    process.exit(1);
  }
}

main();
