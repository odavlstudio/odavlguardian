const { runCIGate } = require('../../src/guardian/ci-cli');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('ci-cli integration', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), 'test-ci-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('runCIGate creates ci-result.json on first run', async () => {
    const config = {
      baseUrl: 'http://localhost:9998',
      artifactsDir: tmpDir,
      headless: true,
      timeout: 10000,
      preset: 'saas',
      presetProvided: true
    };

    // Create simple test server page
    const testHtml = `
      <!DOCTYPE html>
      <html><body>
        <h1>Test Site</h1>
        <a href="/signup">Sign Up</a>
      </body></html>
    `;
    const http = require('http');
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(testHtml);
    });

    return new Promise((resolve, reject) => {
      server.listen(9998, async () => {
        try {
          const exitCode = await runCIGate(config);
          
          // Check ci-result.json exists
          const ciResultPath = path.join(tmpDir, 'ci', 'ci-result.json');
          expect(fs.existsSync(ciResultPath)).toBe(true);
          
          const ciResult = JSON.parse(fs.readFileSync(ciResultPath, 'utf-8'));
          expect(ciResult).toHaveProperty('decision');
          expect(ciResult).toHaveProperty('severity');
          expect(ciResult).toHaveProperty('driftDetected');
          expect(ciResult).toHaveProperty('goalReached');
          expect(ciResult).toHaveProperty('timestamp');
          
          // First run should capture baseline
          const baselinePath = path.join(tmpDir, 'baseline.json');
          expect(fs.existsSync(baselinePath)).toBe(true);
          
          server.close();
          resolve();
        } catch (err) {
          server.close();
          reject(err);
        }
      });
    });
  }, 30000);

  test('runCIGate detects drift and suppresses duplicate alerts', async () => {
    const config = {
      baseUrl: 'http://localhost:9999',
      artifactsDir: tmpDir,
      headless: true,
      timeout: 10000,
      preset: 'saas',
      presetProvided: true
    };

    let responseHtml = `
      <!DOCTYPE html>
      <html><body>
        <h1>Test Site</h1>
        <a href="/signup">Sign Up</a>
      </body></html>
    `;

    const http = require('http');
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(responseHtml);
    });

    return new Promise((resolve, reject) => {
      server.listen(9999, async () => {
        try {
          // First run: establish baseline
          await runCIGate(config);
          
          // Change response to cause drift
          responseHtml = `
            <!DOCTYPE html>
            <html><body>
              <h1>Test Site</h1>
            </body></html>
          `;
          
          // Second run: detect drift, emit alert
          const exitCode2 = await runCIGate(config);
          expect(exitCode2).not.toBe(0); // Should indicate risk/warning
          
          let ciResult2 = JSON.parse(fs.readFileSync(path.join(tmpDir, 'ci', 'ci-result.json'), 'utf-8'));
          expect(ciResult2.driftDetected).toBe(true);
          expect(ciResult2.alertSuppressed).toBeUndefined(); // First alert emitted
          
          // Third run: same drift, should suppress
          const exitCode3 = await runCIGate(config);
          
          let ciResult3 = JSON.parse(fs.readFileSync(path.join(tmpDir, 'ci', 'ci-result.json'), 'utf-8'));
          expect(ciResult3.alertSuppressed).toBe(true);
          expect(ciResult3.suppressionReason).toContain('duplicate');
          
          server.close();
          resolve();
        } catch (err) {
          server.close();
          reject(err);
        }
      });
    });
  }, 45000);
});
