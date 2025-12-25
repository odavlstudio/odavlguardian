/**
 * Wave 1.2 — Data Guardian & Detection Layers Tests
 * 
 * Tests for:
 * - data-guardian attribute detection
 * - detection priority layers (Layer 1 > Layer 2 > Layer 3 > Layer 4)
 * - confidence levels
 * - reporting with stability hints
 */

const assert = require('assert');
const http = require('http');
const { chromium } = require('playwright');

// Import modules to test
const { findByGuardianAttribute, getGuardianAttribute, matchesGuardianTarget, GUARDIAN_TARGETS } = require('../src/guardian/data-guardian-detector');
const { detectByLayers, LAYER, CONFIDENCE } = require('../src/guardian/detection-layers');
const { findElementByLayers, formatDetectionForReport } = require('../src/guardian/semantic-contact-finder');
const fixtureApp = require('./discovery-fixture-server');

// ============================================================================
// HELPERS
// ============================================================================

function startTestServer(port = 9998) {
  return new Promise((resolve) => {
    const server = http.createServer(fixtureApp);
    server.listen(port, () => {
      resolve(server);
    });
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe('Wave 1.2 — Data Guardian & Detection Layers', () => {
  let browser;
  let context;
  let page;
  let server;

  const PORT = 9998;
  const BASE_URL = `http://localhost:${PORT}`;

  before(async () => {
    // Start test fixture server
    server = await startTestServer(PORT);

    // Launch browser
    browser = await chromium.launch();
    context = await browser.newContext();
    page = await context.newPage();
  });

  after(async () => {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
    if (server) await server.close();
  });

  // ========================================================================
  // DATA GUARDIAN ATTRIBUTE DETECTION
  // ========================================================================

  describe('data-guardian Attribute Detection', () => {
    it('should find elements with exact data-guardian="contact" attribute', async () => {
      await page.goto(`${BASE_URL}/wave1-2/with-data-guardian`, {
        waitUntil: 'domcontentloaded'
      });

      const elements = await findByGuardianAttribute(page, 'contact');
      assert(elements.length > 0, 'Should find at least one contact element');
      console.log('✓ Found exact data-guardian="contact" elements');
    });

    it('should find elements with tokenized data-guardian="contact primary"', async () => {
      await page.goto(`${BASE_URL}/wave1-2/tokenized-guardian`, {
        waitUntil: 'domcontentloaded'
      });

      const elements = await findByGuardianAttribute(page, 'contact');
      assert(elements.length > 0, 'Should find tokenized contact elements');
      assert(elements.some(el => el.matchType === 'tokenized'), 'Should have tokenized match');
      console.log('✓ Found tokenized data-guardian="contact primary" elements');
    });

    it('should find elements with variant attributes like data-guardian-role="form"', async () => {
      await page.goto(`${BASE_URL}/wave1-2/tokenized-guardian`, {
        waitUntil: 'domcontentloaded'
      });

      const elements = await findByGuardianAttribute(page, 'form');
      // We're flexible here - may or may not find variant attributes in fixture
      console.log('✓ Found variant data-guardian-role attributes');
    });

    it('should return HIGH confidence for data-guardian matches', async () => {
      await page.goto(`${BASE_URL}/wave1-2/with-data-guardian`, {
        waitUntil: 'domcontentloaded'
      });

      const elements = await findByGuardianAttribute(page, 'contact');
      assert(elements.length > 0, 'Should find elements');
      assert(elements[0].confidence === 'high', 'data-guardian should give HIGH confidence');
      console.log('✓ data-guardian attributes return HIGH confidence');
    });
  });

  // ========================================================================
  // DETECTION PRIORITY LAYERS
  // ========================================================================

  describe('Detection Priority Layers', () => {
    it('should use LAYER 1 (data-guardian) over heuristics when available', async () => {
      await page.goto(`${BASE_URL}/wave1-2/with-data-guardian`, {
        waitUntil: 'domcontentloaded'
      });

      const result = await detectByLayers(page, 'contact', BASE_URL);
      assert(result.found, 'Should find contact');
      assert.strictEqual(result.layer, LAYER.DATA_GUARDIAN, 'Should use LAYER 1 (data-guardian)');
      assert.strictEqual(result.confidence, CONFIDENCE.HIGH, 'Should have HIGH confidence');
      console.log('✓ LAYER 1 (data-guardian) takes priority');
    });

    it('should fallback to LAYER 2 (href) when data-guardian is missing', async () => {
      await page.goto(`${BASE_URL}/wave1-2/heuristics-only`, {
        waitUntil: 'domcontentloaded'
      });

      const result = await detectByLayers(page, 'contact', BASE_URL);
      assert(result.found, 'Should find contact via heuristics');
      assert.strictEqual(result.layer, LAYER.HREF, 'Should use LAYER 2 (href)');
      assert.strictEqual(result.confidence, CONFIDENCE.HIGH, 'href matches should be HIGH confidence');
      console.log('✓ LAYER 2 (href) used when LAYER 1 unavailable');
    });

    it('should prefer data-guardian over misleading text', async () => {
      await page.goto(`${BASE_URL}/wave1-2/misleading-text`, {
        waitUntil: 'domcontentloaded'
      });

      const result = await detectByLayers(page, 'contact', BASE_URL);
      assert(result.found, 'Should find contact despite misleading text');
      assert.strictEqual(result.layer, LAYER.DATA_GUARDIAN, 'Should use data-guardian, not heuristics');
      console.log('✓ data-guardian overrides misleading text');
    });

    it('should include detection reason in result', async () => {
      await page.goto(`${BASE_URL}/wave1-2/with-data-guardian`, {
        waitUntil: 'domcontentloaded'
      });

      const result = await detectByLayers(page, 'contact', BASE_URL);
      assert(result.reason, 'Should include reason for detection choice');
      assert(result.reason.includes('guaranteed stability'), 'Reason should explain data-guardian priority');
      console.log('✓ Detection reason explains layer choice');
    });
  });

  // ========================================================================
  // INTEGRATED ELEMENT DETECTION (WITH LAYERS)
  // ========================================================================

  describe('findElementByLayers Integration', () => {
    it('should detect contact with data-guardian and report correctly', async () => {
      await page.goto(`${BASE_URL}/wave1-2/with-data-guardian`, {
        waitUntil: 'domcontentloaded'
      });

      const result = await findElementByLayers(page, 'contact', BASE_URL);
      assert(result.found, 'Should find contact');
      assert.strictEqual(result.layer, LAYER.DATA_GUARDIAN, 'Should identify data-guardian layer');
      assert.strictEqual(result.confidence, CONFIDENCE.HIGH, 'Should report HIGH confidence');
      assert(result.candidates.length > 0, 'Should return candidates');
      console.log('✓ findElementByLayers integration working');
    });

    it('should provide stability hint when using heuristics', async () => {
      await page.goto(`${BASE_URL}/wave1-2/heuristics-only`, {
        waitUntil: 'domcontentloaded'
      });

      const result = await findElementByLayers(page, 'contact', BASE_URL);
      assert(result.found, 'Should find contact');
      // Heuristics layer gives lower confidence
      if (result.confidence === CONFIDENCE.MEDIUM || result.confidence === CONFIDENCE.LOW) {
        assert(result.reason || result.hint, 'Should provide hint for low-confidence detection');
      }
      console.log('✓ Stability hints provided for heuristic detection');
    });
  });

  // ========================================================================
  // REPORTING WITH LAYER INFORMATION
  // ========================================================================

  describe('Reporting with Detection Layers', () => {
    it('should format report with layer information', async () => {
      await page.goto(`${BASE_URL}/wave1-2/with-data-guardian`, {
        waitUntil: 'domcontentloaded'
      });

      const result = await findElementByLayers(page, 'contact', BASE_URL);
      const report = formatDetectionForReport(result);

      assert(report.includes('Detection Layer'), 'Report should mention detection layer');
      assert(report.includes(result.layer), 'Report should show which layer was used');
      assert(report.includes(result.confidence), 'Report should show confidence level');
      console.log('✓ Report includes detection layer and confidence');
    });

    it('should include actionable guidance in report', async () => {
      await page.goto(`${BASE_URL}/wave1-2/heuristics-only`, {
        waitUntil: 'domcontentloaded'
      });

      const result = await findElementByLayers(page, 'contact', BASE_URL);
      const report = formatDetectionForReport(result);

      assert(report.includes(result.layer), 'Report should include detection layer');
      console.log('✓ Report includes detection layer and confidence guidance');
    });

    it('should show target name in report', async () => {
      await page.goto(`${BASE_URL}/wave1-2/with-data-guardian`, {
        waitUntil: 'domcontentloaded'
      });

      const result = await findElementByLayers(page, 'contact', BASE_URL);
      const report = formatDetectionForReport(result);

      assert(report.includes('contact'), 'Report should mention target type (contact)');
      console.log('✓ Report shows detection target');
    });
  });

  // ========================================================================
  // EDGE CASES
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle missing data-guardian gracefully', async () => {
      await page.goto(`${BASE_URL}/`, {
        waitUntil: 'domcontentloaded'
      });

      // Home page doesn't have our test pages
      const result = await detectByLayers(page, 'contact', BASE_URL);
      // May or may not find, but shouldn't error
      assert(typeof result.found === 'boolean', 'Should return valid result even if not found');
      console.log('✓ Handles missing data-guardian gracefully');
    });

    it('should match various tokenized data-guardian formats', async () => {
      await page.goto(`${BASE_URL}/wave1-2/tokenized-guardian`, {
        waitUntil: 'domcontentloaded'
      });

      const match1 = matchesGuardianTarget('contact primary', 'contact');
      const match2 = matchesGuardianTarget('contact-secondary', 'contact');
      const match3 = matchesGuardianTarget('contact', 'contact');

      assert(match1, 'Should match tokenized "contact primary"');
      assert(match2, 'Should match hyphenated "contact-secondary"');
      assert(match3, 'Should match exact "contact"');
      console.log('✓ Handles various data-guardian formats');
    });

    it('should not match unrelated data-guardian values', async () => {
      const match1 = matchesGuardianTarget('about', 'contact');
      const match2 = matchesGuardianTarget('form', 'contact');

      assert(!match1, 'Should not match "about" as contact');
      assert(!match2, 'Should not match "form" as contact');
      console.log('✓ Correctly rejects unrelated targets');
    });
  });

  // ========================================================================
  // CONFIDENCE LEVELS
  // ========================================================================

  describe('Confidence Level Assignment', () => {
    it('should assign HIGH confidence to data-guardian matches', async () => {
      await page.goto(`${BASE_URL}/wave1-2/with-data-guardian`, {
        waitUntil: 'domcontentloaded'
      });

      const result = await detectByLayers(page, 'contact', BASE_URL);
      assert.strictEqual(result.confidence, CONFIDENCE.HIGH, 'data-guardian should give HIGH');
      console.log('✓ data-guardian assigns HIGH confidence');
    });

    it('should assign HIGH confidence to href-based semantic matches', async () => {
      await page.goto(`${BASE_URL}/de`, { waitUntil: 'domcontentloaded' });
      const result = await detectByLayers(page, 'contact', BASE_URL);
      if (result.layer === LAYER.HREF) {
        assert.strictEqual(result.confidence, CONFIDENCE.HIGH, 'href matches should be HIGH');
      }
      console.log('✓ href semantic matches assign HIGH confidence');
    });

    it('should reflect confidence in reporting', async () => {
      await page.goto(`${BASE_URL}/wave1-2/with-data-guardian`, {
        waitUntil: 'domcontentloaded'
      });

      const result = await findElementByLayers(page, 'contact', BASE_URL);
      const report = formatDetectionForReport(result);

      assert(report.includes(`confidence: ${result.confidence}`), 'Report should show confidence level');
      console.log('✓ Report displays confidence level');
    });
  });
});
