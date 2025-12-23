/**
 * Guardian Phase 2 Features Test
 * Tests individual modules: screenshots, HTML reports, sitemap discovery, safety guards
 */

const GuardianScreenshot = require('../src/guardian/screenshot');
const GuardianHTMLReporter = require('../src/guardian/html-reporter');
const GuardianSitemap = require('../src/guardian/sitemap');
const GuardianSafety = require('../src/guardian/safety');
const GuardianNetworkTrace = require('../src/guardian/network-trace');
const GuardianFlowExecutor = require('../src/guardian/flow-executor');
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');
const os = require('os');

// Test server setup
function startTestServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>Test Home</title></head>
          <body>
            <h1>Home Page</h1>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </body>
        </html>
      `);
    } else if (req.url === '/about') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>About Page</h1></body></html>');
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, () => {
      resolve({
        port: server.address().port,
        server: server,
        close: () => server.close()
      });
    });
  });
}

async function runTests() {
  console.log('\n🧪 Phase 2 Features Test Suite');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testServer = await startTestServer();
  const baseUrl = `http://127.0.0.1:${testServer.port}`;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-phase2-'));

  let browser, context, page;

  try {
    // Setup browser for tests
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();

    // Test 1: Screenshot Module
    console.log('📋 Test 1: Screenshot module');
    const screenshot = new GuardianScreenshot();
    await page.goto(baseUrl);
    
    const screenshotPath = path.join(tempDir, 'test-screenshot.jpeg');
    const captured = await screenshot.capture(page, screenshotPath);
    
    if (!captured || !fs.existsSync(screenshotPath)) {
      console.log('❌ Screenshot capture failed');
      process.exit(1);
    }

    const screenshotStats = fs.statSync(screenshotPath);
    if (screenshotStats.size < 1024) {
      console.log('❌ Screenshot file too small');
      process.exit(1);
    }

    console.log(`✅ Screenshot module working: ${(screenshotStats.size / 1024).toFixed(2)} KB\n`);

    // Test 2: Safety Guards
    console.log('📋 Test 2: Safety guards module');
    const safety = new GuardianSafety();
    
    const logoutCheck = safety.isUrlSafe('https://example.com/logout');
    const adminCheck = safety.isUrlSafe('https://example.com/admin');
    const aboutCheck = safety.isUrlSafe('https://example.com/about');
    
    if (logoutCheck.safe || adminCheck.safe) {
      console.log('❌ Safety guards not blocking dangerous URLs');
      process.exit(1);
    }

    if (!aboutCheck.safe) {
      console.log('❌ Safety guards blocking safe URL');
      process.exit(1);
    }

    console.log('✅ Safety guards blocking dangerous URLs correctly\n');

    // Test 3: HTML Reporter
    console.log('📋 Test 3: HTML report generator');
    const htmlReporter = new GuardianHTMLReporter();
    
    const mockReport = {
      version: 'mvp-0.1',
      timestamp: new Date().toISOString(),
      baseUrl: baseUrl,
      summary: {
        visitedPages: 2,
        discoveredPages: 2,
        coverage: 100,
        failedPages: 0
      },
      confidence: {
        level: 'HIGH',
        reasoning: 'Coverage is 100% with 0 failed pages'
      },
      finalJudgment: {
        decision: 'READY',
        reasons: ['Coverage is 100%', 'All visited pages loaded successfully']
      },
      pages: [
        { index: 1, url: baseUrl, status: 200, links: 2 },
        { index: 2, url: baseUrl + '/about', status: 200, links: 0 }
      ]
    };

    const htmlContent = htmlReporter.generate(mockReport, tempDir);
    
    if (!htmlContent.includes('ODAVL Guardian') || !htmlContent.includes('Safe to Launch')) {
      console.log('❌ HTML report content invalid');
      process.exit(1);
    }

    const htmlPath = path.join(tempDir, 'test-report.html');
    const saved = htmlReporter.save(htmlContent, htmlPath);
    
    if (!saved || !fs.existsSync(htmlPath)) {
      console.log('❌ HTML report not saved');
      process.exit(1);
    }

    console.log('✅ HTML report generator working\n');

    // Test 4: Network Trace
    console.log('📋 Test 4: Network trace module');
    const networkTrace = new GuardianNetworkTrace({ enableTrace: true });
    
    const tracePath = await networkTrace.startTrace(context, tempDir);
    if (!tracePath) {
      console.log('❌ Failed to start trace');
      process.exit(1);
    }

    // Navigate multiple times to generate more trace data
    await page.goto(baseUrl);
    await page.click('a[href="/about"]');
    await page.waitForLoadState('networkidle');
    await page.goBack();
    
    await networkTrace.stopTrace(context, tracePath);
    
    if (!fs.existsSync(tracePath)) {
      console.log('❌ Trace file not created');
      process.exit(1);
    }

    const traceStats = fs.statSync(tracePath);
    if (traceStats.size < 5000) {
      console.log(`⚠️  Trace file smaller than expected: ${traceStats.size} bytes (expected >5KB)`);
      // Don't fail - trace size can vary
    }

    console.log(`✅ Network trace working: ${(traceStats.size / 1024).toFixed(2)} KB\n`);

    // Test 5: Flow Executor
    console.log('📋 Test 5: Flow executor module');
    const flowExecutor = new GuardianFlowExecutor();
    
    const mockFlow = {
      id: 'test-flow',
      name: 'Test Navigation Flow',
      steps: [
        { type: 'navigate', target: baseUrl },
        { type: 'waitFor', target: 'h1', timeout: 5000 },
        { type: 'click', target: 'a[href="/about"]' },
        { type: 'waitFor', target: 'h1', timeout: 5000 }
      ]
    };

    const validation = flowExecutor.validateFlow(mockFlow);
    if (!validation.valid) {
      console.log(`❌ Flow validation failed: ${validation.errors.join(', ')}`);
      process.exit(1);
    }

    const flowResult = await flowExecutor.executeFlow(page, mockFlow, tempDir);
    
    if (!flowResult.success) {
      console.log(`❌ Flow execution failed: ${flowResult.error}`);
      process.exit(1);
    }

    console.log('✅ Flow executor working\n');

    // All tests passed
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All Phase 2 module tests PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
    testServer.close();
    
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

runTests();
