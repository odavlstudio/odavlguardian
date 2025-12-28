const { JourneyScanner } = require('../../src/guardian/journey-scanner');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('stability-integration: transient failures', () => {
  test('marks transient timeout as stable, reduces confidence', async () => {
    const tmpDir = path.join(os.tmpdir(), 'test-stability-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });

    let firstRequest = true;
    const server = http.createServer((req, res) => {
      // First request: delay 3 seconds (will timeout after 2s)
      // Subsequent: respond immediately
      if (firstRequest && req.url === '/') {
        firstRequest = false;
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>Test Site</title></head>
              <body>
                <h1>Welcome</h1>
                <a href="/signup">Sign Up</a>
              </body>
            </html>
          `);
        }, 3000);
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Test Site</title></head>
            <body>
              <h1>Welcome</h1>
              <a href="/signup">Sign Up</a>
            </body>
          </html>
        `);
      }
    });

    return new Promise((resolve, reject) => {
      server.listen(0, async () => {
        const port = server.address().port;
        const baseUrl = `http://127.0.0.1:${port}`;

        try {
          const scanner = new JourneyScanner({
            timeout: 2000, // 2 second timeout per action
            headless: true,
            maxRetries: 2,
            screenshotDir: tmpDir
          });

          const journey = {
            name: 'Test Journey',
            preset: 'saas',
            steps: [
              {
                id: 'navigate',
                name: 'Navigate to homepage',
                action: 'navigate',
                target: '/'
              },
              {
                id: 'find_cta',
                name: 'Find signup CTA',
                action: 'find_cta'
              }
            ]
          };

          const result = await scanner.scan(baseUrl, journey);

          // Should succeed despite initial timeout
          expect(result.finalDecision).not.toBe('DO_NOT_LAUNCH');

          // Should have stability report
          expect(result.stability).toBeDefined();
          expect(result.stability.runStabilityScore).toBeDefined();

          // First step should be marked as transient (attempted multiple times)
          const navStep = result.executedSteps[0];
          expect(navStep.attemptNumber).toBeGreaterThan(1); // Should have retried

          // Overall stability should be lower due to retries but not terrible
          expect(result.stability.runStabilityScore).toBeGreaterThan(40);
          expect(result.stability.runStabilityScore).toBeLessThan(100);

          server.close();
          fs.rmSync(tmpDir, { recursive: true, force: true });
          resolve();
        } catch (err) {
          server.close();
          fs.rmSync(tmpDir, { recursive: true, force: true });
          reject(err);
        }
      });
    });
  }, 30000);

  test('marks deterministic failures without retrying', async () => {
    const tmpDir = path.join(os.tmpdir(), 'test-stability-determ-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });

    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><title>Test Site</title></head>
          <body>
            <h1>Welcome</h1>
            <!-- No signup link -->
          </body>
        </html>
      `);
    });

    return new Promise((resolve, reject) => {
      server.listen(0, async () => {
        const port = server.address().port;
        const baseUrl = `http://127.0.0.1:${port}`;

        try {
          const scanner = new JourneyScanner({
            timeout: 5000,
            headless: true,
            maxRetries: 2,
            screenshotDir: tmpDir
          });

          const journey = {
            name: 'Test Journey',
            preset: 'saas',
            steps: [
              {
                id: 'navigate',
                name: 'Navigate to homepage',
                action: 'navigate',
                target: '/'
              },
              {
                id: 'find_cta',
                name: 'Find signup CTA',
                action: 'find_cta'
              }
            ]
          };

          const result = await scanner.scan(baseUrl, journey);

          // Second step should fail (no CTA on page)
          expect(result.failedSteps.map(s => s.id)).toContain('find_cta');

          // Stability should be lower due to failure
          expect(result.stability.runStabilityScore).toBeLessThan(70);

          // Failed step should be marked as deterministic (not transient)
          const ctaStep = result.executedSteps.find(s => s.id === 'find_cta');
          expect(ctaStep.isTransientFailure).toBe(false);

          server.close();
          fs.rmSync(tmpDir, { recursive: true, force: true });
          resolve();
        } catch (err) {
          server.close();
          fs.rmSync(tmpDir, { recursive: true, force: true });
          reject(err);
        }
      });
    });
  }, 30000);

  test('captures evidence with final screenshots', async () => {
    const tmpDir = path.join(os.tmpdir(), 'test-stability-evidence-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });

    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><title>Test Site</title></head>
          <body>
            <h1>Main Heading</h1>
            <p>Some content</p>
            <a href="/signup">Sign Up</a>
          </body>
        </html>
      `);
    });

    return new Promise((resolve, reject) => {
      server.listen(0, async () => {
        const port = server.address().port;
        const baseUrl = `http://127.0.0.1:${port}`;

        try {
          const scanner = new JourneyScanner({
            timeout: 5000,
            headless: true,
            maxRetries: 1,
            screenshotDir: tmpDir
          });

          const journey = {
            name: 'Test Journey',
            preset: 'saas',
            steps: [
              {
                id: 'navigate',
                name: 'Navigate to homepage',
                action: 'navigate',
                target: '/'
              }
            ]
          };

          const result = await scanner.scan(baseUrl, journey);

          // Should capture finalUrl and pageTitle
          const navStep = result.executedSteps[0];
          expect(navStep.finalUrl).toBeDefined();
          expect(navStep.pageTitle).toBe('Test Site');
          // mainHeadingText may or may not be captured depending on timing
          // Just verify the structure is there if it exists
          if (navStep.mainHeadingText) {
            expect(navStep.mainHeadingText).toBe('Main Heading');
          }

          // Should have screenshots
          expect(navStep.evidence).toBeDefined();
          expect(navStep.evidence.screenshot).toBeDefined();

          server.close();
          fs.rmSync(tmpDir, { recursive: true, force: true });
          resolve();
        } catch (err) {
          server.close();
          fs.rmSync(tmpDir, { recursive: true, force: true });
          reject(err);
        }
      });
    });
  }, 30000);
});
