const http = require('http');
const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Simple test server
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html');
      
      if (req.url === '/') {
        res.writeHead(200);
        res.end(`
          <html>
            <body>
              <h1>Homepage</h1>
              <a href="/page2">Link to Page 2</a>
              <a href="/page3">Link to Page 3</a>
            </body>
          </html>
        `);
      } else if (req.url === '/page2') {
        res.writeHead(200);
        res.end('<html><body><h1>Page 2</h1></body></html>');
      } else if (req.url === '/page3') {
        res.writeHead(200);
        res.end('<html><body><h1>Page 3</h1></body></html>');
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

(async () => {
  console.log('🧪 MVP Test Suite');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Test 1: Basic crawl
    console.log('📋 Test 1: Basic crawl and report generation');
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-test-'));
    
    const result = spawnSync(process.execPath, [
      'bin/guardian.js',
      'reality',
      '--url', baseUrl,
      '--attempts', 'site_smoke',
      '--fast',
      '--max-pages', '5',
      '--max-depth', '2',
      '--artifacts', artifactsDir
    ], { 
      encoding: 'utf8', 
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    console.log(result.stdout);
    if (result.stderr) console.error('STDERR:', result.stderr);

    // Check exit code (deterministic mapping: OBSERVED=0, PARTIAL=1, INSUFFICIENT_DATA=2)
    assert.ok(
      result.status === 0 || result.status === 1 || result.status === 2,
      `Exit code should be 0, 1, or 2, got ${result.status}`
    );
    console.log(`✅ Exit code: ${result.status}`);

    // Check report was created
    const runDirs = fs.readdirSync(artifactsDir)
      .filter(d => d !== 'latest')
      .filter(d => fs.statSync(path.join(artifactsDir, d)).isDirectory())
      .sort()
      .reverse();
    
    assert.ok(runDirs.length > 0, 'No run directory created');
    const runDir = runDirs[0];
    console.log(`✅ Run directory created: ${runDir}`);

    // Check decision.json exists
    const decisionPath = path.join(artifactsDir, runDir, 'decision.json');
    assert.ok(fs.existsSync(decisionPath), 'decision.json not found');
    console.log(`✅ decision.json exists`);

    const decision = JSON.parse(fs.readFileSync(decisionPath, 'utf8'));
    const allowedVerdicts = ['READY', 'FRICTION', 'DO_NOT_LAUNCH'];
    assert.ok(decision.finalVerdict, 'finalVerdict missing');
    assert.ok(allowedVerdicts.includes(decision.finalVerdict), `Unexpected verdict: ${decision.finalVerdict}`);
    assert.ok([0, 1, 2].includes(decision.exitCode), `Exit code should be 0, 1, or 2, got ${decision.exitCode}`);
    console.log(`✅ Decision: ${decision.finalVerdict} (exit ${decision.exitCode})`);

    // Check summary and snapshot artifacts
    const summaryPath = path.join(artifactsDir, runDir, 'summary.md');
    assert.ok(fs.existsSync(summaryPath), 'summary.md not found');
    console.log('✅ summary.md exists');

    const snapshotPath = path.join(artifactsDir, runDir, 'snapshot.json');
    assert.ok(fs.existsSync(snapshotPath), 'snapshot.json not found');
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    assert.ok(snapshot.meta, 'snapshot meta missing');
    assert.strictEqual(snapshot.meta.url, baseUrl, 'Snapshot URL should match');
    console.log('✅ snapshot.json validated');

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All tests PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);

  } catch (err) {
    console.error('\n❌ TEST FAILED');
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    server.close();
  }
})();
