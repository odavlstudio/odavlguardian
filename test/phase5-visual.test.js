/**
 * Phase 5: Visual & Behavioral Reality Tests
 * 
 * Comprehensive tests for:
 * - Visual diff detection (deterministic PNG comparison)
 * - Behavioral signal detection (element visibility, CTA accessibility, layout shifts)
 * - Failure taxonomy integration (VISUAL break type)
 * - Breakage intelligence (visual-specific messaging)
 * - Policy gates (visual thresholds)
 * 
 * NO AI. Pure deterministic logic. Test-proven end-to-end.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const { VisualDiffEngine } = require('../src/guardian/visual-diff');
const { BehavioralSignalDetector } = require('../src/guardian/behavioral-signals');
const GuardianScreenshot = require('../src/guardian/screenshot');
const { classifyBreakType, BREAK_TYPES } = require('../src/guardian/failure-taxonomy');
const { analyzeFailure } = require('../src/guardian/breakage-intelligence');
const { evaluatePolicy } = require('../src/guardian/policy');

let testCount = 0;
let passCount = 0;

async function test(name, fn) {
  testCount++;
  try {
    await fn();
    passCount++;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${err.message}`);
    throw err;
  }
}

async function runAllTests() {
  console.log('\n=== Phase 5: Visual & Behavioral Reality Tests ===\n');

  let browser;

  try {
    browser = await chromium.launch();

    // ==================== Visual Diff Engine Tests ====================
    console.log('Visual Diff Engine Tests:');

    await test('should detect no diff when baseline and current are identical', () => {
      const visualDiff = new VisualDiffEngine({
        baselineDir: path.join(__dirname, '../test-artifacts/visual-baselines'),
        tolerance: 0
      });

      const testDir = path.join(__dirname, '../test-artifacts/visual-test-identical');
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
      
      const testContent = Buffer.from('IDENTICAL_PNG_CONTENT_FOR_TESTING');
      const baselineFile = path.join(testDir, 'baseline.png');
      const currentFile = path.join(testDir, 'current.png');
      
      fs.writeFileSync(baselineFile, testContent);
      fs.writeFileSync(currentFile, testContent);

      const result = visualDiff.comparePNGs(baselineFile, currentFile);

      assert(result, 'Result should exist');
      assert.equal(result.hasDiff, false, 'Should not detect diff');
      assert.equal(result.percentChange, 0, 'Percent change should be 0');
      assert.equal(result.severity, 'INFO', 'Severity should be INFO');
    });

    await test('should detect diff when baseline and current differ', () => {
      const visualDiff = new VisualDiffEngine({
        baselineDir: path.join(__dirname, '../test-artifacts/visual-baselines')
      });

      const testDir = path.join(__dirname, '../test-artifacts/visual-test-different');
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
      
      const baselineFile = path.join(testDir, 'baseline.png');
      const currentFile = path.join(testDir, 'current.png');
      
      fs.writeFileSync(baselineFile, Buffer.from('A'.repeat(1000)));
      fs.writeFileSync(currentFile, Buffer.from('B'.repeat(1200)));

      const result = visualDiff.comparePNGs(baselineFile, currentFile);

      assert(result, 'Result should exist');
      assert.equal(result.hasDiff, true, 'Should detect diff');
      assert(result.percentChange > 0, 'Percent change should be > 0');
    });

    await test('should classify severity: small diff as INFO', () => {
      const visualDiff = new VisualDiffEngine();
      const testDir = path.join(__dirname, '../test-artifacts/visual-test-small');
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
      
      const baselineFile = path.join(testDir, 'baseline.png');
      const currentFile = path.join(testDir, 'current.png');
      
      fs.writeFileSync(baselineFile, Buffer.from('X'.repeat(1000)));
      fs.writeFileSync(currentFile, Buffer.from('X'.repeat(1080)));

      const result = visualDiff.comparePNGs(baselineFile, currentFile);
      assert.equal(result.severity, 'INFO', 'Small diff should be INFO');
    });

    await test('should classify severity: medium diff as WARNING', () => {
      const visualDiff = new VisualDiffEngine();
      const testDir = path.join(__dirname, '../test-artifacts/visual-test-medium');
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
      
      const baselineFile = path.join(testDir, 'baseline.png');
      const currentFile = path.join(testDir, 'current.png');
      
      fs.writeFileSync(baselineFile, Buffer.from('Y'.repeat(1000)));
      fs.writeFileSync(currentFile, Buffer.from('Y'.repeat(1150)));

      const result = visualDiff.comparePNGs(baselineFile, currentFile);
      assert.equal(result.severity, 'WARNING', 'Medium diff should be WARNING');
    });

    await test('should classify severity: large diff as CRITICAL', () => {
      const visualDiff = new VisualDiffEngine();
      const testDir = path.join(__dirname, '../test-artifacts/visual-test-large');
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
      
      const baselineFile = path.join(testDir, 'baseline.png');
      const currentFile = path.join(testDir, 'current.png');
      
      fs.writeFileSync(baselineFile, Buffer.from('Z'.repeat(1000)));
      fs.writeFileSync(currentFile, Buffer.from('Z'.repeat(1300)));

      const result = visualDiff.comparePNGs(baselineFile, currentFile);
      assert.equal(result.severity, 'CRITICAL', 'Large diff should be CRITICAL');
    });

    // ==================== Behavioral Signal Detection Tests ====================
    console.log('\nBehavioral Signal Detection Tests:');

    await test('should detect visible elements correctly', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const detector = new BehavioralSignalDetector();

      await page.setContent(`
        <div id="visible">I am visible</div>
        <div id="hidden" style="visibility: hidden;">I am hidden</div>
      `);

      const visibleResult = await detector.checkElementVisibility(page, '#visible');
      const hiddenResult = await detector.checkElementVisibility(page, '#hidden');

      assert.equal(visibleResult.visible, true, 'Visible element should be detected');
      assert.equal(hiddenResult.visible, false, 'Hidden element should not be detected');
      assert(hiddenResult.signal, 'Should have a signal for hidden element');

      await context.close();
    });

    await test('should detect disabled CTAs', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const detector = new BehavioralSignalDetector();

      await page.setContent(`
        <button id="btn-enabled">Click me</button>
        <button id="btn-disabled" disabled>Cannot click</button>
      `);

      const enabledResult = await detector.checkCTAAccessibility(page, '#btn-enabled');
      const disabledResult = await detector.checkCTAAccessibility(page, '#btn-disabled');

      assert.equal(enabledResult.clickable, true, 'Enabled button should be clickable');
      assert.equal(disabledResult.clickable, false, 'Disabled button should not be clickable');
      assert(disabledResult.signal, 'Should have signal for disabled CTA');

      await context.close();
    });

    await test('should audit comprehensive behavior signals', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const detector = new BehavioralSignalDetector();

      await page.setContent(`
        <form id="contact-form">
          <input id="name" type="text" placeholder="Name">
          <button id="submit" type="submit">Submit</button>
        </form>
      `);

      const config = {
        criticalElements: ['#contact-form', '#name'],
        criticalCTAs: ['#submit']
      };

      const report = await detector.auditBehavior(page, config);

      assert(report, 'Report should exist');
      assert(Array.isArray(report.signals), 'Signals should be an array');
      assert.equal(typeof report.criticalCount, 'number', 'criticalCount should be number');
      assert.equal(typeof report.warningCount, 'number', 'warningCount should be number');

      await context.close();
    });

    // ==================== Failure Taxonomy Integration Tests ====================
    console.log('\nFailure Taxonomy Integration Tests:');

    await test('should classify visual diff as VISUAL break type', () => {
      const item = {
        outcome: 'FAILURE',
        visualDiff: {
          hasDiff: true,
          percentChange: 20,
          severity: 'WARNING'
        }
      };

      const breakType = classifyBreakType(item);
      assert.equal(breakType, BREAK_TYPES.VISUAL, 'Should classify as VISUAL');
    });

    await test('should prioritize visual diff detection', () => {
      const item = {
        outcome: 'FAILURE',
        visualDiff: {
          hasDiff: true,
          percentChange: 30,
          severity: 'CRITICAL'
        },
        error: 'NAVIGATION_ERROR',
        validators: [{ failed: true }]
      };

      const breakType = classifyBreakType(item);
      assert.equal(breakType, BREAK_TYPES.VISUAL, 'Should prioritize visual diff');
    });

    await test('should detect behavioral signals in taxonomy', () => {
      const item = {
        outcome: 'FAILURE',
        behavioralSignals: [
          { type: 'ELEMENT_VISIBILITY', status: 'HIDDEN' },
          { type: 'CTA_ACCESSIBILITY', status: 'DISABLED' }
        ]
      };

      const breakType = classifyBreakType(item);
      assert.equal(breakType, BREAK_TYPES.VISUAL, 'Should detect behavioral signals');
    });

    // ==================== Breakage Intelligence Tests ====================
    console.log('\nBreakage Intelligence Tests:');

    await test('should generate visual-specific "Why It Matters"', () => {
      const item = {
        attemptId: 'visual-test-1',
        attemptName: 'Homepage Visual Regression',
        outcome: 'FAILURE',
        visualDiff: {
          hasDiff: true,
          percentChange: 28,
          severity: 'CRITICAL',
          diffRegions: ['LAYOUT_CHANGE', 'ELEMENT_MISSING']
        }
      };

      const intelligence = analyzeFailure(item, false);

      assert(intelligence, 'Intelligence should exist');
      assert.equal(intelligence.breakType, BREAK_TYPES.VISUAL);
      assert(Array.isArray(intelligence.whyItMatters), 'whyItMatters should be array');
      assert(intelligence.whyItMatters.some(w => w.includes('Visual regression')), 'Should include visual regression message');
    });

    await test('should generate visual-specific "Top Actions"', () => {
      const item = {
        attemptId: 'visual-test-2',
        attemptName: 'Checkout Page Visual Regression',
        outcome: 'FAILURE',
        visualDiff: {
          hasDiff: true,
          percentChange: 15,
          severity: 'WARNING'
        }
      };

      const intelligence = analyzeFailure(item, false);

      assert(Array.isArray(intelligence.topActions), 'topActions should be array');
      assert(intelligence.topActions.some(a => a.includes('baseline screenshot')), 'Should include screenshot comparison action');
    });

    await test('should include visual diff metadata in intelligence', () => {
      const item = {
        attemptId: 'visual-test-3',
        attemptName: 'Form Visual Test',
        outcome: 'FAILURE',
        visualDiff: {
          hasDiff: true,
          percentChange: 12,
          severity: 'WARNING',
          diffRegions: ['SPACING_CHANGE']
        }
      };

      const intelligence = analyzeFailure(item, false);

      assert(intelligence.visualDiff, 'Should include visualDiff');
      assert.equal(intelligence.visualDiff.hasDiff, true);
      assert.equal(intelligence.visualDiff.percentChange, 12);
    });

    // ==================== Policy Gates Tests ====================
    console.log('\nPolicy Gates Tests:');

    await test('should fail on CRITICAL visual diff', () => {
      const snapshot = {
        intelligence: {
          failures: [
            {
              name: 'Hero Section',
              breakType: BREAK_TYPES.VISUAL,
              severity: 'CRITICAL',
              visualDiff: {
                hasDiff: true,
                percentChange: 35
              }
            }
          ]
        }
      };

      const policy = {
        visualGates: {
          CRITICAL: 0,
          WARNING: 999,
          maxDiffPercent: 25
        }
      };

      const result = evaluatePolicy(snapshot, policy);

      assert.equal(result.passed, false, 'Should fail');
      assert(result.exitCode > 0, 'Exit code should be > 0');
      assert(result.reasons.some(r => r.includes('CRITICAL diff')), 'Should mention CRITICAL diff');
    });

    await test('should pass when visual diffs within limits', () => {
      const snapshot = {
        intelligence: {
          failures: [
            {
              name: 'Minor Spacing',
              breakType: BREAK_TYPES.VISUAL,
              severity: 'INFO',
              visualDiff: {
                hasDiff: true,
                percentChange: 5
              }
            }
          ]
        }
      };

      const policy = {
        visualGates: {
          CRITICAL: 0,
          WARNING: 999,
          maxDiffPercent: 25
        }
      };

      const result = evaluatePolicy(snapshot, policy);

      assert.equal(result.passed, true, 'Should pass');
      assert.equal(result.exitCode, 0, 'Exit code should be 0');
    });

    // ==================== Screenshot Normalization Tests ====================
    console.log('\nScreenshot Normalization Tests:');

    await test('should normalize viewport to 1280x720 by default', () => {
      const screenshot = new GuardianScreenshot();
      assert.deepEqual(screenshot.normalizedViewport, { width: 1280, height: 720 });
    });

    await test('should apply viewport normalization when capturing', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const screenshot = new GuardianScreenshot();
      await page.setContent('<h1>Test Page</h1>');
      await screenshot.normalizeViewport(page);

      const size = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));

      assert.equal(size.width, 1280, 'Width should be 1280');
      assert.equal(size.height, 720, 'Height should be 720');

      await context.close();
    });

    // Print summary
    console.log(`\n=== Phase 5 Test Summary ===`);
    console.log(`Total: ${testCount} | Passed: ${passCount} | Failed: ${testCount - passCount}`);

    if (passCount === testCount) {
      console.log('\n✅ Phase 5 Visual & Behavioral Tests LOCKED ✅\n');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    if (browser) await browser.close();
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runAllTests();
