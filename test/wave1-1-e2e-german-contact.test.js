/**
 * Wave 1.1 End-to-End Integration Test
 * 
 * Demonstrates German contact detection with real Playwright browser.
 * Tests the full semantic detection pipeline against German fixture pages.
 */

const assert = require('assert');
const http = require('http');
const { chromium } = require('playwright');
const fixtureApp = require('./discovery-fixture-server');
const {
  findContactOnPage,
  formatDetectionForReport
} = require('../src/guardian/semantic-contact-finder');

describe('Wave 1.1 — End-to-End German Contact Detection', function() {
  this.timeout(30000);

  let server;
  let browser;
  const PORT = 9998; // Different port to avoid conflicts

  before(async () => {
    // Start fixture server
    server = await new Promise((resolve) => {
      const httpServer = http.createServer(fixtureApp);
      httpServer.listen(PORT, () => {
        resolve(httpServer);
      });
    });

    // Start browser
    browser = await chromium.launch();
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
    if (server) {
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  it('should detect German page language attribute', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`http://localhost:${PORT}/de`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      // Verify page has lang="de"
      const lang = await page.locator('html').getAttribute('lang');
      assert.strictEqual(lang, 'de', 'German page should have lang="de"');

      console.log('✓ German page detected with lang="de"');
    } finally {
      await context.close();
    }
  });

  it('should detect contact link with German text "Kontakt"', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`http://localhost:${PORT}/de`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      // Find "Kontakt" link
      const kontaktLink = await page.locator('a:has-text("Kontakt")');
      assert(await kontaktLink.isVisible(), 'Kontakt link should be visible');

      const href = await kontaktLink.getAttribute('href');
      assert(href === '/de/kontakt', 'Kontakt link should point to /de/kontakt');

      console.log('✓ German contact link detected: "Kontakt" → /de/kontakt');
    } finally {
      await context.close();
    }
  });

  it('should use semantic detection to find contact on German page', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`http://localhost:${PORT}/de`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      // Run semantic contact detection
      const result = await findContactOnPage(page, `http://localhost:${PORT}/de`);

      // Verify results
      assert.strictEqual(result.language, 'de', 'Should detect language as "de"');
      assert.strictEqual(result.languageName, 'German', 'Should identify as German');
      assert(result.found, 'Should find contact candidates');
      assert(result.candidates.length > 0, 'Should have at least one contact candidate');

      // Check the top candidate
      const topCandidate = result.candidates[0];
      assert(topCandidate.confidence === 'high' || topCandidate.confidence === 'medium',
        'Should have medium or high confidence');
      assert(topCandidate.matchedToken, 'Should have matched token');

      // Print formatted detection
      const formatted = formatDetectionForReport(result);
      console.log('\n' + formatted + '\n');

      // Verify formatted output contains expected info
      assert(formatted.includes('German'), 'Report should mention German');
      assert(formatted.includes('Contact Detection'), 'Report should mention contact detection');
    } finally {
      await context.close();
    }
  });

  it('should detect contact form on German /de/kontakt page', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`http://localhost:${PORT}/de/kontakt`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      // Run semantic detection
      const result = await findContactOnPage(page, `http://localhost:${PORT}/de/kontakt`);

      assert(result.found, 'Should find contact on dedicated contact page');
      assert.strictEqual(result.language, 'de', 'Should still detect German');

      console.log('✓ German contact page detected');
    } finally {
      await context.close();
    }
  });

  it('should distinguish German vs English contact terminology', async () => {
    const germanContext = await browser.newContext();
    const germanPage = await germanContext.newPage();
    const englishContext = await browser.newContext();
    const englishPage = await englishContext.newPage();

    try {
      // German page
      await germanPage.goto(`http://localhost:${PORT}/de`, {
        waitUntil: 'domcontentloaded'
      });
      const germanResult = await findContactOnPage(germanPage, `http://localhost:${PORT}/de`);
      assert.strictEqual(germanResult.language, 'de', 'German page language');
      assert(germanResult.candidates.some(c => c.matchedToken === 'kontakt'),
        'Should match German "kontakt" token');

      // English page (home)
      await englishPage.goto(`http://localhost:${PORT}/`, {
        waitUntil: 'domcontentloaded'
      });
      const englishResult = await findContactOnPage(englishPage, `http://localhost:${PORT}/`);
      assert(englishResult.language === 'unknown' || englishResult.language.startsWith('en'),
        'English page should be unknown or en');

      console.log('✓ Correctly distinguished German vs English language detection');
    } finally {
      await germanContext.close();
      await englishContext.close();
    }
  });

  it('should handle multilingual contact detection gracefully', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Test German page
      await page.goto(`http://localhost:${PORT}/de`, {
        waitUntil: 'domcontentloaded'
      });

      const result = await findContactOnPage(page, `http://localhost:${PORT}/de`);

      // Generate formatted report
      const report = formatDetectionForReport(result);

      // Verify report structure
      assert(report.includes('Language Detection'), 'Report includes language section');
      assert(report.includes('Contact Detection'), 'Report includes contact section');
      assert(report.includes('German'), 'Report identifies German');

      // Print full report
      console.log('\n' + '='.repeat(70));
      console.log('SEMANTIC CONTACT DETECTION REPORT');
      console.log('='.repeat(70));
      console.log(report);
      console.log('='.repeat(70) + '\n');
    } finally {
      await context.close();
    }
  });

  it('should provide actionable feedback when contact not found', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Use a page without "Kontakt"
      await page.goto(`http://localhost:${PORT}/de/uber`, {
        waitUntil: 'domcontentloaded'
      });

      const result = await findContactOnPage(page, `http://localhost:${PORT}/de/uber`);

      // Even if not found, should provide hints
      const report = formatDetectionForReport(result);
      assert(report.includes('Language Detection') || report.includes('German'),
        'Should still detect language');

      console.log('✓ Handled missing contact case gracefully');
    } finally {
      await context.close();
    }
  });
});
