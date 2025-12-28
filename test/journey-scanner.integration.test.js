/**
 * Integration Test: Journey Scanner with Local Server
 * Full end-to-end test using a local HTTP server
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const os = require('os');
const assert = require('assert');

/**
 * Start a simple HTTP server with a multi-page journey
 */
function startTestServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');

      // Homepage with signup CTA
      if (req.url === '/') {
        res.writeHead(200);
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>SaaS App - Homepage</title></head>
            <body>
              <h1>Welcome to Our SaaS Platform</h1>
              <p>Build amazing things with our service.</p>
              <nav>
                <a href="/pricing">Pricing</a>
                <a href="/about">About</a>
              </nav>
              <button onclick="window.location='/signup'">Sign Up</button>
              <a href="/dashboard" style="display: inline-block; padding: 10px; background: blue; color: white;">Get Started</a>
            </body>
          </html>
        `);
        return;
      }

      // Pricing page
      if (req.url === '/pricing') {
        res.writeHead(200);
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Pricing</title></head>
            <body>
              <h1>Pricing Plans</h1>
              <p>Choose the right plan for you.</p>
              <button>Start Free Trial</button>
            </body>
          </html>
        `);
        return;
      }

      // Signup page (proves journey worked)
      if (req.url === '/signup') {
        res.writeHead(200);
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Sign Up</title></head>
            <body>
              <h1>Create Your Account</h1>
              <form>
                <input type="email" placeholder="Email" />
                <button type="submit">Create Account</button>
              </form>
            </body>
          </html>
        `);
        return;
      }

      // Dashboard page
      if (req.url === '/dashboard') {
        res.writeHead(200);
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Dashboard</title></head>
            <body>
              <h1>Dashboard</h1>
              <p>You are logged in!</p>
            </body>
          </html>
        `);
        return;
      }

      // 404
      res.writeHead(404);
      res.end('Not found');
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

async function runTest() {
  console.log('🧪 Integration Test: Journey Scanner\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { server, port } = await startTestServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-journey-test-'));

  try {
    // TEST 1: Basic journey-scan command
    console.log('\n📋 Test 1: Running journey-scan command\n');
    console.log(`   Target: ${baseUrl}`);
    console.log(`   Output: ${outputDir}\n`);

    const result = spawnSync(process.execPath, [
      'bin/guardian.js',
      'journey-scan',
      baseUrl,
      '--preset', 'saas',
      '--out', outputDir,
      '--timeout', '5000'  // 5 second timeout per step for local testing
    ], {
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,  // 10MB buffer
      cwd: process.cwd()
    });

    if (result.stdout) {
      console.log(result.stdout);
    }
    if (result.stderr && result.stderr.trim()) {
      console.error('STDERR:', result.stderr);
    }

    // Handle timeout
    if (result.error) {
      console.error(`\n❌ Process error: ${result.error.message}`);
      throw result.error;
    }

    // TEST 2: Verify exit code (should be 0 for SAFE)
    console.log('\n📋 Test 2: Verify exit code\n');
    assert.ok(
      result.status === 0 || result.status === 1 || result.status === 2,
      `Exit code should be 0/1/2, got ${result.status}`
    );
    console.log(`   ✓ Exit code: ${result.status}`);

    // TEST 3: Verify output files exist
    console.log('\n📋 Test 3: Verify output files\n');

    const summaryTxt = path.join(outputDir, 'SUMMARY.txt');
    assert.ok(fs.existsSync(summaryTxt), 'SUMMARY.txt not found');
    console.log('   ✓ SUMMARY.txt exists');

    const summaryMd = path.join(outputDir, 'summary.md');
    assert.ok(fs.existsSync(summaryMd), 'summary.md not found');
    console.log('   ✓ summary.md exists');

    const reportJson = path.join(outputDir, 'report.json');
    assert.ok(fs.existsSync(reportJson), 'report.json not found');
    console.log('   ✓ report.json exists');

    const metadataJson = path.join(outputDir, 'metadata.json');
    assert.ok(fs.existsSync(metadataJson), 'metadata.json not found');
    console.log('   ✓ metadata.json exists');

    // TEST 4: Verify report structure
    console.log('\n📋 Test 4: Verify report structure\n');

    const report = JSON.parse(fs.readFileSync(reportJson, 'utf8'));
    assert.ok(report.metadata, 'metadata missing');
    assert.ok(report.target, 'target missing');
    assert.ok(report.execution, 'execution missing');
    assert.ok(report.decision, 'decision missing');
    console.log('   ✓ Report has all required sections');

    // TEST 5: Verify decision values
    console.log('\n📋 Test 5: Verify decision value\n');

    const validDecisions = ['SAFE', 'RISK', 'DO_NOT_LAUNCH'];
    assert.ok(
      validDecisions.includes(report.decision),
      `Decision should be SAFE/RISK/DO_NOT_LAUNCH, got ${report.decision}`
    );
    console.log(`   ✓ Decision is valid: ${report.decision}`);

    // TEST 6: Verify human-readable content
    console.log('\n📋 Test 6: Verify human-readable summary\n');

    const summaryContent = fs.readFileSync(summaryTxt, 'utf8');
    assert.ok(summaryContent.includes('ODAVL GUARDIAN'), 'Summary header missing');
    assert.ok(summaryContent.includes('DECISION'), 'Decision section missing');
    assert.ok(summaryContent.includes('EXECUTION SUMMARY'), 'Execution summary missing');
    console.log('   ✓ Summary contains human-readable sections');

    // TEST 7: Verify metadata
    console.log('\n📋 Test 7: Verify metadata\n');

    const metadata = JSON.parse(fs.readFileSync(metadataJson, 'utf8'));
    assert.ok(metadata.url === baseUrl, 'URL mismatch in metadata');
    assert.ok(metadata.preset === 'saas', 'Preset mismatch in metadata');
    assert.ok(metadata.decision === report.decision, 'Decision mismatch between report and metadata');
    console.log('   ✓ Metadata is correct and matches report');

    // Print report excerpt
    console.log('\n📋 Report Preview:\n');
    console.log(summaryContent.split('\n').slice(0, 20).join('\n'));
    console.log('   ... (see full report in ' + summaryTxt + ')');

    // Success!
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL INTEGRATION TESTS PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return 0;
  } catch (err) {
    console.error('\n❌ TEST FAILED');
    console.error(err.message);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
    return 1;
  } finally {
    server.close();
    // Clean up temp directory if needed (leave for inspection by default)
    // fs.rmSync(outputDir, { recursive: true, force: true });
    console.log(`\nResults saved to: ${outputDir}`);
  }
}

// Run
(async () => {
  const exitCode = await runTest();
  process.exit(exitCode);
})();
